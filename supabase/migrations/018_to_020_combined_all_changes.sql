-- ============================================================================
-- COMBINED MIGRATION: 018 + 019 + 020
-- 1. 018: Lock subscription approval & single free trial per bakery
-- 2. 019: Concurrency-safe create_order with row-locking & inventory validation
-- 3. 020: Concurrency-safe sync_offline_order with receipt snapshot preservation
-- ============================================================================

-- ============================================================================
-- PART 1: 018_lock_subscription_approval.sql
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


-- ============================================================================
-- PART 2: 019_fix_order_inventory_concurrency.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order(
  p_bakery_id                    uuid,
  p_idempotency_key              uuid,
  p_payment_method               text,
  p_items                        jsonb,
  p_customer_name                text    DEFAULT NULL,
  p_customer_phone               text    DEFAULT NULL,
  p_receipt_requested            boolean DEFAULT false,
  p_override_insufficient_stock  boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id            uuid := auth.uid();
  v_existing_order     jsonb;
  v_order_id           uuid;
  v_order_number       text;
  v_next_seq           integer;
  v_subtotal           numeric(12,2) := 0;
  v_item               jsonb;
  v_menu_item          record;
  v_line_total         numeric(12,2);
  v_insufficient_items jsonb := '[]'::jsonb;
  v_has_insufficient   boolean := false;
  v_validated_items    jsonb := '[]'::jsonb;
  v_requested_items    jsonb;
  v_requested_count    integer;
  v_validated_count    integer := 0;
  v_bakery_tz          text;
  v_time_str           text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

  PERFORM bakery_private.assert_subscription_active(p_bakery_id);

  -- Serialize retries with the same idempotency key.
  PERFORM pg_advisory_xact_lock(
    abs(hashtext(p_bakery_id::text || '::' || p_idempotency_key::text))
  );

  SELECT jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'total', o.total,
    'status', o.status,
    'payment_method', o.payment_method,
    'created_at', o.created_at,
    'items', (
      SELECT jsonb_agg(jsonb_build_object(
        'item_name', oi.item_name_snapshot,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price_snapshot,
        'line_total', oi.line_total
      ))
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    ),
    'stock_warnings', NULL
  ) INTO v_existing_order
  FROM public.orders o
  WHERE o.bakery_id = p_bakery_id
    AND o.idempotency_key = p_idempotency_key;

  IF v_existing_order IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'order', v_existing_order);
  END IF;

  IF p_payment_method NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method: %. Must be cash, upi, or card', p_payment_method;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Validate before casting, then combine duplicate product lines. A cart with
  -- the same product twice is one inventory request, not two independent checks.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS value
  LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL THEN
      RAISE EXCEPTION 'Every order item must include a menu_item_id';
    END IF;

    IF COALESCE(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Item quantity must be a positive integer';
    END IF;
  END LOOP;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('menu_item_id', requested.menu_item_id, 'quantity', requested.quantity)
      ORDER BY requested.menu_item_id
    ),
    '[]'::jsonb
  )
  INTO v_requested_items
  FROM (
    SELECT
      (value->>'menu_item_id')::uuid AS menu_item_id,
      SUM((value->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) AS value
    GROUP BY (value->>'menu_item_id')::uuid
  ) AS requested;

  v_requested_count := jsonb_array_length(v_requested_items);

  -- Lock every requested product in deterministic order. PostgreSQL re-reads
  -- each locked row, so stock is evaluated after another sale has committed.
  FOR v_menu_item IN
    SELECT
      mi.id,
      mi.name,
      mi.price,
      mi.track_inventory,
      mi.stock_quantity,
      requested.quantity
    FROM jsonb_to_recordset(v_requested_items) AS requested(menu_item_id uuid, quantity integer)
    JOIN public.menu_items mi
      ON mi.id = requested.menu_item_id
     AND mi.bakery_id = p_bakery_id
     AND mi.is_active = true
    ORDER BY mi.id
    FOR UPDATE OF mi
  LOOP
    v_validated_count := v_validated_count + 1;
    v_line_total := v_menu_item.price * v_menu_item.quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_validated_items := v_validated_items || jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'unit_price', v_menu_item.price,
      'quantity', v_menu_item.quantity,
      'line_total', v_line_total,
      'track_inventory', v_menu_item.track_inventory,
      'current_stock', v_menu_item.stock_quantity
    );

    IF v_menu_item.track_inventory AND v_menu_item.stock_quantity < v_menu_item.quantity THEN
      v_has_insufficient := true;
      v_insufficient_items := v_insufficient_items || jsonb_build_object(
        'menu_item_id', v_menu_item.id,
        'item_name', v_menu_item.name,
        'requested_quantity', v_menu_item.quantity,
        'available_stock', v_menu_item.stock_quantity
      );
    END IF;
  END LOOP;

  IF v_validated_count <> v_requested_count THEN
    RAISE EXCEPTION 'One or more order items were not found or are inactive in this bakery';
  END IF;

  IF v_has_insufficient AND NOT p_override_insufficient_stock THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicate', false,
      'requires_confirmation', true,
      'reason', 'INSUFFICIENT_STOCK',
      'insufficient_items', v_insufficient_items
    );
  END IF;

  SELECT timezone INTO v_bakery_tz
  FROM public.bakeries
  WHERE id = p_bakery_id;

  v_bakery_tz := COALESCE(NULLIF(trim(v_bakery_tz), ''), 'Asia/Kolkata');

  BEGIN
    v_time_str := to_char(now() AT TIME ZONE v_bakery_tz, 'HH24MI');
  EXCEPTION WHEN OTHERS THEN
    v_time_str := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24MI');
  END;

  INSERT INTO public.bakery_order_sequences (bakery_id, next_seq, updated_at)
  VALUES (p_bakery_id, 2, now())
  ON CONFLICT (bakery_id) DO UPDATE
    SET next_seq = public.bakery_order_sequences.next_seq + 1,
        updated_at = now()
  RETURNING next_seq - 1 INTO v_next_seq;

  v_order_number := 'ORD-' || v_time_str || '-' || LPAD(v_next_seq::text, 2, '0');
  v_order_id := gen_random_uuid();

  INSERT INTO public.orders (
    id, bakery_id, order_number, idempotency_key, total,
    payment_method, status, customer_name, customer_phone,
    receipt_requested, whatsapp_status, created_by, created_at, updated_at
  ) VALUES (
    v_order_id, p_bakery_id, v_order_number, p_idempotency_key, v_subtotal,
    p_payment_method, 'paid', NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_customer_phone), ''), p_receipt_requested,
    CASE WHEN p_receipt_requested AND NULLIF(trim(p_customer_phone), '') IS NOT NULL
         THEN 'pending' ELSE 'not_requested' END,
    v_user_id, now(), now()
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_validated_items) AS value
  LOOP
    INSERT INTO public.order_items (
      order_id, menu_item_id, item_name_snapshot,
      unit_price_snapshot, quantity, line_total, created_at
    ) VALUES (
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      v_item->>'name',
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::integer,
      (v_item->>'line_total')::numeric,
      now()
    );

    IF (v_item->>'track_inventory')::boolean THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
          updated_at = now()
      WHERE id = (v_item->>'menu_item_id')::uuid;

      INSERT INTO public.inventory_movements (
        bakery_id, menu_item_id, quantity_delta, movement_type,
        reference_order_id, note, created_by, created_at
      ) VALUES (
        p_bakery_id,
        (v_item->>'menu_item_id')::uuid,
        -(v_item->>'quantity')::integer,
        'sale',
        v_order_id,
        'Deducted via POS order ' || v_order_number,
        v_user_id,
        now()
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'order', jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'total', v_subtotal,
      'status', 'paid',
      'payment_method', p_payment_method,
      'created_at', now(),
      'items', v_validated_items,
      'stock_warnings', CASE WHEN v_has_insufficient THEN v_insufficient_items ELSE NULL END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, uuid, text, jsonb, text, text, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order(uuid, uuid, text, jsonb, text, text, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, text, jsonb, text, text, boolean, boolean) TO authenticated;


-- ============================================================================
-- PART 3: 020_preserve_offline_sale_snapshots.sql
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS offline_order_id uuid,
  ADD COLUMN IF NOT EXISTS offline_order_number text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_bakery_offline_order_id
  ON public.orders (bakery_id, offline_order_id)
  WHERE offline_order_id IS NOT NULL;

-- Online sales continue through create_order, which always uses server prices.
-- This RPC is limited to syncing a previously captured offline sale. It first
-- uses create_order for authorization and inventory handling, then replaces its
-- temporary server-price snapshots before the transaction commits.
CREATE OR REPLACE FUNCTION public.sync_offline_order(
  p_bakery_id                    uuid,
  p_idempotency_key              uuid,
  p_payment_method               text,
  p_items                        jsonb   DEFAULT '[]'::jsonb,
  p_customer_name                text    DEFAULT NULL,
  p_customer_phone               text    DEFAULT NULL,
  p_receipt_requested            boolean DEFAULT false,
  p_override_insufficient_stock  boolean DEFAULT false,
  p_offline_order_id             uuid    DEFAULT NULL,
  p_offline_order_number         text    DEFAULT NULL,
  p_sold_at                      timestamptz DEFAULT NULL,
  p_offline_items                jsonb   DEFAULT '[]'::jsonb,
  p_offline_total                numeric(12,2) DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item           jsonb;
  v_server_items   jsonb := '[]'::jsonb;
  v_response_items jsonb := '[]'::jsonb;
  v_snapshot_total numeric(12,2) := 0;
  v_quantity       integer;
  v_unit_price     numeric(12,2);
  v_line_total     numeric(12,2);
  v_item_name      text;
  v_result         jsonb;
  v_order_id       uuid;
  v_order_number   text;
BEGIN
  IF p_offline_order_id IS NULL OR p_sold_at IS NULL THEN
    RAISE EXCEPTION 'Offline order ID and sale time are required';
  END IF;

  IF p_sold_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Offline sale time cannot be in the future';
  END IF;

  IF p_offline_items IS NULL
     OR jsonb_typeof(p_offline_items) <> 'array'
     OR jsonb_array_length(p_offline_items) = 0 THEN
    RAISE EXCEPTION 'Offline sale must contain at least one item';
  END IF;

  -- Validate the immutable local receipt snapshot and rebuild the minimal
  -- product/quantity payload used by the authoritative order RPC.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_offline_items) AS value
  LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL THEN
      RAISE EXCEPTION 'Every offline item must include a menu_item_id';
    END IF;

    IF COALESCE(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Offline item quantity must be a positive integer';
    END IF;

    IF COALESCE(v_item->>'unit_price', '') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Offline item unit price must be a non-negative number';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric(12,2);
    v_line_total := v_unit_price * v_quantity;
    v_snapshot_total := v_snapshot_total + v_line_total;
    v_item_name := COALESCE(NULLIF(trim(v_item->>'product_name'), ''), 'Bakery Item');

    v_server_items := v_server_items || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'quantity', v_quantity
    ));

    v_response_items := v_response_items || jsonb_build_array(jsonb_build_object(
      'item_name', v_item_name,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'line_total', v_line_total
    ));
  END LOOP;

  IF round(v_snapshot_total, 2) <> round(p_offline_total, 2) THEN
    RAISE EXCEPTION 'Offline order total does not match its item snapshots';
  END IF;

  -- This enforces membership, subscription status, idempotency, product
  -- ownership, current stock checks, row locking, and stock deductions.
  v_result := public.create_order(
    p_bakery_id                    => p_bakery_id,
    p_idempotency_key              => p_idempotency_key,
    p_payment_method               => p_payment_method,
    p_items                        => v_server_items,
    p_customer_name                => p_customer_name,
    p_customer_phone               => p_customer_phone,
    p_receipt_requested            => p_receipt_requested,
    p_override_insufficient_stock  => p_override_insufficient_stock
  );

  IF COALESCE((v_result->>'success')::boolean, false) = false THEN
    RETURN v_result;
  END IF;

  -- Idempotent retries return the already-stored receipt unchanged.
  IF COALESCE((v_result->>'duplicate')::boolean, false) THEN
    RETURN v_result;
  END IF;

  v_order_id := (v_result->'order'->>'order_id')::uuid;
  v_order_number := v_result->'order'->>'order_number';

  UPDATE public.orders
  SET total = p_offline_total,
      created_at = p_sold_at,
      offline_order_id = p_offline_order_id,
      offline_order_number = NULLIF(trim(p_offline_order_number), ''),
      synced_at = now(),
      updated_at = now()
  WHERE id = v_order_id
    AND bakery_id = p_bakery_id;

  -- Replace temporary current-catalog snapshots with the exact receipt that
  -- the cashier issued while offline.
  DELETE FROM public.order_items WHERE order_id = v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_offline_items) AS value
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric(12,2);
    v_line_total := v_unit_price * v_quantity;
    v_item_name := COALESCE(NULLIF(trim(v_item->>'product_name'), ''), 'Bakery Item');

    INSERT INTO public.order_items (
      order_id, menu_item_id, item_name_snapshot,
      unit_price_snapshot, quantity, line_total, created_at
    ) VALUES (
      v_order_id,
      (v_item->>'menu_item_id')::uuid,
      v_item_name,
      v_unit_price,
      v_quantity,
      v_line_total,
      p_sold_at
    );
  END LOOP;

  UPDATE public.inventory_movements
  SET created_at = p_sold_at
  WHERE reference_order_id = v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'order', jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'total', p_offline_total,
      'status', 'paid',
      'payment_method', p_payment_method,
      'created_at', p_sold_at,
      'items', v_response_items,
      'stock_warnings', v_result->'order'->'stock_warnings'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_offline_order(
  uuid, uuid, text, jsonb, text, text, boolean, boolean, uuid, text, timestamptz, jsonb, numeric
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_offline_order(
  uuid, uuid, text, jsonb, text, text, boolean, boolean, uuid, text, timestamptz, jsonb, numeric
) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_offline_order(
  uuid, uuid, text, jsonb, text, text, boolean, boolean, uuid, text, timestamptz, jsonb, numeric
) TO authenticated;
