-- ============================================================================
-- Migration: 016_subscription_requests_notifications.sql
-- Description: Centralized subscription requests table for admin notifications
--              and 1-click approvals directly from Supabase Table Editor.
-- ============================================================================

-- 1. Create subscription_requests table
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

-- Enable RLS
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Bakery members can view requests for their bakery
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

-- Policy: Bakery owners can insert requests for their bakery
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

-- 2. Trigger function: when status in subscription_requests changes to 'approved',
--    automatically activate the bakery subscription for 8 months or 1 year!
CREATE OR REPLACE FUNCTION public.handle_subscription_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := now();
    NEW.updated_at := now();

    -- Update the bakery record; trg_bakery_subscription_approval will set the 8-month or 1-year dates
    UPDATE public.bakeries
    SET subscription_plan = NEW.plan,
        subscription_status = 'active',
        updated_at = now()
    WHERE id = NEW.bakery_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_request_status_change ON public.subscription_requests;
CREATE TRIGGER trg_subscription_request_status_change
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_request_status_change();

-- 3. Update activate_bakery_plan RPC to automatically record a request in subscription_requests
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
  v_user_id     uuid;
  v_role        text;
  v_start       timestamptz;
  v_end         timestamptz;
  v_status      text;
  v_bakery_name text;
  v_owner_phone text;
  v_owner_email text;
  v_amount      numeric(10,2);
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
    RAISE EXCEPTION 'Only the bakery owner can select subscription plans';
  END IF;

  -- Get bakery metadata
  SELECT name, phone INTO v_bakery_name, v_owner_phone
  FROM public.bakeries
  WHERE id = p_bakery_id;

  SELECT email INTO v_owner_email
  FROM auth.users
  WHERE id = v_user_id;

  v_start := now();

  IF p_plan = 'trial' THEN
    -- Instant 48-hour access for free trial
    v_status := 'active';
    v_end := v_start + interval '2 days';

    UPDATE public.bakeries
    SET subscription_plan = 'trial',
        subscription_status = 'active',
        subscription_start = v_start,
        subscription_end = v_end,
        updated_at = v_start
    WHERE id = p_bakery_id;

  ELSIF p_plan = 'eight_months' OR p_plan = 'one_year' THEN
    -- Paid plans require manual admin approval in Supabase
    v_status := 'pending_approval';
    v_end := NULL;
    v_amount := CASE WHEN p_plan = 'eight_months' THEN 829.00 ELSE 920.00 END;

    UPDATE public.bakeries
    SET subscription_plan = p_plan,
        subscription_status = 'pending_approval',
        subscription_start = NULL,
        subscription_end = NULL,
        updated_at = v_start
    WHERE id = p_bakery_id;

    -- Insert into subscription_requests table for admin dashboard notification & tracking
    INSERT INTO public.subscription_requests (
      bakery_id,
      bakery_name,
      owner_id,
      owner_email,
      owner_phone,
      plan,
      amount,
      status,
      created_at,
      updated_at
    )
    VALUES (
      p_bakery_id,
      COALESCE(v_bakery_name, 'Unknown Bakery'),
      v_user_id,
      v_owner_email,
      v_owner_phone,
      p_plan,
      v_amount,
      'pending',
      v_start,
      v_start
    );

  ELSE
    RAISE EXCEPTION 'Invalid plan: %. Must be trial, eight_months, or one_year', p_plan;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', p_bakery_id,
    'plan', p_plan,
    'subscription_status', v_status,
    'subscription_start', v_start,
    'subscription_end', v_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_bakery_plan(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_bakery_plan(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_bakery_plan(uuid, text) TO authenticated;
