-- ==============================================================================
-- SAMPLE BAKERY - SUPABASE DATABASE SCHEMA & INITIAL SEED
-- ==============================================================================
-- Paste this entire script into your Supabase SQL Editor (Dashboard > SQL Editor)
-- and click "Run". It creates all tables, Row Level Security (RLS) policies,
-- the storage bucket for image uploads, and initial sample menu data.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CREATE TABLES
-- ==============================================================================

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    subcategories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT NOT NULL,
    popular BOOLEAN DEFAULT false,
    available BOOLEAN DEFAULT true,
    track_inventory BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 12,
    daily_baked INTEGER DEFAULT 18,
    low_stock_threshold INTEGER DEFAULT 5,
    pricing_type TEXT DEFAULT 'quantity',
    size_variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fields used by the customer checkout, admin order history, and POS.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'pos';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_name TEXT;

-- Global bakery profile and customer contact settings.
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

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Freshly baked, made to be shared';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- ==============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. RLS POLICIES
-- ==============================================================================

-- Categories Policies:
-- Anyone can view categories
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories FOR SELECT
    USING (true);

-- Service role / Admin can insert/update/delete categories
DROP POLICY IF EXISTS "Service role full access to categories" ON public.categories;
CREATE POLICY "Service role full access to categories"
    ON public.categories FOR ALL
    USING (true)
    WITH CHECK (true);

-- Menu Items Policies:
-- Anyone can view menu items
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items"
    ON public.menu_items FOR SELECT
    USING (true);

-- Service role / Admin can insert/update/delete menu items
DROP POLICY IF EXISTS "Service role full access to menu items" ON public.menu_items;
CREATE POLICY "Service role full access to menu items"
    ON public.menu_items FOR ALL
    USING (true)
    WITH CHECK (true);

-- Orders Policies:
-- Customers can place orders (INSERT)
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

-- Admin / Service role can view and manage all orders
DROP POLICY IF EXISTS "Service role full access to orders" ON public.orders;
CREATE POLICY "Service role full access to orders"
    ON public.orders FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to settings" ON public.settings;
CREATE POLICY "Service role full access to settings"
    ON public.settings FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Enable customer order inserts to appear in the admin Supabase Realtime channel.
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

-- ==============================================================================
-- 5. STORAGE BUCKET FOR ASSETS
-- ==============================================================================
-- Creates 'bakery-assets' bucket if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('bakery-assets', 'bakery-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access for images
DROP POLICY IF EXISTS "Public can view bakery assets" ON storage.objects;
CREATE POLICY "Public can view bakery assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'bakery-assets');

-- Upload access for bakery assets
DROP POLICY IF EXISTS "Public can upload to bakery assets" ON storage.objects;
CREATE POLICY "Public can upload to bakery assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'bakery-assets');

DROP POLICY IF EXISTS "Public can update bakery assets" ON storage.objects;
CREATE POLICY "Public can update bakery assets"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'bakery-assets');

DROP POLICY IF EXISTS "Public can delete bakery assets" ON storage.objects;
CREATE POLICY "Public can delete bakery assets"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'bakery-assets');

-- ==============================================================================
-- 6. SEED INITIAL DATA (CATEGORIES & MENU ITEMS)
-- ==============================================================================

-- Insert Initial Categories
INSERT INTO public.categories (name, image_url, subcategories)
VALUES
    ('Pastries & Breads', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600', ARRAY['Croissants', 'Sourdough', 'Danish']),
    ('Artisanal Cakes', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', ARRAY['Layer Cakes', 'Cheesecakes', 'Tarts']),
    ('Gourmet Cookies', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600', ARRAY['Stuffed Cookies', 'Classic Bakes', 'Brownies']),
    ('Specialty Brews', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600', ARRAY['Cold Brews', 'Espresso', 'Matcha & Tea'])
ON CONFLICT (name) DO NOTHING;

-- Insert Initial Menu Items
INSERT INTO public.menu_items (name, category, subcategory, description, price, image_url, popular, available)
VALUES
    (
        'Twice-Baked Almond Croissant',
        'Pastries & Breads',
        'Croissants',
        'Flaky, buttery French croissant filled with velvety frangipane almond cream, topped with toasted sliced almonds and powdered sugar.',
        180.00,
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600',
        true,
        true
    ),
    (
        'Pain au Chocolat Valrhona',
        'Pastries & Breads',
        'Croissants',
        'Layers of laminated buttery pastry wrapped around two batons of intense 66% Valrhona dark chocolate.',
        195.00,
        'https://images.unsplash.com/photo-1623334044303-241021148842?w=600',
        true,
        true
    ),
    (
        'San Francisco Country Sourdough',
        'Pastries & Breads',
        'Sourdough',
        'Slow-fermented for 36 hours using our 8-year-old sourdough starter. Crispy blistered crust with a custardy, open crumb.',
        240.00,
        'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600',
        false,
        true
    ),
    (
        'Belgian Truffle Opera Cake',
        'Artisanal Cakes',
        'Layer Cakes',
        'Classic French gateau with almond sponge soaked in espresso syrup, layered with dark chocolate ganache and French coffee buttercream.',
        320.00,
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
        true,
        true
    ),
    (
        'Basque Burnt Cheesecake Slice',
        'Artisanal Cakes',
        'Cheesecakes',
        'Caramelized burnt exterior with a molten, creamy center made with Philadelphia cream cheese and Madagascar vanilla beans.',
        280.00,
        'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600',
        true,
        true
    ),
    (
        'Wild Blueberry Frangipane Tart',
        'Artisanal Cakes',
        'Tarts',
        'Crisp sable butter crust lined with rich almond cream and loaded with wild organic blueberries and lemon zest.',
        260.00,
        'https://images.unsplash.com/photo-1519869325930-281384150729?w=600',
        false,
        true
    ),
    (
        'Gooey Sea Salt Nutella Stuffed Cookie',
        'Gourmet Cookies',
        'Stuffed Cookies',
        'Giant 140g New York style cookie stuffed with molten Nutella, topped with Maldon flaky sea salt and toasted hazelnuts.',
        160.00,
        'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600',
        true,
        true
    ),
    (
        'Biscoff Caramel Crunch Brownie',
        'Gourmet Cookies',
        'Brownies',
        'Fudgy Dutch dark cocoa brownie swirled with Lotus Biscoff spread and topped with crushed caramelized speculoos cookies.',
        175.00,
        'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600',
        true,
        true
    ),
    (
        'Madagascar Vanilla Cold Brew',
        'Specialty Brews',
        'Cold Brews',
        'Single-origin Arabica beans steeped cold for 18 hours, infused with real Madagascar vanilla bean syrup and topped with sweet cream.',
        220.00,
        'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600',
        true,
        true
    ),
    (
        'Iced Ceremonial Uji Matcha Latte',
        'Specialty Brews',
        'Matcha & Tea',
        'First-harvest ceremonial grade matcha whisked to order and poured over chilled oat milk with a hint of agave.',
        250.00,
        'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600',
        false,
        true
    );
