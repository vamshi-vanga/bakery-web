-- ============================================================================
-- Migration: 005_create_order_rpc.sql
-- Description: Transactional POS order creation with advisory locks, deterministic row locking,
--              structured warnings, and void order reversal logic
-- ============================================================================

-- 1. Create Order RPC
CREATE OR REPLACE FUNCTION public.create_order(
  p_bakery_id                    uuid,
  p_idempotency_key              uuid,
  p_payment_method               text,
  p_items                        jsonb,    -- [{menu_item_id, quantity}]
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
BEGIN
  -- STEP 1: Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

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
    )
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

  -- STEP 4: Validate payment method
  IF p_payment_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- STEP 5: Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- STEP 6: First pass — validate items, authoritative price lookup, stock evaluation
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS value
  LOOP
    IF (v_item->>'quantity')::integer IS NULL OR (v_item->>'quantity')::integer <= 0 THEN
      RAISE EXCEPTION 'Quantity must be a positive integer';
    END IF;

    SELECT id, name, price, is_active, track_inventory, stock_quantity
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND bakery_id = p_bakery_id
      AND archived_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found or archived', v_item->>'menu_item_id';
    END IF;

    IF NOT v_menu_item.is_active THEN
      RAISE EXCEPTION 'Product "%" is not active', v_menu_item.name;
    END IF;

    v_line_total := round(v_menu_item.price * (v_item->>'quantity')::integer, 2);
    v_subtotal := v_subtotal + v_line_total;

    IF v_menu_item.track_inventory AND v_menu_item.stock_quantity < (v_item->>'quantity')::integer THEN
      v_has_insufficient := true;
      v_insufficient_items := v_insufficient_items || jsonb_build_object(
        'menu_item_id', v_menu_item.id,
        'item_name', v_menu_item.name,
        'requested_quantity', (v_item->>'quantity')::integer,
        'available_stock', v_menu_item.stock_quantity
      );
    END IF;

    v_validated_items := v_validated_items || jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'unit_price', v_menu_item.price,
      'quantity', (v_item->>'quantity')::integer,
      'line_total', v_line_total,
      'track_inventory', v_menu_item.track_inventory
    );
  END LOOP;

  -- STEP 7: Second pass — lock tracked items in deterministic order
  SELECT array_agg(DISTINCT (item->>'menu_item_id')::uuid ORDER BY (item->>'menu_item_id')::uuid)
  INTO v_sorted_tracked_ids
  FROM jsonb_array_elements(v_validated_items) AS item
  WHERE (item->>'track_inventory')::boolean = true;

  IF v_sorted_tracked_ids IS NOT NULL AND array_length(v_sorted_tracked_ids, 1) > 0 THEN
    PERFORM 1
    FROM public.menu_items
    WHERE id = ANY(v_sorted_tracked_ids)
      AND bakery_id = p_bakery_id
    ORDER BY id ASC
    FOR UPDATE;
  END IF;

  -- STEP 8: Check insufficient stock override
  IF v_has_insufficient AND NOT p_override_insufficient_stock THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicate', false,
      'requires_confirmation', true,
      'reason', 'INSUFFICIENT_STOCK',
      'insufficient_items', v_insufficient_items
    );
  END IF;

  -- STEP 9: Atomic order number generation
  UPDATE public.bakery_order_sequences
  SET current_sequence = current_sequence + 1,
      updated_at = now()
  WHERE bakery_id = p_bakery_id
  RETURNING current_sequence, prefix
  INTO v_next_seq, v_order_number;

  IF NOT FOUND THEN
    INSERT INTO public.bakery_order_sequences (bakery_id, current_sequence, prefix)
    VALUES (p_bakery_id, 1, 'ORD')
    RETURNING current_sequence, prefix
    INTO v_next_seq, v_order_number;
  END IF;

  v_order_number := COALESCE(v_order_number, 'ORD') || '-' || lpad(v_next_seq::text, 4, '0');
  v_order_id := gen_random_uuid();

  -- STEP 11: INSERT parent orders row FIRST
  INSERT INTO public.orders (
    id, bakery_id, order_number, idempotency_key,
    total, payment_method, status,
    customer_name, customer_phone, receipt_requested,
    whatsapp_status, created_by
  ) VALUES (
    v_order_id, p_bakery_id, v_order_number, p_idempotency_key,
    v_subtotal, p_payment_method, 'paid',
    trim(p_customer_name), trim(p_customer_phone), p_receipt_requested,
    CASE WHEN p_receipt_requested AND p_customer_phone IS NOT NULL THEN 'pending' ELSE 'not_requested' END,
    v_user_id
  );

  -- STEP 12: INSERT order_items child rows
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_validated_items) AS value
  LOOP
    INSERT INTO public.order_items (
      id, order_id, menu_item_id, item_name_snapshot,
      unit_price_snapshot, quantity, line_total
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      v_item->>'name',
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::integer,
      (v_item->>'line_total')::numeric
    );
  END LOOP;

  -- STEP 13: Deduct inventory & record movement logs
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_validated_items) AS value
  LOOP
    IF (v_item->>'track_inventory')::boolean = true THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
          updated_at = now()
      WHERE id = (v_item->>'menu_item_id')::uuid
        AND bakery_id = p_bakery_id;

      INSERT INTO public.inventory_movements (
        id, bakery_id, menu_item_id, quantity_delta,
        movement_type, reference_order_id, note, created_by
      ) VALUES (
        gen_random_uuid(),
        p_bakery_id,
        (v_item->>'menu_item_id')::uuid,
        -((v_item->>'quantity')::integer),
        'sale',
        v_order_id,
        CASE
          WHEN v_has_insufficient
          THEN 'Insufficient stock override confirmed by owner'
          ELSE NULL
        END,
        v_user_id
      );
    END IF;
  END LOOP;

  -- STEP 14: Return committed order details
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
      'items', (
        SELECT jsonb_agg(jsonb_build_object(
          'item_name', oi.item_name_snapshot,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price_snapshot,
          'line_total', oi.line_total
        ))
        FROM public.order_items oi WHERE oi.order_id = v_order_id
      ),
      'stock_warnings', CASE
        WHEN v_has_insufficient THEN v_insufficient_items
        ELSE NULL
      END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;

