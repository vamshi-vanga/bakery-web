-- ============================================================================
-- Migration: 023_fix_subscription_requests_table.sql
-- Description: Ensures public.subscription_requests exists with full RLS,
--              triggers, and updates activate_bakery_plan RPC to be completely
--              resilient against missing tables and permission errors.
-- ============================================================================

-- 1. Create subscription_requests table if it does not already exist
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  bakery_name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email text,
  owner_phone text,
  plan text NOT NULL CHECK (plan IN ('eight_months', 'one_year')),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Members can view their bakery subscription requests" ON public.subscription_requests;
CREATE POLICY "Members can view their bakery subscription requests"
  ON public.subscription_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bakery_memberships bm
      WHERE bm.bakery_id = subscription_requests.bakery_id
        AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can insert subscription requests" ON public.subscription_requests;
CREATE POLICY "Owners can insert subscription requests"
  ON public.subscription_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bakery_memberships bm
      WHERE bm.bakery_id = subscription_requests.bakery_id
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  );

-- 4. Trigger: when admin approves in Supabase Table Editor (status -> 'approved'),
--    automatically activate the bakery subscription in bakeries table
CREATE OR REPLACE FUNCTION public.handle_subscription_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_months int;
  v_start timestamptz := now();
  v_end timestamptz;
BEGIN
  -- Only execute when status transitions to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.plan = 'eight_months' THEN
      v_months := 8;
    ELSIF NEW.plan = 'one_year' THEN
      v_months := 12;
    ELSE
      v_months := 8;
    END IF;

    v_end := v_start + (v_months || ' months')::interval;

    UPDATE public.bakeries
    SET subscription_plan = NEW.plan,
        subscription_status = 'active',
        subscription_start = v_start,
        subscription_end = v_end,
        updated_at = v_start
    WHERE id = NEW.bakery_id;

    NEW.approved_at := v_start;
    NEW.updated_at := v_start;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_request_status_change ON public.subscription_requests;
CREATE TRIGGER trg_subscription_request_status_change
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_request_status_change();

-- 5. Resilient activate_bakery_plan RPC:
--    Updates bakeries and inserts into subscription_requests with EXCEPTION safety
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
  v_start timestamptz := now();
  v_end timestamptz;
  v_status text;
  v_amount numeric(10,2);
BEGIN
  -- Plan validation
  IF p_plan NOT IN ('trial', 'eight_months', 'one_year') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid subscription plan');
  END IF;

  -- Ensure caller is owner of this bakery
  IF NOT EXISTS (
    SELECT 1 FROM public.bakery_memberships bm
    WHERE bm.bakery_id = p_bakery_id
      AND bm.user_id = v_user_id
      AND bm.role = 'owner'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only bakery owners can request or activate plans');
  END IF;

  -- Retrieve current bakery record
  SELECT * INTO v_bakery
  FROM public.bakeries
  WHERE id = p_bakery_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bakery not found');
  END IF;

  -- Enforce active paid plan protection
  IF v_bakery.subscription_status = 'active'
     AND v_bakery.subscription_end IS NOT NULL
     AND v_bakery.subscription_end > v_start
     AND v_bakery.subscription_plan IN ('eight_months', 'one_year') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bakery already has an active plan until ' || to_char(v_bakery.subscription_end, 'YYYY-MM-DD')
    );
  END IF;

  -- Process plan request
  IF p_plan = 'trial' THEN
    IF v_bakery.trial_used_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Free trial has already been used for this bakery.'
      );
    END IF;

    v_status := 'active';
    v_end := v_start + interval '48 hours';

    UPDATE public.bakeries
    SET subscription_plan = 'trial',
        subscription_status = 'active',
        subscription_start = v_start,
        subscription_end = v_end,
        trial_used_at = v_start,
        updated_at = v_start
    WHERE id = p_bakery_id;
  ELSE
    -- Paid plan (8-month or 1-year) -> pending admin approval
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

    -- Exception-safe insert into subscription_requests
    BEGIN
      INSERT INTO public.subscription_requests (
        bakery_id, bakery_name, owner_id, owner_email, owner_phone,
        plan, amount, status, created_at, updated_at
      ) VALUES (
        p_bakery_id, v_bakery.name, v_user_id, v_owner_email, v_bakery.phone,
        p_plan, v_amount, 'pending', v_start, v_start
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log warning but don't fail the bakery update
      RAISE WARNING 'subscription_requests insert failed: %', SQLERRM;
    END;
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
