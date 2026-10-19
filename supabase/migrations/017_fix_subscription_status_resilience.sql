-- ============================================================================
-- Migration: 017_fix_subscription_status_resilience.sql
-- Description: 
--   1. Makes subscription_status resilient against trailing whitespace & casing
--   2. Hard-protects active 8-month and 1-year plans so they can NEVER be
--      accidentally overwritten, downgraded, or changed until expiry
--   3. Guarantees 2-day trial users can seamlessly select 8-month or 1-year plans
-- ============================================================================

-- 1. Drop and replace the check constraint to allow whitespace trimming
ALTER TABLE public.bakeries DROP CONSTRAINT IF EXISTS chk_bakery_subscription_status;

ALTER TABLE public.bakeries
  ADD CONSTRAINT chk_bakery_subscription_status
  CHECK (btrim(lower(subscription_status)) IN ('none', 'pending_approval', 'active', 'expired'));

-- 2. Enhanced Trigger: Auto-trim spaces + Protect active paid subscriptions
CREATE OR REPLACE FUNCTION public.handle_bakery_subscription_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Auto-trim and lowercase status and plan so accidental spaces never break updates
  IF NEW.subscription_status IS NOT NULL THEN
    NEW.subscription_status := btrim(lower(NEW.subscription_status));
  END IF;

  IF NEW.subscription_plan IS NOT NULL THEN
    NEW.subscription_plan := btrim(lower(NEW.subscription_plan));
  END IF;

  -- HARD SECURITY GUARD:
  -- If bakery currently has an active paid subscription (8-month or 1-year) that has not expired,
  -- BLOCK any attempt to downgrade to pending_approval or change the plan.
  IF OLD.subscription_status = 'active'
     AND OLD.subscription_plan IN ('eight_months', 'one_year')
     AND OLD.subscription_end IS NOT NULL
     AND OLD.subscription_end > now() THEN

    -- Block accidental enrollment in another plan or setting to pending_approval
    IF NEW.subscription_status = 'pending_approval' THEN
      RAISE EXCEPTION 'Active subscription protected: Bakery already has an active % plan valid until %. Cannot set to pending_approval.',
        OLD.subscription_plan, OLD.subscription_end;
    END IF;

    -- If plan is being changed to something else while not expired, block unless explicit admin override
    IF NEW.subscription_plan <> OLD.subscription_plan AND NEW.subscription_status <> 'active' THEN
      RAISE EXCEPTION 'Active subscription protected: Cannot switch plan from % while current subscription is still active.',
        OLD.subscription_plan;
    END IF;
  END IF;

  -- When status is transitioned to 'active', auto-calculate start and end dates
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
BEFORE INSERT OR UPDATE ON public.bakeries
FOR EACH ROW
EXECUTE FUNCTION public.handle_bakery_subscription_approval();

-- 3. Update activate_bakery_plan RPC with active paid plan lock:
--    - Trial users can freely pick 8-month or 1-year plans.
--    - Active 8-month or 1-year users CANNOT select other plans until expired.
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
  v_user_id       uuid;
  v_role          text;
  v_start         timestamptz;
  v_end           timestamptz;
  v_status        text;
  v_bakery_name   text;
  v_owner_phone   text;
  v_owner_email   text;
  v_amount        numeric(10,2);
  v_curr_plan     text;
  v_curr_status   text;
  v_curr_end      timestamptz;
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

  -- Get current bakery subscription status
  SELECT name, phone, subscription_plan, subscription_status, subscription_end
  INTO v_bakery_name, v_owner_phone, v_curr_plan, v_curr_status, v_curr_end
  FROM public.bakeries
  WHERE id = p_bakery_id;

  -- GUARD: If bakery currently has an ACTIVE PAID plan (8-month or 1-year) that has not expired,
  -- REJECT the request immediately. Active plans cannot be overridden!
  IF v_curr_status = 'active'
     AND v_curr_plan IN ('eight_months', 'one_year')
     AND v_curr_end IS NOT NULL
     AND v_curr_end > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your bakery already has an active ' || 
               CASE WHEN v_curr_plan = 'one_year' THEN '1-Year' ELSE '8-Month' END || 
               ' plan valid until ' || to_char(v_curr_end, 'DD Mon YYYY') || 
               '. You cannot select or change plans until the current subscription period completes.'
    );
  END IF;

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

    -- Record in subscription_requests table
    INSERT INTO public.subscription_requests (
      bakery_id,
      bakery_name,
      owner_id,
      owner_email,
      owner_phone,
      plan,
      amount,
      status
    ) VALUES (
      p_bakery_id,
      v_bakery_name,
      v_user_id,
      v_owner_email,
      v_owner_phone,
      p_plan,
      v_amount,
      'pending'
    );
  ELSE
    RAISE EXCEPTION 'Invalid plan selected: %', p_plan;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'plan', p_plan,
    'status', v_status,
    'start', v_start,
    'end', v_end
  );
END;
$$;
