-- ============================================================================
-- Migration: 020_preserve_offline_sale_snapshots.sql
-- Description: Preserve the original facts of an offline sale when it syncs.
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS offline_order_id uuid,
  ADD COLUMN IF NOT EXISTS offline_order_number text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_bakery_offline_order_id
  ON public.orders (bakery_id, offline_order_id)
  WHERE offline_order_id IS NOT NULL;

-- Online sales continue through create_order, which always uses server prices.
-- This RPC is limited to syncing a previously captured offline sale. It first
-- uses create_order for authorization and inventory handling, then replaces its
-- temporary server-price snapshots before the transaction commits.
CREATE OR REPLACE FUNCTION public.sync_offline_order(
  p_bakery_id                    uuid,
  p_idempotency_key              uuid,
  p_payment_method               text,
  p_items                        jsonb   DEFAULT '[]'::jsonb,
  p_customer_name                text    DEFAULT NULL,
  p_customer_phone               text    DEFAULT NULL,
  p_receipt_requested            boolean DEFAULT false,
  p_override_insufficient_stock  boolean DEFAULT false,
  p_offline_order_id             uuid    DEFAULT NULL,
  p_offline_order_number         text    DEFAULT NULL,
  p_sold_at                      timestamptz DEFAULT NULL,
  p_offline_items                jsonb   DEFAULT '[]'::jsonb,
  p_offline_total                numeric(12,2) DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item           jsonb;
  v_server_items   jsonb := '[]'::jsonb;
  v_response_items jsonb := '[]'::jsonb;
  v_snapshot_total numeric(12,2) := 0;
  v_quantity       integer;
  v_unit_price     numeric(12,2);
  v_line_total     numeric(12,2);
  v_item_name      text;
  v_result         jsonb;
  v_order_id       uuid;
  v_order_number   text;
BEGIN
  IF p_offline_order_id IS NULL OR p_sold_at IS NULL THEN
    RAISE EXCEPTION 'Offline order ID and sale time are required';
  END IF;

  IF p_sold_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Offline sale time cannot be in the future';
  END IF;

  IF p_offline_items IS NULL
     OR jsonb_typeof(p_offline_items) <> 'array'
     OR jsonb_array_length(p_offline_items) = 0 THEN
    RAISE EXCEPTION 'Offline sale must contain at least one item';
  END IF;

  -- Validate the immutable local receipt snapshot and rebuild the minimal
  -- product/quantity payload used by the authoritative order RPC.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_offline_items) AS value
  LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL THEN
      RAISE EXCEPTION 'Every offline item must include a menu_item_id';
    END IF;

    IF COALESCE(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Offline item quantity must be a positive integer';
    END IF;

    IF COALESCE(v_item->>'unit_price', '') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Offline item unit price must be a non-negative number';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric(12,2);
    v_line_total := v_unit_price * v_quantity;
    v_snapshot_total := v_snapshot_total + v_line_total;
    v_item_name := COALESCE(NULLIF(trim(v_item->>'product_name'), ''), 'Bakery Item');

    v_server_items := v_server_items || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'quantity', v_quantity
    ));

    v_response_items := v_response_items || jsonb_build_array(jsonb_build_object(
      'item_name', v_item_name,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'line_total', v_line_total
    ));
  END LOOP;

  IF round(v_snapshot_total, 2) <> round(p_offline_total, 2) THEN
    RAISE EXCEPTION 'Offline order total does not match its item snapshots';
  END IF;

  -- This enforces membership, subscription status, idempotency, product
  -- ownership, current stock checks, row locking, and stock deductions.
  v_result := public.create_order(
    p_bakery_id                    => p_bakery_id,
    p_idempotency_key              => p_idempotency_key,
    p_payment_method               => p_payment_method,
    p_items                        => v_server_items,
    p_customer_name                => p_customer_name,
    p_customer_phone               => p_customer_phone,
    p_receipt_requested            => p_receipt_requested,
    p_override_insufficient_stock  => p_override_insufficient_stock
  );

  IF COALESCE((v_result->>'success')::boolean, false) = false THEN
    RETURN v_result;
  END IF;

  -- Idempotent retries return the already-stored receipt unchanged.
  IF COALESCE((v_result->>'duplicate')::boolean, false) THEN
    RETURN v_result;
  END IF;

  v_order_id := (v_result->'order'->>'order_id')::uuid;
  v_order_number := v_result->'order'->>'order_number';

  UPDATE public.orders
  SET total = p_offline_total,
      created_at = p_sold_at,
      offline_order_id = p_offline_order_id,
      offline_order_number = NULLIF(trim(p_offline_order_number), ''),
      synced_at = now(),
      updated_at = now()
  WHERE id = v_order_id
    AND bakery_id = p_bakery_id;

  -- Replace temporary current-catalog snapshots with the exact receipt that
  -- the cashier issued while offline.
  DELETE FROM public.order_items WHERE order_id = v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_offline_items) AS value
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric(12,2);
    v_line_total := v_unit_price * v_quantity;
    v_item_name := COALESCE(NULLIF(trim(v_item->>'product_name'), ''), 'Bakery Item');

    INSERT INTO public.order_items (
      order_id, menu_item_id, item_name_snapshot,
      unit_price_snapshot, quantity, line_total, created_at
    ) VALUES (
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      v_item_name,
      v_unit_price,
      v_quantity,
      v_line_total,
      p_sold_at
    );
  END LOOP;

  UPDATE public.inventory_movements
  SET created_at = p_sold_at
  WHERE reference_order_id = v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'order', jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'total', p_offline_total,
      'status', 'paid',
      'payment_method', p_payment_method,
      'created_at', p_sold_at,
      'items', v_response_items,
      'stock_warnings', v_result->'order'->'stock_warnings'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_offline_order(
  uuid, uuid, text, jsonb, text, text, boolean, boolean, uuid, text, timestamptz, jsonb, numeric
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_offline_order(
  uuid, uuid, text, jsonb, text, text, boolean, boolean, uuid, text, timestamptz, jsonb, numeric
) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_offline_order(
  uuid, uuid, text, jsonb, text, text, boolean, boolean, uuid, text, timestamptz, jsonb, numeric
) TO authenticated;
