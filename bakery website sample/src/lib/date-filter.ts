import { LedgerEntry } from '@/types';

export type DateRangeOption = 'today' | '7d' | '30d' | 'custom';

export function filterOrdersByDateRange(
  orders: LedgerEntry[],
  range: DateRangeOption,
  customStart?: string,
  customEnd?: string
): LedgerEntry[] {
  if (!orders || orders.length === 0) return [];

  const now = new Date();

  if (range === 'today') {
    // Start of today in local time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return orders.filter((o) => {
      const time = new Date(o.created_at).getTime();
      return time >= startOfToday;
    });
  }

  if (range === '7d') {
    // Past 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    return orders.filter((o) => {
      const time = new Date(o.created_at).getTime();
      return time >= sevenDaysAgo;
    });
  }

  if (range === '30d') {
    // Past 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
    return orders.filter((o) => {
      const time = new Date(o.created_at).getTime();
      return time >= thirtyDaysAgo;
    });
  }

  if (range === 'custom') {
    if (!customStart && !customEnd) return orders;
    const start = customStart ? new Date(customStart + 'T00:00:00').getTime() : 0;
    const end = customEnd ? new Date(customEnd + 'T23:59:59').getTime() : Infinity;
    return orders.filter((o) => {
      const time = new Date(o.created_at).getTime();
      return time >= start && time <= end;
    });
  }

  return orders;
}

export function getDateRangeLabel(
  range: DateRangeOption,
  customStart?: string,
  customEnd?: string
): string {
  switch (range) {
    case 'today':
      return "Today's Analysis";
    case '7d':
      return 'Last 7 Days';
    case '30d':
      return 'Last 30 Days';
    case 'custom':
      if (customStart && customEnd) {
        return `${customStart} to ${customEnd}`;
      }
      if (customStart) return `From ${customStart}`;
      if (customEnd) return `Until ${customEnd}`;
      return 'Custom Date Range';
    default:
      return 'All Dates';
  }
}
