-- ============================================================================
-- Migration: 006_reporting_rpc.sql
-- Description: Timezone-aware financial reporting and product revenue aggregation RPCs
-- ============================================================================

-- 1. Dashboard Revenue Aggregates RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_bakery_id   uuid,
  p_start_date  timestamptz,
  p_end_date    timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id             uuid;
  v_bakery_timezone     text;
  v_total_revenue       numeric(12,2) := 0;
  v_order_count         integer := 0;
  v_avg_order_value     numeric(12,2) := 0;
  v_cash_revenue        numeric(12,2) := 0;
  v_upi_revenue         numeric(12,2) := 0;
  v_card_revenue        numeric(12,2) := 0;
BEGIN
  -- Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch bakery timezone
  SELECT timezone INTO v_bakery_timezone
  FROM public.bakeries
  WHERE id = p_bakery_id;

  v_bakery_timezone := COALESCE(v_bakery_timezone, 'Asia/Kolkata');

  -- Aggregate paid orders in the half-open interval [p_start_date, p_end_date)
  SELECT
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(ROUND(AVG(total), 2), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0)
  INTO
    v_total_revenue,
    v_order_count,
    v_avg_order_value,
    v_cash_revenue,
    v_upi_revenue,
    v_card_revenue
  FROM public.orders
  WHERE bakery_id = p_bakery_id
    AND status = 'paid'
    AND created_at >= p_start_date
    AND created_at < p_end_date;

  RETURN jsonb_build_object(
    'bakery_id', p_bakery_id,
    'timezone', v_bakery_timezone,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'total_revenue', v_total_revenue,
    'order_count', v_order_count,
    'average_order_value', v_avg_order_value,
    'payment_breakdown', jsonb_build_object(
      'cash', v_cash_revenue,
      'upi', v_upi_revenue,
      'card', v_card_revenue
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, timestamptz, timestamptz) TO authenticated;

-- 2. Top Products by Revenue RPC
CREATE OR REPLACE FUNCTION public.get_product_revenue(
  p_bakery_id   uuid,
  p_start_date  timestamptz,
  p_end_date    timestamptz,
  p_limit       integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_products  jsonb;
BEGIN
  -- Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT bakery_private.user_belongs_to_bakery(v_user_id, p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'item_name', sub.item_name_snapshot,
        'quantity_sold', sub.total_quantity,
        'total_revenue', sub.total_revenue
      )
    ),
    '[]'::jsonb
  ) INTO v_products
  FROM (
    SELECT
      oi.item_name_snapshot,
      SUM(oi.quantity)::integer AS total_quantity,
      ROUND(SUM(oi.line_total), 2) AS total_revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.bakery_id = p_bakery_id
      AND o.status = 'paid'
      AND o.created_at >= p_start_date
      AND o.created_at < p_end_date
    GROUP BY oi.item_name_snapshot
    ORDER BY total_revenue DESC
    LIMIT COALESCE(p_limit, 10)
  ) sub;

  RETURN jsonb_build_object(
    'bakery_id', p_bakery_id,
    'top_products', v_products
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_revenue(uuid, timestamptz, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_revenue(uuid, timestamptz, timestamptz, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_revenue(uuid, timestamptz, timestamptz, integer) TO authenticated;
