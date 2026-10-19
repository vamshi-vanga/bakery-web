-- ============================================================================
-- Migration: 014_enterprise_security_architecture.sql
-- Description: Multi-year security hardening, server-side subscription
--              enforcement on order/product RPCs, and query performance scaling.
-- ============================================================================

-- 1. Helper function: Assert that a bakery's subscription is currently active
CREATE OR REPLACE FUNCTION bakery_private.assert_subscription_active(p_bakery_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_end timestamptz;
BEGIN
  SELECT subscription_status, subscription_end
  INTO v_status, v_end
  FROM public.bakeries
  WHERE id = p_bakery_id;

  IF v_status IS DISTINCT FROM 'active' OR v_end IS NULL OR v_end <= now() THEN
    RAISE EXCEPTION 'Bakery subscription is inactive or expired. Please subscribe to continue.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- 2. Performance Scaling Indexes (Ensures instant queries even with 100,000+ orders)
CREATE INDEX IF NOT EXISTS idx_orders_bakery_created_at
  ON public.orders(bakery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_composite
  ON public.order_items(order_id, menu_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_perf
  ON public.inventory_movements(bakery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bakeries_subscription_perf
  ON public.bakeries(subscription_status, subscription_end);

-- 3. Update create_product RPC to enforce subscription check on backend
CREATE OR REPLACE FUNCTION public.create_product(
  p_bakery_id           uuid,
  p_name                text,
  p_category            text,
  p_price               numeric(12,2),
  p_description         text    DEFAULT NULL,
  p_track_inventory     boolean DEFAULT false,
  p_initial_stock       integer DEFAULT 0,
  p_low_stock_threshold integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id       uuid;
  v_product_id    uuid;
BEGIN
  -- Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

  -- Server-side subscription check
  PERFORM bakery_private.assert_subscription_active(p_bakery_id);

  -- Validate inputs
  IF length(trim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;
  IF p_price < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative';
  END IF;
  IF p_track_inventory AND p_initial_stock < 0 THEN
    RAISE EXCEPTION 'Initial stock cannot be negative';
  END IF;

  v_product_id := gen_random_uuid();

  -- Insert product
  INSERT INTO public.menu_items (
    id, bakery_id, name, category, description, price,
    is_active, track_inventory, stock_quantity, low_stock_threshold
  ) VALUES (
    v_product_id, p_bakery_id, trim(p_name),
    COALESCE(NULLIF(trim(p_category), ''), 'General'),
    p_description, p_price,
    true,
    p_track_inventory,
    CASE WHEN p_track_inventory THEN p_initial_stock ELSE 0 END,
    CASE WHEN p_track_inventory THEN p_low_stock_threshold ELSE NULL END
  );

  -- Initial stock audit log
  IF p_track_inventory AND p_initial_stock > 0 THEN
    INSERT INTO public.inventory_movements (
      bakery_id, menu_item_id, quantity_delta, movement_type,
      reference_order_id, note, created_by
    ) VALUES (
      p_bakery_id, v_product_id, p_initial_stock, 'restock',
      NULL, 'Initial stock entry upon product creation', v_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product', jsonb_build_object(
      'id', v_product_id,
      'name', trim(p_name),
      'category', COALESCE(NULLIF(trim(p_category), ''), 'General'),
      'price', p_price,
      'track_inventory', p_track_inventory,
      'stock_quantity', CASE WHEN p_track_inventory THEN p_initial_stock ELSE 0 END
    )
  );
END;
$$;

-- 4. Update create_order RPC with subscription enforcement and search_path hardening
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
  v_user_id            uuid;
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
  v_sorted_tracked_ids uuid[];
  v_bakery_tz          text;
  v_time_str           text;
BEGIN
  -- STEP 1: Authorization & Subscription Verification
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

  -- Server-side subscription check
  PERFORM bakery_private.assert_subscription_active(p_bakery_id);

  -- STEP 2: Advisory lock on bakery + idempotency_key
  PERFORM pg_advisory_xact_lock(
    abs(hashtext(p_bakery_id::text || '::' || p_idempotency_key::text))
  );

  -- STEP 3: Idempotency check
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
      FROM public.order_items oi WHERE oi.order_id = o.id
    ),
    'stock_warnings', NULL
  ) INTO v_existing_order
  FROM public.orders o
  WHERE o.bakery_id = p_bakery_id
    AND o.idempotency_key = p_idempotency_key;

  IF v_existing_order IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'order', v_existing_order
    );
  END IF;

  -- STEP 4: Payment method validation
  IF p_payment_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %. Must be cash, upi, or card', p_payment_method;
  END IF;

  -- STEP 5: Empty items guard
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- STEP 6: First pass - price lookup & quantity validation
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS value
  LOOP
    IF (v_item->>'quantity') IS NULL OR (v_item->>'quantity')::integer <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be a positive integer';
    END IF;

    SELECT id, name, price, track_inventory, stock_quantity
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND bakery_id = p_bakery_id
      AND is_active = true;

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION 'Item % not found or inactive in this bakery', v_item->>'menu_item_id';
    END IF;

    v_line_total := v_menu_item.price * (v_item->>'quantity')::integer;
    v_subtotal   := v_subtotal + v_line_total;

    v_validated_items := v_validated_items || jsonb_build_object(
      'menu_item_id',    v_menu_item.id,
      'name',            v_menu_item.name,
      'unit_price',      v_menu_item.price,
      'quantity',        (v_item->>'quantity')::integer,
      'line_total',      v_line_total,
      'track_inventory', v_menu_item.track_inventory,
      'current_stock',   v_menu_item.stock_quantity
    );
  END LOOP;

  -- STEP 7: Check stock availability
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_validated_items) AS value
  LOOP
    IF (v_item->>'track_inventory')::boolean THEN
      IF (v_item->>'current_stock')::integer < (v_item->>'quantity')::integer THEN
        v_has_insufficient := true;
        v_insufficient_items := v_insufficient_items || jsonb_build_object(
          'menu_item_id', v_item->>'menu_item_id',
          'item_name',    v_item->>'name',
          'requested',    (v_item->>'quantity')::integer,
          'available',    (v_item->>'current_stock')::integer
        );
      END IF;
    END IF;
  END LOOP;

  IF v_has_insufficient AND NOT p_override_insufficient_stock THEN
    RETURN jsonb_build_object(
      'success',               false,
      'requires_confirmation', true,
      'error',                 'Insufficient stock for one or more items',
      'insufficient_items',    v_insufficient_items
    );
  END IF;

  -- STEP 8: Lock tracked items in consistent order (prevents deadlocks)
  SELECT array_agg(DISTINCT (value->>'menu_item_id')::uuid ORDER BY (value->>'menu_item_id')::uuid)
  INTO v_sorted_tracked_ids
  FROM jsonb_array_elements(v_validated_items) AS value
  WHERE (value->>'track_inventory')::boolean = true;

  IF v_sorted_tracked_ids IS NOT NULL AND array_length(v_sorted_tracked_ids, 1) > 0 THEN
    PERFORM id
    FROM public.menu_items
    WHERE id = ANY(v_sorted_tracked_ids)
    ORDER BY id
    FOR UPDATE;
  END IF;

  -- STEP 9: Generate next order number
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
    SET next_seq   = public.bakery_order_sequences.next_seq + 1,
        updated_at = now()
  RETURNING next_seq - 1 INTO v_next_seq;

  v_order_number := 'ORD-' || v_time_str || '-' || LPAD(v_next_seq::text, 2, '0');

  -- STEP 10: Insert Order
  v_order_id := gen_random_uuid();

  INSERT INTO public.orders (
    id, bakery_id, order_number, idempotency_key, total,
    payment_method, status, customer_name, customer_phone,
    receipt_requested, whatsapp_status, created_by, created_at, updated_at
  ) VALUES (
    v_order_id,
    p_bakery_id,
    v_order_number,
    p_idempotency_key,
    v_subtotal,
    p_payment_method,
    'paid',
    NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_customer_phone), ''),
    p_receipt_requested,
    CASE WHEN p_receipt_requested AND NULLIF(trim(p_customer_phone), '') IS NOT NULL
         THEN 'pending' ELSE 'not_requested' END,
    v_user_id,
    now(),
    now()
  );

  -- STEP 11: Insert Order Items & decrement inventory
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
          updated_at     = now()
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

  -- STEP 12: Return success
  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'order_id',       v_order_id,
      'order_number',   v_order_number,
      'total',          v_subtotal,
      'status',         'paid',
      'payment_method', p_payment_method,
      'created_at',     now(),
      'items',          v_validated_items,
      'stock_warnings', CASE WHEN v_has_insufficient THEN v_insufficient_items ELSE NULL END
    )
  );
END;
$$;
