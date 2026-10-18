-- ============================================================================
-- Migration: 002_permissions_and_grants.sql
-- Description: Security hardening, Schema grants, Column-level permissions, and RLS policies
-- ============================================================================

-- 1. Schema Grants
GRANT USAGE ON SCHEMA bakery_private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA bakery_private TO authenticated;
REVOKE ALL ON SCHEMA bakery_private FROM anon;
REVOKE ALL ON SCHEMA bakery_private FROM PUBLIC;

-- 2. Table-level Permissions Hardening
-- Revoke all permissions from anon on internal business tables
REVOKE ALL ON public.bakeries FROM anon;
REVOKE ALL ON public.bakery_memberships FROM anon;
REVOKE ALL ON public.bakery_order_sequences FROM anon;
REVOKE ALL ON public.menu_items FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE ALL ON public.inventory_movements FROM anon;

-- Orders and Order Items: direct writes are prohibited; only RPCs can write
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;

-- Inventory movements: direct writes are prohibited; only RPCs can write
REVOKE INSERT, UPDATE, DELETE ON public.inventory_movements FROM authenticated;
GRANT SELECT ON public.inventory_movements TO authenticated;

-- Menu Items: direct INSERT is revoked (must use create_product RPC to ensure initial stock auditing)
REVOKE INSERT, DELETE ON public.menu_items FROM authenticated;
GRANT SELECT ON public.menu_items TO authenticated;
-- Allow direct UPDATE on non-sensitive columns only (stock_quantity is strictly excluded)
GRANT UPDATE (name, category, description, price, is_active,
              track_inventory, low_stock_threshold, archived_at, updated_at)
ON public.menu_items TO authenticated;

-- Bakeries & Memberships permissions
GRANT SELECT ON public.bakeries TO authenticated;
GRANT UPDATE (name, phone, address, currency, timezone, updated_at) ON public.bakeries TO authenticated;
GRANT SELECT ON public.bakery_memberships TO authenticated;
GRANT SELECT ON public.bakery_order_sequences TO authenticated;

-- 3. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.bakeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bakery_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bakery_order_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Bakeries:
CREATE POLICY "Users can read bakeries they belong to"
  ON public.bakeries FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), id));

CREATE POLICY "Owners can update their bakery"
  ON public.bakeries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bakery_memberships bm
      WHERE bm.bakery_id = bakeries.id
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  );

-- Bakery Memberships:
CREATE POLICY "Users can view memberships of their bakery"
  ON public.bakery_memberships FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

-- Bakery Order Sequences:
CREATE POLICY "Members can view sequence of their bakery"
  ON public.bakery_order_sequences FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

-- Menu Items:
CREATE POLICY "Members can view products of their bakery"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

CREATE POLICY "Members can update non-stock fields of their bakery products"
  ON public.menu_items FOR UPDATE
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id))
  WITH CHECK (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

-- Orders:
CREATE POLICY "Members can view orders of their bakery"
  ON public.orders FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

-- Order Items:
CREATE POLICY "Members can view items of orders belonging to their bakery"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND bakery_private.user_belongs_to_bakery(auth.uid(), o.bakery_id)
    )
  );

-- Inventory Movements:
CREATE POLICY "Members can view inventory movements of their bakery"
  ON public.inventory_movements FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));
