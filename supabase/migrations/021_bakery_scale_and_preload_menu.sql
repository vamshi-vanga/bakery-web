-- ============================================================================
-- Migration: 021_bakery_scale_and_preload_menu.sql
-- Description: Bakery scale configuration, Telangana menu pre-loading RPC,
--              and secure bakery profile update RPC
-- ============================================================================

-- 1. Add scale column to bakeries table with validation
ALTER TABLE public.bakeries
  ADD COLUMN IF NOT EXISTS scale text DEFAULT 'medium'
  CHECK (scale IN ('small', 'medium', 'large'));

COMMENT ON COLUMN public.bakeries.scale IS 
  'Scale of bakery operation: small (counter/hot snacks), medium (full bakery/cafe), or large (expansive live-counter cafe)';

-- 2. Ensure authenticated users have column-level update permission on scale
GRANT UPDATE (name, scale, phone, address, currency, timezone, updated_at) 
  ON public.bakeries TO authenticated;

-- 3. Update setup_bakery RPC to support p_scale
CREATE OR REPLACE FUNCTION public.setup_bakery(
  p_bakery_name text,
  p_phone       text DEFAULT NULL,
  p_address     text DEFAULT NULL,
  p_currency    text DEFAULT 'INR',
  p_timezone    text DEFAULT 'Asia/Kolkata',
  p_scale       text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_bakery_id uuid;
  v_scale     text;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate bakery name
  IF length(trim(COALESCE(p_bakery_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Bakery name is required';
  END IF;

  -- 3. Validate scale
  v_scale := LOWER(trim(COALESCE(p_scale, 'medium')));
  IF v_scale NOT IN ('small', 'medium', 'large') THEN
    v_scale := 'medium';
  END IF;

  v_bakery_id := gen_random_uuid();

  -- 4. Create bakery record
  INSERT INTO public.bakeries (
    id, name, owner_id, phone, address, currency, timezone, scale
  ) VALUES (
    v_bakery_id,
    trim(p_bakery_name),
    v_user_id,
    p_phone,
    p_address,
    COALESCE(NULLIF(trim(p_currency), ''), 'INR'),
    COALESCE(NULLIF(trim(p_timezone), ''), 'Asia/Kolkata'),
    v_scale
  );

  -- 5. Create owner membership
  INSERT INTO public.bakery_memberships (
    id, bakery_id, user_id, role
  ) VALUES (
    gen_random_uuid(),
    v_bakery_id,
    v_user_id,
    'owner'
  );

  -- 6. Initialize order sequence counter
  INSERT INTO public.bakery_order_sequences (
    bakery_id, current_sequence, prefix
  ) VALUES (
    v_bakery_id,
    0,
    'ORD'
  );

  -- 7. Seed initial core categories
  INSERT INTO public.categories (bakery_id, name, sort_order)
  VALUES 
    (v_bakery_id, 'Puffs & Savouries', 1),
    (v_bakery_id, 'Breads & Buns', 2),
    (v_bakery_id, 'Biscuits & Cookies', 3),
    (v_bakery_id, 'Cakes & Pastries', 4),
    (v_bakery_id, 'Burgers & Sandwiches', 5),
    (v_bakery_id, 'Snacks & Starters', 6),
    (v_bakery_id, 'Pizzas & Pastas', 7),
    (v_bakery_id, 'Beverages & Shakes', 8),
    (v_bakery_id, 'Traditional Sweets', 9)
  ON CONFLICT (bakery_id, name) DO NOTHING;

  -- 8. Return response
  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', v_bakery_id,
    'name', trim(p_bakery_name),
    'currency', p_currency,
    'timezone', p_timezone,
    'scale', v_scale,
    'role', 'owner'
  );
END;
$$;

-- 4. Create preload_bakery_menu RPC
-- Allows seeding pre-curated regional menu items safely within an atomic transaction
CREATE OR REPLACE FUNCTION public.preload_bakery_menu(
  p_bakery_id uuid,
  p_items     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id        uuid;
  v_item           jsonb;
  v_name           text;
  v_category       text;
  v_price          numeric(12,2);
  v_desc           text;
  v_inserted_count integer := 0;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Authorization check
  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', true, 'count', 0);
  END IF;

  -- 3. Iterate over items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name     := trim(COALESCE(v_item->>'name', ''));
    v_category := trim(COALESCE(v_item->>'category', 'General'));
    v_price    := COALESCE((v_item->>'price')::numeric, 0);
    v_desc     := NULLIF(trim(COALESCE(v_item->>'description', '')), '');

    IF length(v_name) > 0 AND v_price >= 0 THEN
      -- Ensure category exists
      INSERT INTO public.categories (bakery_id, name, sort_order)
      VALUES (p_bakery_id, v_category, 10)
      ON CONFLICT (bakery_id, name) DO NOTHING;

      -- Insert menu item if not already exists with same name in same category
      IF NOT EXISTS (
        SELECT 1 FROM public.menu_items
        WHERE bakery_id = p_bakery_id AND LOWER(name) = LOWER(v_name)
      ) THEN
        INSERT INTO public.menu_items (
          id,
          bakery_id,
          name,
          category,
          price,
          description,
          is_active,
          track_inventory,
          stock_quantity
        ) VALUES (
          gen_random_uuid(),
          p_bakery_id,
          v_name,
          v_category,
          v_price,
          v_desc,
          true,
          false,
          0
        );

        v_inserted_count := v_inserted_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_inserted_count
  );
END;
$$;

-- 5. Create update_bakery_profile RPC
CREATE OR REPLACE FUNCTION public.update_bakery_profile(
  p_bakery_id uuid,
  p_name      text,
  p_scale     text,
  p_phone     text DEFAULT NULL,
  p_address   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_role      text;
  v_scale     text;
BEGIN
  -- 1. Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify owner / manager access
  SELECT role INTO v_role
  FROM public.bakery_memberships
  WHERE bakery_id = p_bakery_id AND user_id = v_user_id;

  IF v_role IS NULL OR v_role != 'owner' THEN
    RAISE EXCEPTION 'Unauthorized: only bakery owners can edit bakery profile';
  END IF;

  -- 3. Validate inputs
  IF length(trim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Bakery name cannot be blank';
  END IF;

  v_scale := LOWER(trim(COALESCE(p_scale, 'medium')));
  IF v_scale NOT IN ('small', 'medium', 'large') THEN
    v_scale := 'medium';
  END IF;

  -- 4. Update bakery record
  UPDATE public.bakeries
  SET
    name = trim(p_name),
    scale = v_scale,
    phone = NULLIF(trim(COALESCE(p_phone, '')), ''),
    address = NULLIF(trim(COALESCE(p_address, '')), ''),
    updated_at = now()
  WHERE id = p_bakery_id;

  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', p_bakery_id,
    'name', trim(p_name),
    'scale', v_scale
  );
END;
$$;

-- 6. Permissions and Execution Grants
REVOKE ALL ON FUNCTION public.setup_bakery(text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.setup_bakery(text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.setup_bakery(text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.preload_bakery_menu(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preload_bakery_menu(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.preload_bakery_menu(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.update_bakery_profile(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_bakery_profile(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_bakery_profile(uuid, text, text, text, text) TO authenticated;
