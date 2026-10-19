-- ============================================================================
-- Migration: 012_bakery_subscriptions.sql
-- Description: Adds subscription fields to bakeries table and activation RPC
-- ============================================================================

-- 1. Add subscription columns to bakeries table
ALTER TABLE public.bakeries
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_start timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_end timestamptz DEFAULT NULL;

-- 2. Add validation constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bakery_subscription_plan'
  ) THEN
    ALTER TABLE public.bakeries
      ADD CONSTRAINT chk_bakery_subscription_plan
      CHECK (subscription_plan IS NULL OR subscription_plan IN ('trial', 'eight_months', 'one_year'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bakery_subscription_status'
  ) THEN
    ALTER TABLE public.bakeries
      ADD CONSTRAINT chk_bakery_subscription_status
      CHECK (subscription_status IN ('none', 'active', 'expired'));
  END IF;
END $$;

-- 3. Column level grant for authenticated users to update their bakery subscription
GRANT UPDATE (subscription_plan, subscription_status, subscription_start, subscription_end, updated_at) 
  ON public.bakeries TO authenticated;

-- 4. Create atomic activation RPC
CREATE OR REPLACE FUNCTION public.activate_bakery_plan(
  p_bakery_id uuid,
  p_plan      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_role      text;
  v_start     timestamptz;
  v_end       timestamptz;
BEGIN
  -- Validate authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate role is owner
  SELECT role INTO v_role
  FROM public.bakery_memberships
  WHERE bakery_id = p_bakery_id AND user_id = v_user_id;

  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the bakery owner can change subscription plans';
  END IF;

  -- Validate plan & calculate end date
  v_start := now();
  IF p_plan = 'trial' THEN
    v_end := v_start + interval '2 days';
  ELSIF p_plan = 'eight_months' THEN
    v_end := v_start + interval '8 months';
  ELSIF p_plan = 'one_year' THEN
    v_end := v_start + interval '1 year';
  ELSE
    RAISE EXCEPTION 'Invalid plan: %. Must be trial, eight_months, or one_year', p_plan;
  END IF;

  -- Update bakery record
  UPDATE public.bakeries
  SET subscription_plan = p_plan,
      subscription_status = 'active',
      subscription_start = v_start,
      subscription_end = v_end,
      updated_at = v_start
  WHERE id = p_bakery_id;

  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', p_bakery_id,
    'plan', p_plan,
    'subscription_status', 'active',
    'subscription_start', v_start,
    'subscription_end', v_end
  );
END;
$$;

-- Restrict execution
REVOKE ALL ON FUNCTION public.activate_bakery_plan(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_bakery_plan(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_bakery_plan(uuid, text) TO authenticated;
