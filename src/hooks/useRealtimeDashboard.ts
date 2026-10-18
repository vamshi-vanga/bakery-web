import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchDashboardStats,
  fetchTopProducts,
  DashboardStats,
  TopProductItem,
  DateRangeBounds,
} from '@/services/reporting';

interface UseRealtimeDashboardReturn {
  stats: DashboardStats | null;
  topProducts: TopProductItem[];
  loading: boolean;
  refreshing: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useRealtimeDashboard(
  bakeryId: string | undefined,
  dateRange: DateRangeBounds
): UseRealtimeDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!bakeryId) return;

    try {
      const [statsData, productsData] = await Promise.all([
        fetchDashboardStats(bakeryId, dateRange.startDate, dateRange.endDate),
        fetchTopProducts(bakeryId, dateRange.startDate, dateRange.endDate, 5),
      ]);

      setStats(statsData);
      setTopProducts(productsData);
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bakeryId, dateRange.startDate, dateRange.endDate]);

  // Initial and range-change fetch
  useEffect(() => {
    let ignore = false;
    if (!bakeryId) return;

    Promise.all([
      fetchDashboardStats(bakeryId, dateRange.startDate, dateRange.endDate),
      fetchTopProducts(bakeryId, dateRange.startDate, dateRange.endDate, 5),
    ])
      .then(([statsData, productsData]) => {
        if (!ignore) {
          setStats(statsData);
          setTopProducts(productsData);
          setLastUpdated(new Date());
          setIsStale(false);
          setLoading(false);
          setRefreshing(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [bakeryId, dateRange.startDate, dateRange.endDate]);

  // Realtime subscription setup
  useEffect(() => {
    if (!bakeryId) return;

    const channel = supabase
      .channel(`realtime_dashboard_orders_${bakeryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `bakery_id=eq.${bakeryId}`,
        },
        () => {
          // Key design decision: Realtime is a trigger, NOT a data source.
          // We re-query the authoritative get_dashboard_stats RPC rather than incrementing locally.
          loadData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsReconnecting(false);
          setIsStale(false);
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setIsReconnecting(true);

          // If disconnected for > 10 seconds, flag data as potentially stale
          if (!disconnectTimerRef.current) {
            disconnectTimerRef.current = setTimeout(() => {
              setIsStale(true);
            }, 10000);
          }
        }
      });

    return () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [bakeryId, loadData]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  return {
    stats,
    topProducts,
    loading,
    refreshing,
    isConnected,
    isReconnecting,
    isStale,
    lastUpdated,
    refresh,
  };
}
