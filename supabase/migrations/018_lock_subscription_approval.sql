-- ============================================================================
-- Migration: 018_lock_subscription_approval.sql
-- Description: Restrict subscription activation to the controlled request flow
-- ============================================================================

-- A signed-in bakery owner may edit profile fields, but must never directly
-- activate a subscription, set an expiry date, or alter a selected plan.
REVOKE UPDATE (
  subscription_plan,
  subscription_status,
  subscription_start,
  subscription_end
) ON public.bakeries FROM authenticated;

-- The manual approval is performed in the Supabase Dashboard. Do not expose an
-- API function that can activate an arbitrary bakery for a client caller.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'approve_bakery_subscription'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.approve_bakery_subscription(uuid) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.approve_bakery_subscription(uuid) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.approve_bakery_subscription(uuid) FROM authenticated';
  END IF;
END $$;

-- A free trial is available once per bakery. Existing trial users are marked as
-- having used it before the new restriction takes effect.
ALTER TABLE public.bakeries
  ADD COLUMN IF NOT EXISTS trial_used_at timestamptz DEFAULT NULL;

UPDATE public.bakeries
SET trial_used_at = COALESCE(subscription_start, created_at)
WHERE subscription_plan = 'trial'
  AND trial_used_at IS NULL;

-- Only this controlled RPC may create a subscription request. Paid plans stay
-- pending until an administrator approves them in the Supabase Dashboard.
CREATE OR REPLACE FUNCTION public.activate_bakery_plan(
  p_bakery_id uuid,
  p_plan text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bakery public.bakeries%ROWTYPE;
  v_owner_email text;
  v_status text;
  v_start timestamptz := now();
  v_end timestamptz;
  v_amount numeric(10,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_plan NOT IN ('trial', 'eight_months', 'one_year') THEN
    RAISE EXCEPTION 'Invalid plan selected';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bakery_memberships
    WHERE bakery_id = p_bakery_id
      AND user_id = v_user_id
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the bakery owner can select subscription plans';
  END IF;

  -- Serialize requests for this bakery so two concurrent trial selections
  -- cannot both succeed.
  SELECT * INTO v_bakery
  FROM public.bakeries
  WHERE id = p_bakery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bakery not found';
  END IF;

  IF v_bakery.subscription_status = 'active'
     AND v_bakery.subscription_plan IN ('eight_months', 'one_year')
     AND v_bakery.subscription_end > v_start THEN
    RAISE EXCEPTION 'Your paid subscription is active until %', v_bakery.subscription_end;
  END IF;

  IF p_plan = 'trial' THEN
    IF v_bakery.trial_used_at IS NOT NULL THEN
      RAISE EXCEPTION 'The free trial has already been used for this bakery';
    END IF;

    v_status := 'active';
    v_end := v_start + interval '2 days';

    UPDATE public.bakeries
    SET subscription_plan = 'trial',
        subscription_status = 'active',
        subscription_start = v_start,
        subscription_end = v_end,
        trial_used_at = v_start,
        updated_at = v_start
    WHERE id = p_bakery_id;
  ELSE
    v_status := 'pending_approval';
    v_amount := CASE WHEN p_plan = 'eight_months' THEN 829.00 ELSE 920.00 END;

    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = v_user_id;

    UPDATE public.bakeries
    SET subscription_plan = p_plan,
        subscription_status = 'pending_approval',
        subscription_start = NULL,
        subscription_end = NULL,
        updated_at = v_start
    WHERE id = p_bakery_id;

    INSERT INTO public.subscription_requests (
      bakery_id, bakery_name, owner_id, owner_email, owner_phone,
      plan, amount, status, created_at, updated_at
    ) VALUES (
      p_bakery_id, v_bakery.name, v_user_id, v_owner_email, v_bakery.phone,
      p_plan, v_amount, 'pending', v_start, v_start
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', p_bakery_id,
    'plan', p_plan,
    'subscription_status', v_status,
    'subscription_start', CASE WHEN p_plan = 'trial' THEN v_start ELSE NULL END,
    'subscription_end', CASE WHEN p_plan = 'trial' THEN v_end ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_bakery_plan(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_bakery_plan(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_bakery_plan(uuid, text) TO authenticated;

-- Owners can withdraw only a request that has not been approved. Mark the
-- associated request rejected so it cannot later be approved accidentally.
CREATE OR REPLACE FUNCTION public.cancel_pending_subscription_request(
  p_bakery_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bakery_memberships
    WHERE bakery_id = p_bakery_id
      AND user_id = v_user_id
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the bakery owner can cancel this request';
  END IF;

  UPDATE public.bakeries
  SET subscription_plan = NULL,
      subscription_status = 'none',
      subscription_start = NULL,
      subscription_end = NULL,
      updated_at = now()
  WHERE id = p_bakery_id
    AND subscription_status = 'pending_approval';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a pending subscription request can be cancelled';
  END IF;

  UPDATE public.subscription_requests
  SET status = 'rejected',
      notes = COALESCE(notes || E'\n', '') || 'Cancelled by bakery owner',
      updated_at = now()
  WHERE bakery_id = p_bakery_id
    AND status = 'pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_subscription_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_pending_subscription_request(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_pending_subscription_request(uuid) TO authenticated;
