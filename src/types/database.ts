export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'owner' | 'cashier' | 'baker';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type OrderStatus = 'paid' | 'voided';
export type WhatsAppStatus =
  | 'not_requested'
  | 'pending'
  | 'accepted'
  | 'delivered'
  | 'failed'
  | 'manual';
export type MovementType =
  | 'sale'
  | 'restock'
  | 'waste'
  | 'correction'
  | 'void_restoration';

export type SubscriptionPlan = 'trial' | 'eight_months' | 'one_year';
export type SubscriptionStatus = 'none' | 'pending_approval' | 'active' | 'expired';
export type BakeryScale = 'small' | 'medium' | 'large';

export interface Bakery {
  id: string;
  name: string;
  owner_id: string;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  scale?: BakeryScale | null;
  subscription_plan?: SubscriptionPlan | null;
  subscription_status?: SubscriptionStatus | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BakeryMembership {
  id: string;
  bakery_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  bakery_id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  is_active: boolean;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  bakery_id: string;
  order_number: string;
  idempotency_key: string;
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  receipt_requested: boolean;
  whatsapp_status: WhatsAppStatus;
  whatsapp_message_id: string | null;
  created_by: string;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  offline_order_id?: string | null;
  offline_order_number?: string | null;
  synced_at?: string | null;
  order_items?: OrderItem[];
}

export interface InventoryMovement {
  id: string;
  bakery_id: string;
  menu_item_id: string;
  quantity_delta: number;
  movement_type: MovementType;
  reference_order_id: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface SetupBakeryParams {
  p_bakery_name: string;
  p_phone?: string;
  p_address?: string;
  p_currency?: string;
  p_timezone?: string;
}

export interface SetupBakeryResult {
  success: boolean;
  bakery_id: string;
  name: string;
  currency: string;
  timezone: string;
  role: UserRole;
}
