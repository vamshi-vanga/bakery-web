-- ============================================================================
-- Migration: 004_create_product_rpc.sql
-- Description: RPCs for safe product creation and audited stock adjustments
-- ============================================================================

-- 1. Create Product RPC
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

  -- Record initial stock as an auditable inventory movement
  IF p_track_inventory AND p_initial_stock > 0 THEN
    INSERT INTO public.inventory_movements (
      id, bakery_id, menu_item_id, quantity_delta,
      movement_type, note, created_by
    ) VALUES (
      gen_random_uuid(), p_bakery_id, v_product_id,
      p_initial_stock,
      'restock',
      'Initial stock on product creation',
      v_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_product(uuid, text, text, numeric, text, boolean, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_product(uuid, text, text, numeric, text, boolean, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_product(uuid, text, text, numeric, text, boolean, integer, integer) TO authenticated;

-- 2. Adjust Stock RPC (Audit log for manual restock / waste / adjustments)
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_bakery_id       uuid,
  p_menu_item_id    uuid,
  p_quantity_delta  integer,
  p_movement_type   text,
  p_note            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id      uuid;
  v_current_stock integer;
  v_new_stock    integer;
  v_tracked      boolean;
BEGIN
  -- Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_quantity_delta = 0 THEN
    RAISE EXCEPTION 'Quantity delta cannot be zero';
  END IF;

  IF p_movement_type NOT IN ('restock', 'waste', 'correction') THEN
    RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
  END IF;

  -- Lock product row
  SELECT stock_quantity, track_inventory
  INTO v_current_stock, v_tracked
  FROM public.menu_items
  WHERE id = p_menu_item_id
    AND bakery_id = p_bakery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF NOT v_tracked THEN
    RAISE EXCEPTION 'Inventory is not tracked for this product';
  END IF;

  v_new_stock := v_current_stock + p_quantity_delta;
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock adjustment would result in negative stock (% -> %)', v_current_stock, v_new_stock;
  END IF;

  -- Update stock
  UPDATE public.menu_items
  SET stock_quantity = v_new_stock,
      updated_at = now()
  WHERE id = p_menu_item_id
    AND bakery_id = p_bakery_id;

  -- Insert movement record
  INSERT INTO public.inventory_movements (
    id, bakery_id, menu_item_id, quantity_delta,
    movement_type, note, created_by
  ) VALUES (
    gen_random_uuid(), p_bakery_id, p_menu_item_id,
    p_quantity_delta,
    p_movement_type,
    p_note,
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'menu_item_id', p_menu_item_id,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock
  );
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_stock(uuid, uuid, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, uuid, integer, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, integer, text, text) TO authenticated;
