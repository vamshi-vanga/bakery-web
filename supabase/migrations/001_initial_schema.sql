-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema, private auth helpers, and updated_at triggers
-- ============================================================================

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bakeries table
CREATE TABLE IF NOT EXISTS public.bakeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  phone text,
  address text,
  currency text NOT NULL DEFAULT 'INR',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_bakeries_updated_at
  BEFORE UPDATE ON public.bakeries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Bakery Memberships table (Multi-tenant access mapping)
CREATE TABLE IF NOT EXISTS public.bakery_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'cashier', 'baker')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_bakery_user UNIQUE (bakery_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.bakery_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_bakery ON public.bakery_memberships(bakery_id);

CREATE TRIGGER set_bakery_memberships_updated_at
  BEFORE UPDATE ON public.bakery_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Bakery Order Sequences table (Atomic sequential order numbers)
CREATE TABLE IF NOT EXISTS public.bakery_order_sequences (
  bakery_id uuid PRIMARY KEY REFERENCES public.bakeries(id) ON DELETE CASCADE,
  current_sequence integer NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT 'ORD',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Menu Items (Products) table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  category text NOT NULL DEFAULT 'General',
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  track_inventory boolean NOT NULL DEFAULT false,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_bakery ON public.menu_items(bakery_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(bakery_id, category);

CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  idempotency_key uuid NOT NULL,
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'voided')),
  customer_name text,
  customer_phone text,
  receipt_requested boolean NOT NULL DEFAULT false,
  whatsapp_status text NOT NULL DEFAULT 'not_requested' CHECK (
    whatsapp_status IN ('not_requested', 'pending', 'accepted', 'delivered', 'failed', 'manual')
  ),
  whatsapp_message_id text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  voided_by uuid REFERENCES auth.users(id),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_bakery_order_number UNIQUE (bakery_id, order_number),
  CONSTRAINT uq_bakery_idempotency UNIQUE (bakery_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_bakery_created ON public.orders(bakery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(bakery_id, status);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Order Items (Snapshot table)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name_snapshot text NOT NULL,
  unit_price_snapshot numeric(12,2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON public.order_items(menu_item_id);

-- 8. Inventory Movements table (Immutable audit log)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity_delta integer NOT NULL CHECK (quantity_delta != 0),
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'restock', 'waste', 'correction', 'void_restoration')),
  reference_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  note text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_bakery_item ON public.inventory_movements(bakery_id, menu_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref_order ON public.inventory_movements(reference_order_id);

-- 9. Private schema & Helper functions for safe RLS and RPC operations
CREATE SCHEMA IF NOT EXISTS bakery_private;

-- Validates that a specific user belongs to a specific bakery
CREATE OR REPLACE FUNCTION bakery_private.user_belongs_to_bakery(
  p_user_id   uuid,
  p_bakery_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bakery_memberships bm
    WHERE bm.user_id = p_user_id
      AND bm.bakery_id = p_bakery_id
  );
$$;

-- Returns the primary bakery_id for the current user (if any)
CREATE OR REPLACE FUNCTION bakery_private.get_user_bakery_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT bakery_id
  FROM public.bakery_memberships
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;
