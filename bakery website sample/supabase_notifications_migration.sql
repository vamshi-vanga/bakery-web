-- Run once in Supabase SQL Editor for an existing Sample Bakery installation.
-- New installations can use supabase_schema.sql instead.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'pos';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_name TEXT;

CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    brand_name TEXT NOT NULL DEFAULT 'Sample Bakery',
    tagline TEXT DEFAULT 'Freshly baked, made to be shared',
    currency TEXT DEFAULT '₹',
    tax_percent NUMERIC(5, 2) DEFAULT 5,
    allow_branch_menu_management BOOLEAN DEFAULT true,
    active_theme TEXT DEFAULT 'amber',
    theme_mode TEXT DEFAULT 'dark',
    inventory_tracking_enabled BOOLEAN DEFAULT true,
    operating_hours TEXT,
    whatsapp_number TEXT,
    instagram_handle TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT 'Sample Bakery';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Freshly baked, made to be shared';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '₹';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5, 2) DEFAULT 5;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS allow_branch_menu_management BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS active_theme TEXT DEFAULT 'amber';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS inventory_tracking_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = 'orders'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END
$$;
