import React, { useEffect } from 'react';
import { Alert, View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import * as Network from 'expo-network';
import { WifiOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useSyncStore } from '@/stores/syncStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export function OfflineBanner() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { currentBakery } = useAuthStore();
  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const failedCount = useSyncStore((s) => s.failedCount);
  const failedOrders = useSyncStore((s) => s.failedOrders);
  const bakeryId = currentBakery?.id;

  const reviewFailedOrders = () => {
    if (failedOrders.length === 0) return;

    const details = failedOrders
      .map((order) => `${order.order_number}: ${order.sync_error ?? 'Unknown sync error'}`)
      .join('\n\n');

    Alert.alert(
      `${failedOrders.length} order${failedOrders.length === 1 ? '' : 's'} need${failedOrders.length === 1 ? 's' : ''} attention`,
      details,
      isOnline && !isSyncing
        ? [
            { text: 'Close', style: 'cancel' },
            {
              text: 'Retry now',
              onPress: () => {
                if (bakeryId) {
                  useSyncStore.getState().triggerSync(bakeryId, { retryFailed: true });
                }
              },
            },
          ]
        : [{ text: 'Close', style: 'cancel' }]
    );
  };

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

        // Failed orders wait for the cashier to review their error and choose retry.
        if (online && currentPending > 0 && !currentSyncing) {
          await useSyncStore.getState().triggerSync(bakeryId);
        }
      } catch {
        // A later polling cycle will retry the network check.
      }
    };

    checkAndSync();
    const interval = setInterval(() => {
      if (isMounted) checkAndSync();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bakeryId]);

  const hasFailures = failedCount > 0;
  const showFailure = hasFailures && !isSyncing;

  if (isOnline && pendingCount === 0 && !isSyncing && !hasFailures) {
    return null;
  }

  const title = !isOnline
    ? 'Offline Mode Active'
    : isSyncing
    ? 'Syncing offline orders to cloud...'
    : showFailure
    ? 'Offline order sync needs attention'
    : 'Connected • Offline Queue';

  const message = !isOnline
    ? `${pendingCount} pending • ${failedCount} failed order${failedCount === 1 ? '' : 's'} saved locally`
    : isSyncing
    ? `Uploading ${pendingCount} pending order${pendingCount === 1 ? '' : 's'}...`
    : showFailure
    ? `${failedCount} order${failedCount === 1 ? '' : 's'} could not sync. Review and retry.`
    : 'All offline orders up to date';

  const accent = !isOnline ? colors.accent : isSyncing ? colors.info : showFailure ? colors.danger : colors.primary;
  const textColor = !isOnline
    ? colors.accent
    : isSyncing
    ? colors.infoText
    : showFailure
    ? colors.dangerText
    : colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: !isOnline
            ? colors.surfaceSubtle
            : isSyncing
            ? colors.infoLight
            : showFailure
            ? colors.dangerLight
            : colors.primaryLight,
          borderColor: accent,
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
        ) : showFailure ? (
          <AlertCircle size={18} color={colors.danger} />
        ) : (
          <CheckCircle2 size={18} color={colors.primary} />
        )}

        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[typography.captionBold, { color: textColor, fontSize: 13 }]}>{title}</Text>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, marginTop: 1 }]}>{message}</Text>
        </View>
      </View>

      {showFailure && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review failed offline orders"
          onPress={reviewFailedOrders}
          style={({ pressed }) => [
            styles.reviewButton,
            {
              borderColor: colors.danger,
              backgroundColor: pressed ? colors.surfaceSubtle : 'transparent',
            },
          ]}
        >
          <RefreshCw size={14} color={colors.dangerText} />
          <Text style={[typography.captionBold, { color: colors.dangerText, marginLeft: 5, fontSize: 12 }]}>Review</Text>
        </Pressable>
      )}
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
  reviewButton: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    marginLeft: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
});
