# Artisan Bakery Management System 🥖🥐

A production-quality Android & cross-platform bakery point-of-sale (POS), real-time revenue analytics, audited inventory management, and digital receipt delivery system.

Built with **Expo SDK 58**, **React 19**, **React Native 0.88**, **Expo Router**, and **Supabase (PostgreSQL 15+)**.

---

## Architecture Highlights

1. **Security & Multi-Tenant Isolation**:
   - Strict tenant isolation enforced via `bakery_memberships` and private schema helper functions (`bakery_private.user_belongs_to_bakery()`, `bakery_private.get_user_bakery_id()`).
   - Column-level permission hardening: direct client writes on `orders`, `order_items`, and `inventory_movements` are revoked. Direct `UPDATE` of `menu_items.stock_quantity` is prohibited.

2. **Atomic POS Order Processing (`create_order` RPC)**:
   - 14-step ACID database transaction.
   - `pg_advisory_xact_lock` for concurrent idempotency key protection.
   - Deterministic row locking (`SELECT ... FOR UPDATE ORDER BY id`) preventing deadlocks.
   - Stock deduction and warning classification (`requires_confirmation`).
   - Foreign-key consistency: parent `orders` row inserted prior to child `order_items` and `inventory_movements`.

3. **Realtime Non-Additive Dashboard Sync**:
   - Selective Supabase Realtime publication on `orders`.
   - Never increments locally (prevents double-counting); automatically re-queries authoritative PostgreSQL aggregation RPC (`get_bakery_analytics`).

4. **Digital Receipts & WhatsApp Delivery**:
   - Phase 5a: Native device-assisted delivery (`Linking.openURL` / `whatsapp://` and `https://wa.me/`).
   - Phase 5b: Meta WhatsApp Cloud API Edge Function with webhook delivery tracking (6-state lifecycle).

5. **Offline-First POS & Local SQLite Storage (`expo-sqlite`)**:
   - Zero-downtime counter sales when internet drops or network latency is high.
   - Products catalog cached locally in SQLite (`cached_products`).
   - Orders saved immediately to local SQLite queue (`offline_order_queue`) with local order numbers.
   - Automatic background sync on reconnect: drains queue in FIFO order to Supabase `create_order` using unique idempotency keys.
   - Live visual status badge (`OfflineBanner`) in POS and Settings screen.

6. **Over-The-Air (OTA) Instant Updates (`expo-updates` / EAS Update)**:
   - Ship new features, bug fixes, or catalog adjustments directly to installed APKs over the air.
   - No need to recompile or redistribute the APK binary to the bakery owner.
   - Settings Screen interface includes a manual **"Check for Updates"** and **"Download & Install Update"** button that hot-reloads the application bundle.

7. **Android Hardening & Design System**:
   - Warm artisan palette (crust amber, terracotta, flour/cream stone, rich espresso dark mode).
   - Android hardware back button handling (`BackHandler` and `onRequestClose`) across all modal dialogs.
   - 20/20 `expo-doctor` check conformance.

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- Supabase account or local Supabase CLI

### 2. Environment Setup
Copy the example environment file and provide your Supabase project credentials:
```bash
cp .env.example .env
```
Fill in `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Migrations
Apply the migrations in `supabase/migrations/` in sequential order to your Supabase project:
1. `001_initial_schema.sql` — Core tables, constraints, RLS policies, and private helper functions.
2. `002_permissions_and_grants.sql` — Privilege hardening & column-level restrictions.
3. `003_setup_bakery_rpc.sql` — Onboarding RPC (`setup_bakery`).
4. `004_create_product_rpc.sql` — Audited product creation RPC (`create_product`).
5. `005_create_order_rpc.sql` — Atomic POS checkout RPC (`create_order`).
6. `006_reporting_rpc.sql` — Server-side revenue analytics RPC (`get_bakery_analytics`).
7. `007_realtime_publication.sql` — Supabase Realtime publication setup.

### 4. Running the App
Install dependencies:
```bash
npm install
```

Start the Expo development server:
```bash
npx expo start
```
- Press `a` to run on Android emulator or connected device.
- Scan the QR code using Expo Go on Android or iOS.

---

## Quality Verification Commands

Before creating releases or deployment builds, run the verification suite:

```bash
# Typecheck
npx tsc --noEmit

# Lint check
npx eslint .

# Expo compatibility & configuration diagnostics
npx expo-doctor
```

---

## App Screens & Features

- **Auth & Onboarding** (`src/app/(auth)/`):
  - Login, sign up, and bakery profile creation.
- **POS Billing Counter** (`src/app/(main)/new-order/`):
  - Category filters, real-time search, cart state management, cash tender change calculator, and insufficient stock confirmation override.
- **Product Management** (`src/app/(main)/products/`):
  - Product catalog, category filtering, add/edit products, stock threshold indicators, and archive operations.
- **Live Revenue Dashboard** (`src/app/(main)/dashboard/`):
  - Gross sales, net revenue, order volume, average ticket size, payment breakdown (Cash, Card, UPI), top-selling products, and realtime connection status.
- **Inventory Auditing** (`src/app/(main)/inventory/`):
  - Stock level KPIs (Total Tracked, Low Stock, Stockout), restock/waste/correction adjustment modal, and full movement history audit trail.
- **Order History & Receipts** (`src/app/(main)/orders/`):
  - Invoice history, order voiding with inventory restoration, and WhatsApp digital receipt sharing.
