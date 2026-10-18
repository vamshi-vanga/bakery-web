import * as Network from 'expo-network';
import { supabase } from '@/lib/supabase';
import {
  getPendingOfflineOrders,
  updateOfflineOrderStatus,
  getOfflineOrderStats,
  StoredOfflineOrder,
} from './offlineStorage';

export interface SyncResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  errors: { orderId: string; orderNumber: string; error: string }[];
}

/**
 * Check if the device currently has active internet connectivity.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && (state.isInternetReachable ?? true));
  } catch {
    return false;
  }
}

/**
 * Sync all pending offline orders to Supabase cloud.
 * Processes in FIFO order using each order's unique idempotency key.
 */
export async function syncOfflineOrders(bakeryId: string): Promise<SyncResult> {
  const result: SyncResult = {
    totalProcessed: 0,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const online = await isOnline();
  if (!online) {
    return result;
  }

  const pendingOrders = await getPendingOfflineOrders(bakeryId);
  if (pendingOrders.length === 0) {
    return result;
  }

  for (const order of pendingOrders) {
    result.totalProcessed++;
    await updateOfflineOrderStatus(order.id, 'syncing');

    try {
      const items = JSON.parse(order.items_json) as {
        menu_item_id: string;
        quantity: number;
      }[];

      const rpcItems = items.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
      }));

      const { data, error } = await supabase.rpc('create_order', {
        p_bakery_id: order.bakery_id,
        p_idempotency_key: order.idempotency_key,
        p_items: rpcItems,
        p_payment_method: order.payment_method,
        p_customer_name: order.customer_name ?? undefined,
        p_customer_phone: order.customer_phone ?? undefined,
        p_receipt_requested: Boolean(order.receipt_requested),
        p_override_insufficient_stock: Boolean(order.override_stock),
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.success) {
        await updateOfflineOrderStatus(order.id, 'synced', {
          serverOrderId: data.order.order_id,
          serverOrderNumber: data.order.order_number,
        });
        result.syncedCount++;
      } else if (data && data.requires_confirmation) {
        // Stock warning on server
        const errMsg = 'Insufficient stock on cloud inventory';
        await updateOfflineOrderStatus(order.id, 'failed', { error: errMsg });
        result.failedCount++;
        result.errors.push({
          orderId: order.id,
          orderNumber: order.order_number,
          error: errMsg,
        });
      } else {
        const errMsg = data?.error ?? 'Server rejected order creation';
        await updateOfflineOrderStatus(order.id, 'failed', { error: errMsg });
        result.failedCount++;
        result.errors.push({
          orderId: order.id,
          orderNumber: order.order_number,
          error: errMsg,
        });
      }
    } catch (err: any) {
      const errMsg = err.message ?? 'Network / sync error';
      await updateOfflineOrderStatus(order.id, 'failed', { error: errMsg });
      result.failedCount++;
      result.errors.push({
        orderId: order.id,
        orderNumber: order.order_number,
        error: errMsg,
      });
    }
  }

  return result;
}

export { getOfflineOrderStats, StoredOfflineOrder };
