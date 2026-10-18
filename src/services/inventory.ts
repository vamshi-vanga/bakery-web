import { supabase } from '@/lib/supabase';
import { MovementType, MenuItem } from '@/types/database';

export interface StockAdjustmentInput {
  bakeryId: string;
  menuItemId: string;
  quantityDelta: number;
  movementType: 'restock' | 'waste' | 'correction';
  note?: string;
}

export interface InventoryMovementRecord {
  id: string;
  bakery_id: string;
  menu_item_id: string;
  quantity_delta: number;
  movement_type: MovementType;
  reference_order_id: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  menu_items?: {
    name: string;
  } | null;
}

export interface InventoryOverviewStats {
  totalTracked: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface VoidOrderParams {
  bakeryId: string;
  orderId: string;
  reason: string;
  restoreStock?: boolean;
}

export async function adjustProductStock(input: StockAdjustmentInput): Promise<{
  previous_stock: number;
  new_stock: number;
}> {
  const { data, error } = await supabase.rpc('adjust_stock', {
    p_bakery_id: input.bakeryId,
    p_menu_item_id: input.menuItemId,
    p_quantity_delta: input.quantityDelta,
    p_movement_type: input.movementType,
    p_note: input.note?.trim() || null,
  });

  if (error) {
    console.error('Error adjusting stock:', error);
    throw new Error(error.message);
  }

  const result = data as {
    success: boolean;
    previous_stock: number;
    new_stock: number;
  };
  return result;
}

export async function fetchInventoryMovements(
  bakeryId: string,
  options?: { menuItemId?: string; limit?: number }
): Promise<InventoryMovementRecord[]> {
  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      menu_items (name)
    `)
    .eq('bakery_id', bakeryId)
    .order('created_at', { ascending: false });

  if (options?.menuItemId) {
    query = query.eq('menu_item_id', options.menuItemId);
  }

  const { data, error } = await query.limit(options?.limit ?? 50);

  if (error) {
    console.error('Error fetching inventory movements:', error);
    throw new Error(error.message);
  }

  return (data as InventoryMovementRecord[]) ?? [];
}

export function computeInventoryStats(products: MenuItem[]): InventoryOverviewStats {
  const tracked = products.filter((p) => p.track_inventory && !p.archived_at);
  const outOfStock = tracked.filter((p) => p.stock_quantity <= 0);
  const lowStock = tracked.filter(
    (p) =>
      p.low_stock_threshold !== null &&
      p.stock_quantity <= p.low_stock_threshold &&
      p.stock_quantity > 0
  );
  const inStock = tracked.filter(
    (p) =>
      p.stock_quantity > 0 &&
      (p.low_stock_threshold === null || p.stock_quantity > p.low_stock_threshold)
  );

  return {
    totalTracked: tracked.length,
    inStockCount: inStock.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
  };
}

export async function voidOrder(params: VoidOrderParams) {
  const { data, error } = await supabase.rpc('void_order', {
    p_bakery_id: params.bakeryId,
    p_order_id: params.orderId,
    p_reason: params.reason.trim(),
    p_restore_stock: params.restoreStock ?? true,
  });

  if (error) {
    console.error('Error voiding order:', error);
    throw new Error(error.message);
  }

  return data;
}
