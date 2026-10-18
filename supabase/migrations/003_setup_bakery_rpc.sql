-- ============================================================================
-- Migration: 003_setup_bakery_rpc.sql
-- Description: RPC for first-time bakery onboarding (creates bakery, membership, sequence atomically)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.setup_bakery(
  p_bakery_name text,
  p_phone       text DEFAULT NULL,
  p_address     text DEFAULT NULL,
  p_currency    text DEFAULT 'INR',
  p_timezone    text DEFAULT 'Asia/Kolkata'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_bakery_id uuid;
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

  v_bakery_id := gen_random_uuid();

  -- 3. Create bakery record
  INSERT INTO public.bakeries (
    id, name, owner_id, phone, address, currency, timezone
  ) VALUES (
    v_bakery_id,
    trim(p_bakery_name),
    v_user_id,
    p_phone,
    p_address,
    COALESCE(NULLIF(trim(p_currency), ''), 'INR'),
    COALESCE(NULLIF(trim(p_timezone), ''), 'Asia/Kolkata')
  );

  -- 4. Create owner membership
  INSERT INTO public.bakery_memberships (
    id, bakery_id, user_id, role
  ) VALUES (
    gen_random_uuid(),
    v_bakery_id,
    v_user_id,
    'owner'
  );

  -- 5. Initialize order sequence counter
  INSERT INTO public.bakery_order_sequences (
    bakery_id, current_sequence, prefix
  ) VALUES (
    v_bakery_id,
    0,
    'ORD'
  );

  -- 6. Return response
  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', v_bakery_id,
    'name', trim(p_bakery_name),
    'currency', p_currency,
    'timezone', p_timezone,
    'role', 'owner'
  );
END;
$$;

-- Restrict execution
REVOKE ALL ON FUNCTION public.setup_bakery(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.setup_bakery(text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.setup_bakery(text, text, text, text, text) TO authenticated;
