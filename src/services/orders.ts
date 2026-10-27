import { supabase } from '@/lib/supabase';
import { PaymentMethod } from '@/types/database';
import { isOnline } from './syncService';
import { queueOfflineOrder } from './offlineStorage';
import { assertSubscriptionActive } from './securityService';

export interface CreateOrderParams {
  bakeryId: string;
  items: { menu_item_id: string; quantity: number; unit_price?: number; product_name?: string }[];
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  receiptRequested?: boolean;
  overrideInsufficientStock?: boolean;
}

export interface CommittedOrderDetails {
  order_id: string;
  order_number: string;
  total: number;
  status: string;
  payment_method: PaymentMethod;
  created_at: string;
  is_offline?: boolean;
  items: {
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  stock_warnings?: {
    menu_item_id: string;
    item_name: string;
    requested_quantity: number;
    available_stock: number;
  }[] | null;
}

export interface InsufficientStockItem {
  menu_item_id: string;
  item_name: string;
  requested_quantity: number;
  available_stock: number;
}

export type CreateOrderResponse =
  | {
      success: true;
      duplicate: boolean;
      is_offline?: boolean;
      order: CommittedOrderDetails;
    }
  | {
      success: false;
      duplicate: false;
      requires_confirmation: true;
      reason: 'INSUFFICIENT_STOCK';
      insufficient_items: InsufficientStockItem[];
    };

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function submitOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
  // Enterprise Anti-Bypass Guard: Verify subscription validity and check for clock rollback
  await assertSubscriptionActive(params.bakeryId);

  const idempotencyKey = generateUUID();
  const online = await isOnline();

  // If online, attempt authoritative server RPC
  if (online) {
    try {
      const rpcItems = params.items.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
      }));

      const { data, error } = await supabase.rpc('create_order', {
        p_bakery_id: params.bakeryId,
        p_idempotency_key: idempotencyKey,
        p_payment_method: params.paymentMethod,
        p_items: rpcItems,
        p_customer_name: params.customerName?.trim() || null,
        p_customer_phone: params.customerPhone?.trim() || null,
        p_receipt_requested: params.receiptRequested ?? false,
        p_override_insufficient_stock: params.overrideInsufficientStock ?? false,
      });

      if (error) {
        // If it's a server constraint error (not network), throw it
        if (!error.message.toLowerCase().includes('fetch') && !error.message.toLowerCase().includes('network')) {
          console.error('Error submitting order to Supabase:', error);
          throw new Error(error.message);
        }
        // If network dropped mid-call, fall through to offline queue
      } else if (data) {
        return data as CreateOrderResponse;
      }
    } catch (err: any) {
      // If error is business logic (e.g. invalid params), propagate
      if (err.message && !err.message.toLowerCase().includes('network') && !err.message.toLowerCase().includes('fetch')) {
        throw err;
      }
      console.warn('Network failed during order submission, queuing to local SQLite:', err);
    }
  }

  // --- Offline Mode: Queue in local SQLite ---
  const localOrderId = generateUUID();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const offlineOrderNumber = `ORD-${hh}${mm}-${ss}`;
  
  let computedTotal = 0;
  const itemsSnapshot = params.items.map((i) => {
    const price = i.unit_price ?? 0;
    const lineTotal = price * i.quantity;
    computedTotal += lineTotal;
    return {
      menu_item_id: i.menu_item_id,
      quantity: i.quantity,
      unit_price: price,
      product_name: i.product_name ?? 'Bakery Item',
    };
  });

  await queueOfflineOrder({
    id: localOrderId,
    bakeryId: params.bakeryId,
    idempotencyKey,
    orderNumber: offlineOrderNumber,
    subtotal: computedTotal,
    discount: 0,
    total: computedTotal,
    paymentMethod: params.paymentMethod,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    receiptRequested: params.receiptRequested ?? false,
    overrideStock: params.overrideInsufficientStock ?? false,
    items: itemsSnapshot,
  });

  return {
    success: true,
    duplicate: false,
    is_offline: true,
    order: {
      order_id: localOrderId,
      order_number: offlineOrderNumber,
      total: computedTotal,
      status: 'completed',
      payment_method: params.paymentMethod,
      created_at: new Date().toISOString(),
      is_offline: true,
      items: itemsSnapshot.map((i) => ({
        item_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.unit_price * i.quantity,
      })),
      stock_warnings: null,
    },
  };
}

export async function fetchRecentOrders(
  bakeryId: string,
  limit = 100,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('bakery_id', bakeryId)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching recent orders:', error);
    throw new Error(error.message);
  }

  return data ?? [];
}
