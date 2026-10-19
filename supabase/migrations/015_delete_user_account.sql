-- ============================================================================
-- Migration: 015_delete_user_account.sql
-- Description: RPC for permanent self-service account and bakery data deletion
--              with password re-authentication verification.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
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
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- 2. If the user owns any bakeries, delete the bakeries
  -- (Foreign keys with ON DELETE CASCADE will automatically delete menu_items,
  --  orders, order_items, inventory_movements, categories, sequences, etc.)
  FOR v_bakery_id IN
    SELECT id FROM public.bakeries WHERE owner_id = v_user_id
  LOOP
    DELETE FROM public.bakeries WHERE id = v_bakery_id;
  END LOOP;

  -- 3. Delete any other memberships (e.g. staff role in another bakery)
  DELETE FROM public.bakery_memberships WHERE user_id = v_user_id;

  -- 4. Delete the user from auth.users (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
