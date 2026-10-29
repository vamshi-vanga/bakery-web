export interface Category {
  id: string;
  name: string;
  image_url: string | null;
  subcategories: string[];
  created_at: string;
}

export interface SizeVariant {
  size: string; // e.g. "500g", "1 kg", "1.5 kg", "2 kg", "3 kg"
  price: number;
  is_default?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  description: string;
  price: number;
  image_url: string;
  popular: boolean;
  available: boolean;
  branch_id?: string | null;
  stock_quantity?: number;
  daily_baked?: number;
  sold_today?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  pricing_type?: 'quantity' | 'weight';
  size_variants?: SizeVariant[];
  created_at?: string;
}

// Alias MenuItem to Dish for backwards compatibility with customer frontend
export type MenuItem = Dish;

export interface CartItem extends MenuItem {
  quantity: number;
  selected_size?: string;
}

export interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  selected_size?: string;
}

export interface LedgerEntry {
  id: string;
  order_id?: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string | null;
  table_number?: string | null;
  order_type?: 'customer' | 'dine_in' | 'takeaway' | 'delivery' | 'pos';
  payment_method?: 'cash' | 'upi' | 'card' | 'online';
  branch_id?: string | null;
  branch_name?: string | null;
  created_at: string;
}

export type Order = LedgerEntry;

export interface Branch {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  status?: 'active' | 'inactive' | 'maintenance';
  created_at?: string;
}

export interface Table {
  id: string;
  table_number: string;
  capacity: number;
  section: string;
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  branch_id?: string | null;
  active_order_id?: string | null;
  created_at?: string;
}

export interface StaffAttendance {
  id: string;
  staff_name: string;
  role: string;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  shift: 'Morning' | 'Evening' | 'Night' | 'Full Day';
  clock_in?: string | null;
  clock_out?: string | null;
  date?: string;
  branch_id?: string | null;
  created_at?: string;
}

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment?: string | null;
  item_mentions?: string[];
  order_id?: string | null;
  branch_id?: string | null;
  created_at?: string;
}

export interface SystemSettings {
  id?: string;
  brand_name: string;
  currency: string;
  tax_percent: number;
  allow_branch_menu_management: boolean;
  active_theme: string;
  theme_mode: string;
  inventory_tracking_enabled?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  min_threshold: number;
  cost_per_unit: number;
  supplier?: string | null;
  last_restocked?: string;
  created_at?: string;
}

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type NoteColor = 'amber' | 'rose' | 'emerald' | 'sky' | 'indigo' | 'slate' | 'violet';

export interface BakeryNote {
  id: string;
  title?: string | null;
  content: string;
  color: NoteColor;
  is_pinned: boolean;
  target_date?: string | null;
  tags?: string[];
  checklist?: NoteChecklistItem[];
  created_at?: string;
  updated_at?: string;
}
