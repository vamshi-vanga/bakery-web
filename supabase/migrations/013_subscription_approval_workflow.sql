-- ============================================================================
-- Migration: 013_subscription_approval_workflow.sql
-- Description: Supports manual admin approval for paid plans (8-month, 1-year)
--              and instant 48-hour access for 2-day free trial.
-- ============================================================================

-- 1. Drop existing constraint if present and re-add with 'pending_approval'
ALTER TABLE public.bakeries DROP CONSTRAINT IF EXISTS chk_bakery_subscription_status;

ALTER TABLE public.bakeries
  ADD CONSTRAINT chk_bakery_subscription_status
  CHECK (subscription_status IN ('none', 'pending_approval', 'active', 'expired'));

-- 2. Update activate_bakery_plan RPC:
--    - 'trial' -> activates instantly for exactly 48 hours
--    - 'eight_months' / 'one_year' -> sets status to 'pending_approval' (requires manual admin approval)
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
  v_status    text;
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

    UPDATE public.bakeries
    SET subscription_plan = p_plan,
        subscription_status = 'pending_approval',
        subscription_start = NULL,
        subscription_end = NULL,
        updated_at = v_start
    WHERE id = p_bakery_id;

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

-- 3. Automatic Trigger on bakeries:
--    Whenever an admin changes subscription_status to 'active' in Supabase,
--    it automatically calculates and fills subscription_start and subscription_end based on the plan!
CREATE OR REPLACE FUNCTION public.handle_bakery_subscription_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If status transitioned to 'active' or is set to 'active' without dates
  IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS DISTINCT FROM 'active' OR NEW.subscription_start IS NULL) THEN
    IF NEW.subscription_start IS NULL THEN
      NEW.subscription_start := now();
    END IF;

    IF NEW.subscription_end IS NULL OR NEW.subscription_end <= NEW.subscription_start THEN
      IF NEW.subscription_plan = 'trial' THEN
        NEW.subscription_end := NEW.subscription_start + interval '2 days';
      ELSIF NEW.subscription_plan = 'eight_months' THEN
        NEW.subscription_end := NEW.subscription_start + interval '8 months';
      ELSIF NEW.subscription_plan = 'one_year' THEN
        NEW.subscription_end := NEW.subscription_start + interval '1 year';
      ELSE
        NEW.subscription_end := NEW.subscription_start + interval '8 months';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bakery_subscription_approval ON public.bakeries;
CREATE TRIGGER trg_bakery_subscription_approval
BEFORE UPDATE ON public.bakeries
FOR EACH ROW
EXECUTE FUNCTION public.handle_bakery_subscription_approval();

-- 4. Admin convenience function to approve any bakery by ID or name
CREATE OR REPLACE FUNCTION public.approve_bakery_subscription(
  p_bakery_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bakery public.bakeries%ROWTYPE;
BEGIN
  UPDATE public.bakeries
  SET subscription_status = 'active',
      updated_at = now()
  WHERE id = p_bakery_id
  RETURNING * INTO v_bakery;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bakery not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bakery_id', v_bakery.id,
    'name', v_bakery.name,
    'plan', v_bakery.subscription_plan,
    'status', v_bakery.subscription_status,
    'start', v_bakery.subscription_start,
    'end', v_bakery.subscription_end
  );
END;
$$;

-- 5. Helper View for Admin to quickly see pending subscription requests in Supabase
CREATE OR REPLACE VIEW public.v_pending_subscriptions AS
SELECT 
  b.id AS bakery_id,
  b.name AS bakery_name,
  b.phone,
  b.subscription_plan,
  b.subscription_status,
  b.created_at,
  b.updated_at,
  u.email AS owner_email
FROM public.bakeries b
LEFT JOIN auth.users u ON u.id = b.owner_id
WHERE b.subscription_status = 'pending_approval'
ORDER BY b.updated_at DESC;

-- Ensure bakeries is included in realtime publication for instant client-side unlock
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bakeries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bakeries;
  END IF;
END $$;
