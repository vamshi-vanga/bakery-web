# 🥐 Sample Cloud Bakery / Cloud Kitchen

A modern, high-aesthetic web application designed specifically for **cloud bakeries** and **premium artisanal bakeries**. Built with **Next.js 15 (App Router)**, **Tailwind CSS v4**, and **Supabase (PostgreSQL, Row Level Security & Storage)**.

---

## ✨ Features

### 🛍️ Customer Experience
- **Artisanal Design System**: Custom pastry-inspired palette (`cream`, `espresso`, `caramel`, `rose-gold`, `mocha`, `latte`), Playfair Display serif headings, smooth glassmorphism, and micro-interactions.
- **Dynamic Category & Search Filtering**: Filter by categories (Pastries, Artisanal Cakes, Gourmet Cookies, Specialty Brews) and live fuzzy search.
- **Detailed Dish Modal**: Click any item to view high-resolution photography, detailed flavor profiles, dietary labels, and pricing.
- **Seamless Cart & Checkout**: Slide-over cart drawer, clear size selection, and a required human-confirmation checkbox.
- **Dual Checkout Pipeline**:
  - **Customer order requests**: Saves orders through the server to your Supabase `orders` table.
  - **WhatsApp order alerts**: Sends a configured Meta WhatsApp Cloud API template to the bakery; otherwise checkout offers a ready-to-send WhatsApp message.
- **Built-in Fallback**: Beautiful curated fallback menu renders immediately even before Supabase is connected.

### 🧑‍🍳 Cloud Bakery Admin Dashboard (`/admin`)
- **Secure PIN Access**: Guarded by `NEXT_PUBLIC_ADMIN_PIN` (default: `779911`).
- **Real-Time Analytics Overview**:
  - Today's revenue & order counter
  - Average Order Value (AOV)
  - Pending orders requiring attention
  - Total active menu catalog count
  - Recent incoming orders table
- **Complete Menu Item Management**:
  - Add, edit, and delete bakery items
  - Live availability toggle (turn items on/off when sold out)
  - "Popular / Chef's Pick" badge toggle
  - Direct image upload to Supabase Storage (`bakery-assets` bucket)
- **Category & Subcategory Management**:
  - Create and reorder categories
  - Tag subcategories (e.g. Sourdough, Croissants, Brownies)
  - Category cover photo upload
- **Live Order Fulfillment Workflow**:
  - New-order notification bell with live updates and a refresh fallback
  - Order status pipelines: `Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed` / `Cancelled`
  - Customer contact details & delivery notes
  - One-click status advancement
- **Sales & Daily Revenue Reports**:
  - Aggregate metrics across all sales
  - Top-selling item breakdown

---

## 🚀 Quick Setup with Supabase

### 1. Database & Storage Initialization
1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Create a new project or open an existing one.
3. In the left navigation, click **SQL Editor**.
4. Open [`supabase_schema.sql`](./supabase_schema.sql) in this directory, copy its entire contents, paste it into the Supabase SQL Editor, and click **Run**.
   - This sets up:
     - `categories` table
     - `menu_items` table
     - `orders` table
     - `settings` table for the bakery profile and dispatch contact
     - `bakery-assets` storage bucket with public read access
     - Row Level Security (RLS) policies
     - Starter seed data with delicious artisanal items!

If the database is already set up, run [`supabase_notifications_migration.sql`](./supabase_notifications_migration.sql) once to add the settings and order fields used by the WhatsApp and notification features.

### 2. Configure Environment Variables
Edit [`.env.local`](./.env.local) in this directory with your Supabase credentials:

```bash
# Supabase Configuration (from Supabase Dashboard > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key

# Admin PIN for /admin dashboard access
NEXT_PUBLIC_ADMIN_PIN=779911

# Cloud Bakery WhatsApp Number (with country code, no '+')
NEXT_PUBLIC_WHATSAPP_NUMBER=YOUR_COUNTRY_CODE_AND_NUMBER

# Optional automatic order alerts via Meta WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ORDER_TEMPLATE_NAME=sample_bakery_new_order
WHATSAPP_ORDER_TEMPLATE_LANGUAGE=en
WHATSAPP_GRAPH_API_VERSION=v22.0
```

For automatic WhatsApp delivery, create and get approval for a WhatsApp message template with one body placeholder, for example `Sample Bakery received a new order. Details: {{1}}`, then add its name and language above. Keep the access token server-side. If these settings are missing or delivery fails, the order is still saved and the customer can open a prefilled WhatsApp message to send manually. The admin can set the bakery’s WhatsApp number under **Settings → WhatsApp**.

The schema script adds `public.orders` to Supabase Realtime when that publication is available. The admin also has a server-side event-stream fallback that checks for new order IDs, so new orders remain visible if the table was not added to the publication.

### 3. Start Development Server
```bash
npm run dev
```

Visit:
- **Customer Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) (PIN: `779911`)

---

## 📁 Project Architecture

```
bakery website sample/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx         # Comprehensive Cloud Bakery Admin Dashboard
│   │   ├── api/
│   │   │   ├── categories/      # Category REST APIs (GET, POST, PUT, DELETE)
│   │   │   ├── menu/            # Menu REST APIs (GET, POST, PUT, DELETE)
│   │   │   ├── orders/          # Orders REST APIs (Customer POST, Admin GET/PUT)
│   │   │   └── upload/          # Direct file upload to Supabase Storage
│   │   ├── globals.css          # Tailwind CSS v4 design tokens & keyframes
│   │   ├── layout.tsx           # Root Layout with metadata & font imports
│   │   └── page.tsx             # Main storefront composing all sections
│   ├── components/
│   │   ├── Navbar.tsx           # Floating glassmorphic header with cart badge
│   │   ├── Hero.tsx             # Brand hero with CTA buttons & ratings
│   │   ├── MenuSection.tsx      # Filterable menu grid with category pills & search
│   │   ├── DishCard.tsx         # Artisanal dish card with hover animations
│   │   ├── ItemDetailModal.tsx  # Detailed dish inspection modal
│   │   ├── CartDrawer.tsx       # Slide-over cart with WhatsApp checkout
│   │   ├── AboutSection.tsx     # Cloud bakery story & value propositions
│   │   ├── LocationSection.tsx  # Cloud kitchen contact & pickup hours
│   │   └── Footer.tsx           # Brand footer with links and admin portal access
│   ├── context/
│   │   └── CartContext.tsx      # Global cart state management with localStorage
│   ├── data/
│   │   └── mockMenu.ts          # Curated starter menu data & fallback
│   └── lib/
│       ├── supabase.ts          # Client-side Supabase client (anon key)
│       ├── supabase-admin.ts    # Server-side Supabase client (service role)
│       ├── types.ts             # TypeScript definitions matching DB schema
│       └── utils.ts             # Tailwind class merging utility
├── supabase_schema.sql          # 1-Click database & storage setup script
└── package.json
```
