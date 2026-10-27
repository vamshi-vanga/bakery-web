import { create } from 'zustand';
import {
  isOnline,
  syncOfflineOrders,
  getOfflineOrderStats,
  getFailedOfflineOrders,
  FailedOfflineOrder,
  SyncResult,
} from '@/services/syncService';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  failedOrders: FailedOfflineOrder[];
  lastSyncAt: Date | null;
  lastSyncResult: SyncResult | null;
  setOnline: (online: boolean) => void;
  refreshStats: (bakeryId: string) => Promise<void>;
  triggerSync: (bakeryId: string, options?: { retryFailed?: boolean }) => Promise<SyncResult | null>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  syncedCount: 0,
  failedCount: 0,
  failedOrders: [],
  lastSyncAt: null,
  lastSyncResult: null,

  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  refreshStats: async (bakeryId: string) => {
    try {
      const [stats, failedOrders] = await Promise.all([
        getOfflineOrderStats(bakeryId),
        getFailedOfflineOrders(bakeryId),
      ]);
      set({
        pendingCount: stats.pendingCount,
        syncedCount: stats.syncedCount,
        failedCount: stats.failedCount,
        failedOrders,
      });
    } catch (err) {
      console.warn('Failed to refresh offline stats:', err);
    }
  },

  triggerSync: async (bakeryId: string, options = {}) => {
    const { isSyncing } = get();
    if (isSyncing) return null;

    const online = await isOnline();
    set({ isOnline: online });

    if (!online) {
      await get().refreshStats(bakeryId);
      return null;
    }

    set({ isSyncing: true });
    try {
      const result = await syncOfflineOrders(bakeryId, options.retryFailed === true);
      const [stats, failedOrders] = await Promise.all([
        getOfflineOrderStats(bakeryId),
        getFailedOfflineOrders(bakeryId),
      ]);
      set({
        isSyncing: false,
        pendingCount: stats.pendingCount,
        syncedCount: stats.syncedCount,
        failedCount: stats.failedCount,
        failedOrders,
        lastSyncAt: new Date(),
        lastSyncResult: result,
      });
      return result;
    } catch (err) {
      console.error('Offline sync failed:', err);
      await get().refreshStats(bakeryId);
      set({ isSyncing: false });
      return null;
    }
  },
}));
