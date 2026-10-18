import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
} from 'date-fns';
import { supabase } from '@/lib/supabase';

export type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days' | 'custom';

export interface DashboardStats {
  bakery_id: string;
  timezone: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
  payment_breakdown: {
    cash: number;
    upi: number;
    card: number;
  };
}

export interface TopProductItem {
  item_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface DateRangeBounds {
  startDate: string;
  endDate: string;
  label: string;
}

export function getDateRangeBounds(
  preset: DateRangePreset,
  customBounds?: { startDate: string; endDate: string; label?: string }
): DateRangeBounds {
  const now = new Date();

  if (preset === 'custom' && customBounds) {
    return {
      startDate: customBounds.startDate,
      endDate: customBounds.endDate,
      label: customBounds.label ?? 'Custom',
    };
  }

  switch (preset) {
    case 'today':
      return {
        startDate: startOfDay(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
        label: 'Today',
      };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday).toISOString(),
        endDate: endOfDay(yesterday).toISOString(),
        label: 'Yesterday',
      };
    }
    case 'this_week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), // Monday start
        endDate: endOfDay(now).toISOString(),
        label: 'This Week',
      };
    case 'this_month':
      return {
        startDate: startOfMonth(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
        label: 'This Month',
      };
    case 'last_30_days':
      return {
        startDate: startOfDay(subDays(now, 30)).toISOString(),
        endDate: endOfDay(now).toISOString(),
        label: 'Last 30 Days',
      };
    default:
      return {
        startDate: startOfDay(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
        label: 'Today',
      };
  }
}

export async function fetchDashboardStats(
  bakeryId: string,
  startDate: string,
  endDate: string
): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_bakery_id: bakeryId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error(error.message);
  }

  return data as DashboardStats;
}

export async function fetchTopProducts(
  bakeryId: string,
  startDate: string,
  endDate: string,
  limit = 5
): Promise<TopProductItem[]> {
  const { data, error } = await supabase.rpc('get_product_revenue', {
    p_bakery_id: bakeryId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
  });

  if (error) {
    console.error('Error fetching top products:', error);
    throw new Error(error.message);
  }

  const result = data as { top_products: TopProductItem[] };
  return result?.top_products ?? [];
}