-- 2. Void Order RPC
CREATE OR REPLACE FUNCTION public.void_order(
  p_bakery_id      uuid,
  p_order_id       uuid,
  p_reason         text,
  p_restore_stock  boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id     uuid;
  v_user_role   text;
  v_order       record;
  v_movement    record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only owners or authorized roles can void an order
  SELECT role INTO v_user_role
  FROM public.bakery_memberships
  WHERE bakery_id = p_bakery_id
    AND user_id = v_user_id;

  IF v_user_role IS NULL OR v_user_role != 'owner' THEN
    RAISE EXCEPTION 'Unauthorized: only bakery owners can void orders';
  END IF;

  -- Lock order row
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND bakery_id = p_bakery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'voided' THEN
    RAISE EXCEPTION 'Order is already voided';
  END IF;

  -- Mark order as voided
  UPDATE public.orders
  SET status = 'voided',
      voided_by = v_user_id,
      voided_at = now(),
      void_reason = trim(p_reason),
      updated_at = now()
  WHERE id = p_order_id;

  -- If restoring stock, reverse recorded 'sale' inventory movements
  IF p_restore_stock THEN
    -- Check if void_restoration movements already exist (guard against duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_movements
      WHERE reference_order_id = p_order_id
        AND movement_type = 'void_restoration'
    ) THEN
      FOR v_movement IN
        SELECT menu_item_id, abs(quantity_delta) AS qty_to_restore
        FROM public.inventory_movements
        WHERE reference_order_id = p_order_id
          AND movement_type = 'sale'
      LOOP
        UPDATE public.menu_items
        SET stock_quantity = stock_quantity + v_movement.qty_to_restore,
            updated_at = now()
        WHERE id = v_movement.menu_item_id
          AND bakery_id = p_bakery_id;

        INSERT INTO public.inventory_movements (
          id, bakery_id, menu_item_id, quantity_delta,
          movement_type, reference_order_id, note, created_by
        ) VALUES (
          gen_random_uuid(),
          p_bakery_id,
          v_movement.menu_item_id,
          v_movement.qty_to_restore,
          'void_restoration',
          p_order_id,
          'Stock restored from voided order ' || v_order.order_number,
          v_user_id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'status', 'voided',
    'stock_restored', p_restore_stock
  );
END;
$$;

REVOKE ALL ON FUNCTION public.void_order FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_order FROM anon;
GRANT EXECUTE ON FUNCTION public.void_order TO authenticated;
