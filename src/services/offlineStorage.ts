import * as SQLite from 'expo-sqlite';
import { MenuItem } from '@/types/database';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('bakery_offline.db');
  }
  return dbInstance;
}

/**
 * Initialize local SQLite tables for offline products and queued orders.
 */
export async function initOfflineDatabase(): Promise<void> {
  const db = getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS cached_products (
      id TEXT PRIMARY KEY NOT NULL,
      bakery_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      track_inventory INTEGER NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER,
      cached_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cached_products_bakery ON cached_products(bakery_id);

    CREATE TABLE IF NOT EXISTS offline_order_queue (
      id TEXT PRIMARY KEY NOT NULL,
      bakery_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      order_number TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      receipt_requested INTEGER NOT NULL DEFAULT 0,
      override_stock INTEGER NOT NULL DEFAULT 0,
      items_json TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_error TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      server_order_id TEXT,
      server_order_number TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_offline_orders_status ON offline_order_queue(sync_status);
    CREATE INDEX IF NOT EXISTS idx_offline_orders_bakery ON offline_order_queue(bakery_id);

    CREATE TABLE IF NOT EXISTS local_security_ledger (
      bakery_id TEXT PRIMARY KEY NOT NULL,
      subscription_plan TEXT NOT NULL,
      subscription_status TEXT NOT NULL,
      subscription_start TEXT,
      subscription_end TEXT,
      max_observed_timestamp INTEGER NOT NULL,
      accumulated_active_seconds INTEGER NOT NULL DEFAULT 0,
      last_heartbeat_timestamp INTEGER NOT NULL,
      clock_tampered INTEGER NOT NULL DEFAULT 0,
      ledger_signature TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Cache products locally in SQLite so POS catalog works 100% offline.
 */
export async function cacheProducts(bakeryId: string, products: MenuItem[]): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Clear existing cached products for this bakery and bulk insert
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_products WHERE bakery_id = ?', [bakeryId]);

    const statement = await db.prepareAsync(`
      INSERT OR REPLACE INTO cached_products (
        id, bakery_id, name, category, price, description,
        is_active, track_inventory, stock_quantity, low_stock_threshold, cached_at
      ) VALUES ($id, $bakery_id, $name, $category, $price, $description, $is_active, $track_inventory, $stock_quantity, $low_stock_threshold, $cached_at)
    `);

    try {
      for (const item of products) {
        await statement.executeAsync({
          $id: item.id,
          $bakery_id: bakeryId,
          $name: item.name,
          $category: item.category,
          $price: item.price,
          $description: item.description ?? null,
          $is_active: item.is_active ? 1 : 0,
          $track_inventory: item.track_inventory ? 1 : 0,
          $stock_quantity: item.stock_quantity,
          $low_stock_threshold: item.low_stock_threshold ?? null,
          $cached_at: now,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

/**
 * Retrieve cached products from SQLite when offline.
 */
export async function getCachedProducts(bakeryId: string): Promise<MenuItem[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM cached_products WHERE bakery_id = ? AND is_active = 1 ORDER BY category, name ASC',
    [bakeryId]
  );

  return rows.map((r) => ({
    id: r.id,
    bakery_id: r.bakery_id,
    name: r.name,
    category: r.category,
    price: r.price,
    description: r.description,
    is_active: Boolean(r.is_active),
    track_inventory: Boolean(r.track_inventory),
    stock_quantity: r.stock_quantity,
    low_stock_threshold: r.low_stock_threshold,
    archived_at: null,
    created_at: r.cached_at,
    updated_at: r.cached_at,
  }));
}

export interface OfflineOrderPayload {
  id: string;
  bakeryId: string;
  idempotencyKey: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  receiptRequested: boolean;
  overrideStock: boolean;
  items: {
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    product_name: string;
  }[];
}

export interface StoredOfflineOrder {
  id: string;
  bakery_id: string;
  idempotency_key: string;
  order_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string | null;
  receipt_requested: number;
  override_stock: number;
  items_json: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_error: string | null;
  created_at: string;
  synced_at: string | null;
  server_order_id: string | null;
  server_order_number: string | null;
}

/**
 * Save an order to local SQLite queue when network is unavailable.
 */
export async function queueOfflineOrder(payload: OfflineOrderPayload): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO offline_order_queue (
      id, bakery_id, idempotency_key, order_number, subtotal, discount, total,
      payment_method, customer_name, customer_phone, receipt_requested,
      override_stock, items_json, sync_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      payload.id,
      payload.bakeryId,
      payload.idempotencyKey,
      payload.orderNumber,
      payload.subtotal,
      payload.discount,
      payload.total,
      payload.paymentMethod,
      payload.customerName ?? null,
      payload.customerPhone ?? null,
      payload.receiptRequested ? 1 : 0,
      payload.overrideStock ? 1 : 0,
      JSON.stringify(payload.items),
      now,
    ]
  );
}

/**
 * Get orders that can be synced to the cloud. Failed orders require an
 * explicit retry so a repeated server-side rejection stays visible to staff.
 */
export async function getPendingOfflineOrders(
  bakeryId: string,
  includeFailed = false
): Promise<StoredOfflineOrder[]> {
  const db = getDatabase();
  const statuses = includeFailed ? "('pending', 'failed')" : "('pending')";
  return db.getAllAsync<StoredOfflineOrder>(
    `SELECT * FROM offline_order_queue 
     WHERE bakery_id = ? AND sync_status IN ${statuses}
     ORDER BY created_at ASC`,
    [bakeryId]
  );
}

export interface FailedOfflineOrder {
  id: string;
  order_number: string;
  sync_error: string | null;
}

/** Orders that need a cashier to review and retry. */
export async function getFailedOfflineOrders(bakeryId: string): Promise<FailedOfflineOrder[]> {
  const db = getDatabase();
  return db.getAllAsync<FailedOfflineOrder>(
    `SELECT id, order_number, sync_error
     FROM offline_order_queue
     WHERE bakery_id = ? AND sync_status = 'failed'
     ORDER BY created_at ASC`,
    [bakeryId]
  );
}

/**
 * Update the sync status of an offline order.
 */
export async function updateOfflineOrderStatus(
  id: string,
  status: 'syncing' | 'synced' | 'failed',
  details?: {
    serverOrderId?: string;
    serverOrderNumber?: string;
    error?: string;
  }
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (status === 'synced') {
    await db.runAsync(
      `UPDATE offline_order_queue 
       SET sync_status = 'synced',
           synced_at = ?,
           server_order_id = ?,
           server_order_number = ?,
           sync_error = NULL
       WHERE id = ?`,
      [now, details?.serverOrderId ?? null, details?.serverOrderNumber ?? null, id]
    );
  } else if (status === 'failed') {
    await db.runAsync(
      `UPDATE offline_order_queue 
       SET sync_status = 'failed',
           sync_error = ?
       WHERE id = ?`,
      [details?.error ?? 'Unknown error', id]
    );
  } else {
    await db.runAsync(
      `UPDATE offline_order_queue 
       SET sync_status = 'syncing'
       WHERE id = ?`,
      [id]
    );
  }
}

/**
 * Get summary stats for offline orders.
 */
export async function getOfflineOrderStats(bakeryId: string): Promise<{
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
}> {
  const db = getDatabase();

  const rows = await db.getAllAsync<{ sync_status: string; count: number }>(
    `SELECT sync_status, COUNT(*) as count 
     FROM offline_order_queue 
     WHERE bakery_id = ? 
     GROUP BY sync_status`,
    [bakeryId]
  );

  let pendingCount = 0;
  let syncedCount = 0;
  let failedCount = 0;

  for (const r of rows) {
    if (r.sync_status === 'pending' || r.sync_status === 'syncing') {
      pendingCount += r.count;
    } else if (r.sync_status === 'synced') {
      syncedCount += r.count;
    } else if (r.sync_status === 'failed') {
      failedCount += r.count;
    }
  }

  return { pendingCount, syncedCount, failedCount };
}

/**
 * Completely wipe all local SQLite data upon account deletion or factory reset.
 */
export async function purgeAllLocalOfflineData(): Promise<void> {
  const db = getDatabase();
  await db.execAsync(`
    DELETE FROM cached_products;
    DELETE FROM offline_order_queue;
    DELETE FROM local_security_ledger;
  `);
}

