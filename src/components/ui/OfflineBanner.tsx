import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Network from 'expo-network';
import { WifiOff, CheckCircle2 } from 'lucide-react-native';
import { useSyncStore } from '@/stores/syncStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export function OfflineBanner() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { currentBakery } = useAuthStore();
  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);

  const bakeryId = currentBakery?.id;

  // Listen to network state and auto-sync offline queue silently without re-render thrashing
  useEffect(() => {
    if (!bakeryId) return;

    let isMounted = true;

    const checkAndSync = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = Boolean(state.isConnected && (state.isInternetReachable ?? true));

        const store = useSyncStore.getState();
        if (store.isOnline !== online) {
          store.setOnline(online);
        }

        await store.refreshStats(bakeryId);

        const currentPending = useSyncStore.getState().pendingCount;
        const currentSyncing = useSyncStore.getState().isSyncing;

        // ONLY trigger sync if we have actual pending offline orders and aren't already syncing
        if (online && currentPending > 0 && !currentSyncing) {
          await useSyncStore.getState().triggerSync(bakeryId);
        }
      } catch {
        // Ignore network check errors
      }
    };

    // Initial check
    checkAndSync();

    // Check periodically for network restoration without resetting on store updates
    const interval = setInterval(() => {
      if (isMounted) {
        checkAndSync();
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bakeryId]);

  // If online and no pending orders, keep UI completely clean without any banner or flicker
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: !isOnline
            ? colors.surfaceSubtle
            : isSyncing
            ? colors.infoLight
            : colors.primaryLight,
          borderColor: !isOnline
            ? colors.accent
            : isSyncing
            ? colors.info
            : colors.primary,
          marginHorizontal: spacing.lg,
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
          borderRadius: borderRadius.lg,
          paddingVertical: 10,
          paddingHorizontal: 14,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {!isOnline ? (
          <WifiOff size={18} color={colors.accent} />
        ) : isSyncing ? (
          <ActivityIndicator size="small" color={colors.info} />
        ) : (
          <CheckCircle2 size={18} color={colors.primary} />
        )}

        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={[
              typography.captionBold,
              {
                color: !isOnline
                  ? colors.accent
                  : isSyncing
                  ? colors.infoText
                  : colors.primary,
                fontSize: 13,
              },
            ]}
          >
            {!isOnline
              ? 'Offline Mode Active'
              : isSyncing
              ? 'Syncing offline orders to cloud...'
              : 'Connected • Offline Queue'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, marginTop: 1 }]}>
            {!isOnline
              ? `${pendingCount} order${pendingCount === 1 ? '' : 's'} saved locally (auto-syncs when online)`
              : isSyncing
              ? `Uploading ${pendingCount} pending order${pendingCount === 1 ? '' : 's'}...`
              : 'All offline orders up to date'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
});
