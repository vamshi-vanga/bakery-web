-- ============================================================================
-- Migration: 019_fix_order_inventory_concurrency.sql
-- Description: Aggregate, lock, and re-check inventory before creating an order
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order(
  p_bakery_id                    uuid,
  p_idempotency_key              uuid,
  p_payment_method               text,
  p_items                        jsonb,
  p_customer_name                text    DEFAULT NULL,
  p_customer_phone               text    DEFAULT NULL,
  p_receipt_requested            boolean DEFAULT false,
  p_override_insufficient_stock  boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id            uuid := auth.uid();
  v_existing_order     jsonb;
  v_order_id           uuid;
  v_order_number       text;
  v_next_seq           integer;
  v_subtotal           numeric(12,2) := 0;
  v_item               jsonb;
  v_menu_item          record;
  v_line_total         numeric(12,2);
  v_insufficient_items jsonb := '[]'::jsonb;
  v_has_insufficient   boolean := false;
  v_validated_items    jsonb := '[]'::jsonb;
  v_requested_items    jsonb;
  v_requested_count    integer;
  v_validated_count    integer := 0;
  v_bakery_tz          text;
  v_time_str           text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

  PERFORM bakery_private.assert_subscription_active(p_bakery_id);

  -- Serialize retries with the same idempotency key.
  PERFORM pg_advisory_xact_lock(
    abs(hashtext(p_bakery_id::text || '::' || p_idempotency_key::text))
  );

  SELECT jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'total', o.total,
    'status', o.status,
    'payment_method', o.payment_method,
    'created_at', o.created_at,
    'items', (
      SELECT jsonb_agg(jsonb_build_object(
        'item_name', oi.item_name_snapshot,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price_snapshot,
        'line_total', oi.line_total
      ))
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    ),
    'stock_warnings', NULL
  ) INTO v_existing_order
  FROM public.orders o
  WHERE o.bakery_id = p_bakery_id
    AND o.idempotency_key = p_idempotency_key;

  IF v_existing_order IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'order', v_existing_order);
  END IF;

  IF p_payment_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %. Must be cash, upi, or card', p_payment_method;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Validate before casting, then combine duplicate product lines. A cart with
  -- the same product twice is one inventory request, not two independent checks.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS value
  LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL THEN
      RAISE EXCEPTION 'Every order item must include a menu_item_id';
    END IF;

    IF COALESCE(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Item quantity must be a positive integer';
    END IF;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('menu_item_id', requested.menu_item_id, 'quantity', requested.quantity)
      ORDER BY requested.menu_item_id
    ),
    '[]'::jsonb
  )
  INTO v_requested_items
  FROM (
    SELECT
      (value->>'menu_item_id')::uuid AS menu_item_id,
      SUM((value->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) AS value
    GROUP BY (value->>'menu_item_id')::uuid
  ) AS requested;

  v_requested_count := jsonb_array_length(v_requested_items);

  -- Lock every requested product in deterministic order. PostgreSQL re-reads
  -- each locked row, so stock is evaluated after another sale has committed.
  FOR v_menu_item IN
    SELECT
      mi.id,
      mi.name,
      mi.price,
      mi.track_inventory,
      mi.stock_quantity,
      requested.quantity
    FROM jsonb_to_recordset(v_requested_items) AS requested(menu_item_id uuid, quantity integer)
    JOIN public.menu_items mi
      ON mi.id = requested.menu_item_id
     AND mi.bakery_id = p_bakery_id
     AND mi.is_active = true
    ORDER BY mi.id
    FOR UPDATE OF mi
  LOOP
    v_validated_count := v_validated_count + 1;
    v_line_total := v_menu_item.price * v_menu_item.quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_validated_items := v_validated_items || jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'unit_price', v_menu_item.price,
      'quantity', v_menu_item.quantity,
      'line_total', v_line_total,
      'track_inventory', v_menu_item.track_inventory,
      'current_stock', v_menu_item.stock_quantity
    );

    IF v_menu_item.track_inventory AND v_menu_item.stock_quantity < v_menu_item.quantity THEN
      v_has_insufficient := true;
      v_insufficient_items := v_insufficient_items || jsonb_build_object(
        'menu_item_id', v_menu_item.id,
        'item_name', v_menu_item.name,
        'requested_quantity', v_menu_item.quantity,
        'available_stock', v_menu_item.stock_quantity
      );
    END IF;
  END LOOP;

  IF v_validated_count <> v_requested_count THEN
    RAISE EXCEPTION 'One or more order items were not found or are inactive in this bakery';
  END IF;

  IF v_has_insufficient AND NOT p_override_insufficient_stock THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicate', false,
      'requires_confirmation', true,
      'reason', 'INSUFFICIENT_STOCK',
      'insufficient_items', v_insufficient_items
    );
  END IF;

  SELECT timezone INTO v_bakery_tz
  FROM public.bakeries
  WHERE id = p_bakery_id;

  v_bakery_tz := COALESCE(NULLIF(trim(v_bakery_tz), ''), 'Asia/Kolkata');

  BEGIN
    v_time_str := to_char(now() AT TIME ZONE v_bakery_tz, 'HH24MI');
  EXCEPTION WHEN OTHERS THEN
    v_time_str := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24MI');
  END;

  INSERT INTO public.bakery_order_sequences (bakery_id, next_seq, updated_at)
  VALUES (p_bakery_id, 2, now())
  ON CONFLICT (bakery_id) DO UPDATE
    SET next_seq = public.bakery_order_sequences.next_seq + 1,
        updated_at = now()
  RETURNING next_seq - 1 INTO v_next_seq;

  v_order_number := 'ORD-' || v_time_str || '-' || LPAD(v_next_seq::text, 2, '0');
  v_order_id := gen_random_uuid();

  INSERT INTO public.orders (
    id, bakery_id, order_number, idempotency_key, total,
    payment_method, status, customer_name, customer_phone,
    receipt_requested, whatsapp_status, created_by, created_at, updated_at
  ) VALUES (
    v_order_id, p_bakery_id, v_order_number, p_idempotency_key, v_subtotal,
    p_payment_method, 'paid', NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_customer_phone), ''), p_receipt_requested,
    CASE WHEN p_receipt_requested AND NULLIF(trim(p_customer_phone), '') IS NOT NULL
         THEN 'pending' ELSE 'not_requested' END,
    v_user_id, now(), now()
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_validated_items) AS value
  LOOP
    INSERT INTO public.order_items (
      order_id, menu_item_id, item_name_snapshot,
      unit_price_snapshot, quantity, line_total, created_at
    ) VALUES (
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      v_item->>'name',
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::integer,
      (v_item->>'line_total')::numeric,
      now()
    );

    IF (v_item->>'track_inventory')::boolean THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
          updated_at = now()
      WHERE id = (v_item->>'menu_item_id')::uuid;

      INSERT INTO public.inventory_movements (
        bakery_id, menu_item_id, quantity_delta, movement_type,
        reference_order_id, note, created_by, created_at
      ) VALUES (
        p_bakery_id,
        (v_item->>'menu_item_id')::uuid,
        -(v_item->>'quantity')::integer,
        'sale',
        v_order_id,
        'Deducted via POS order ' || v_order_number,
        v_user_id,
        now()
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'order', jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'total', v_subtotal,
      'status', 'paid',
      'payment_method', p_payment_method,
      'created_at', now(),
      'items', v_validated_items,
      'stock_warnings', CASE WHEN v_has_insufficient THEN v_insufficient_items ELSE NULL END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, uuid, text, jsonb, text, text, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order(uuid, uuid, text, jsonb, text, text, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, jsonb, text, text, boolean, boolean) TO authenticated;
