import { create } from 'zustand';
import { isOnline, syncOfflineOrders, getOfflineOrderStats, SyncResult } from '@/services/syncService';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  lastSyncResult: SyncResult | null;
  setOnline: (online: boolean) => void;
  refreshStats: (bakeryId: string) => Promise<void>;
  triggerSync: (bakeryId: string) => Promise<SyncResult | null>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  syncedCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  lastSyncResult: null,

  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  refreshStats: async (bakeryId: string) => {
    try {
      const stats = await getOfflineOrderStats(bakeryId);
      set({
        pendingCount: stats.pendingCount,
        syncedCount: stats.syncedCount,
        failedCount: stats.failedCount,
      });
    } catch (err) {
      console.warn('Failed to refresh offline stats:', err);
    }
  },

  triggerSync: async (bakeryId: string) => {
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
      const result = await syncOfflineOrders(bakeryId);
      const stats = await getOfflineOrderStats(bakeryId);
      set({
        isSyncing: false,
        pendingCount: stats.pendingCount,
        syncedCount: stats.syncedCount,
        failedCount: stats.failedCount,
        lastSyncAt: new Date(),
        lastSyncResult: result,
      });
      return result;
    } catch (err) {
      console.error('Offline sync failed:', err);
      set({ isSyncing: false });
      return null;
    }
  },
}));
