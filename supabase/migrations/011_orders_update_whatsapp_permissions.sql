-- ============================================================================
-- Migration: 011_orders_update_whatsapp_permissions.sql
-- Description: Grant column-level UPDATE permissions on public.orders for WhatsApp receipt status & RLS policy
-- ============================================================================

-- 1. Grant column-level UPDATE on receipt status and tracking columns
GRANT UPDATE (whatsapp_status, whatsapp_message_id, updated_at) ON public.orders TO authenticated;

-- 2. Add RLS policy for UPDATE on public.orders
DROP POLICY IF EXISTS "Members can update receipt status of their bakery orders" ON public.orders;

CREATE POLICY "Members can update receipt status of their bakery orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id))
  WITH CHECK (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

-- 3. Create security definer RPC for robust WhatsApp status updating
CREATE OR REPLACE FUNCTION public.update_order_whatsapp_status(
  p_order_id uuid,
  p_bakery_id uuid,
  p_status text,
  p_message_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT bakery_private.user_belongs_to_bakery(auth.uid(), p_bakery_id) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to bakery %', p_bakery_id;
  END IF;

  UPDATE public.orders
  SET whatsapp_status = p_status,
      whatsapp_message_id = COALESCE(p_message_id, whatsapp_message_id),
      updated_at = now()
  WHERE id = p_order_id AND bakery_id = p_bakery_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_whatsapp_status(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_whatsapp_status(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_order_whatsapp_status(uuid, uuid, text, text) TO authenticated;
