-- ============================================================================
-- Migration: 008_categories_management.sql
-- Description: Dedicated categories table, RLS, and atomic category renaming RPC
-- ============================================================================

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id uuid NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_bakery_category UNIQUE (bakery_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_bakery ON public.categories(bakery_id);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

CREATE POLICY "Members can insert categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

CREATE POLICY "Members can update categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id))
  WITH CHECK (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

CREATE POLICY "Members can delete categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (bakery_private.user_belongs_to_bakery(auth.uid(), bakery_id));

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
REVOKE ALL ON public.categories FROM anon;

-- 3. Atomic Category Renaming RPC
CREATE OR REPLACE FUNCTION public.rename_category(
  p_bakery_id uuid,
  p_old_name text,
  p_new_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_old text := trim(p_old_name);
  v_cleaned_new text := trim(p_new_name);
BEGIN
  IF NOT bakery_private.user_belongs_to_bakery(auth.uid(), p_bakery_id) THEN
    RAISE EXCEPTION 'Access denied to bakery %', p_bakery_id USING ERRCODE = '42501';
  END IF;

  IF length(v_cleaned_new) = 0 THEN
    RAISE EXCEPTION 'Category name cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Update category entry
  UPDATE public.categories
  SET name = v_cleaned_new, updated_at = now()
  WHERE bakery_id = p_bakery_id AND name = v_cleaned_old;

  -- Cascade update all menu items in this bakery with the old category name
  UPDATE public.menu_items
  SET category = v_cleaned_new, updated_at = now()
  WHERE bakery_id = p_bakery_id AND category = v_cleaned_old;

  RETURN jsonb_build_object(
    'success', true,
    'old_name', v_cleaned_old,
    'new_name', v_cleaned_new
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_category(uuid, text, text) TO authenticated;

-- 4. Automatically seed default categories when setting up a bakery
-- Backfill existing bakeries with default categories
INSERT INTO public.categories (bakery_id, name, sort_order)
SELECT b.id, cat.name, cat.sort_order
FROM public.bakeries b
CROSS JOIN (
  VALUES 
    ('Cakes', 1),
    ('Pastries', 2),
    ('Breads', 3),
    ('Cookies', 4),
    ('Beverages', 5),
    ('Savouries', 6)
) AS cat(name, sort_order)
ON CONFLICT (bakery_id, name) DO NOTHING;
