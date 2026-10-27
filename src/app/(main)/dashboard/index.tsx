import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { DateRangePreset, getDateRangeBounds } from '@/services/reporting';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { ConnectionStatusBadge } from '@/components/dashboard/ConnectionStatusBadge';
import { RevenueMetricCard } from '@/components/dashboard/RevenueMetricCard';
import { PaymentBreakdownCard } from '@/components/dashboard/PaymentBreakdownCard';
import { TopProductsList } from '@/components/dashboard/TopProductsList';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import { CustomDateModal } from '@/components/dashboard/CustomDateModal';
import { HeaderProfileButton } from '@/components/profile/HeaderProfileButton';
import { HeaderNotesButton } from '@/components/notes/HeaderNotesButton';
import { haptic } from '@/utils/haptics';

export default function DashboardScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';

  const [preset, setPreset] = useState<DateRangePreset>('today');
  const [customBounds, setCustomBounds] = useState<{
    startDate: string;
    endDate: string;
    label: string;
  } | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const dateRange = useMemo(() => {
    return getDateRangeBounds(preset, customBounds ?? undefined);
  }, [preset, customBounds]);

  const {
    stats,
    topProducts,
    loading,
    refreshing,
    isConnected,
    isReconnecting,
    isStale,
    refresh,
  } = useRealtimeDashboard(currentBakery?.id, dateRange);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Top Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[typography.h2, { color: colors.text }]}>Revenue Analytics</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {currentBakery?.name ?? 'Bakery'} • {currentBakery?.timezone ?? 'Asia/Kolkata'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ConnectionStatusBadge
              isConnected={isConnected}
              isReconnecting={isReconnecting}
            />
            <HeaderNotesButton />
            <HeaderProfileButton />
          </View>
        </View>

      {/* Stale Data Alert Banner (if disconnected > 10s) */}
      {isStale && (
        <TouchableOpacity
          onPress={() => refresh()}
          activeOpacity={0.8}
          style={[
            styles.staleBanner,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.accent,
              marginHorizontal: spacing.lg,
              marginTop: spacing.sm,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          <AlertCircle size={16} color={colors.accent} />
          <Text
            style={[
              typography.captionBold,
              { color: colors.accent, marginLeft: 6, flex: 1 },
            ]}
          >
            Live sync is disconnected. Tap or pull down to refresh.
          </Text>
          <RefreshCw size={14} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* Date Range Selector */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <DateRangeSelector
          selectedPreset={preset}
          customLabel={preset === 'custom' && customBounds ? customBounds.label : undefined}
          onSelectPreset={(newPreset) => {
            haptic.selection();
            setPreset(newPreset);
          }}
          onOpenCustom={() => {
            setShowCustomModal(true);
          }}
        />
      </View>

      {/* Dashboard Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
              Calculating financial metrics...
            </Text>
          </View>
        ) : (
          <>
            {/* KPI 1: Total Revenue */}
            <RevenueMetricCard
              title={`${dateRange.label.toUpperCase()} REVENUE`}
              value={`${currency} ${(stats?.total_revenue ?? 0).toFixed(2)}`}
              subtitle="Authoritative server aggregate"
              icon={<TrendingUp size={24} color={colors.primary} />}
              iconBgColor={colors.primaryLight}
            />

            {/* KPI 2 & 3: Total Orders & Average Ticket */}
            <View style={[styles.kpiRow, { marginTop: spacing.md }]}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <RevenueMetricCard
                  title="TOTAL ORDERS"
                  value={(stats?.order_count ?? 0).toString()}
                  subtitle="Completed sales"
                  icon={<ShoppingBag size={20} color={colors.accent} />}
                  iconBgColor={colors.accentLight}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RevenueMetricCard
                  title="AVG TICKET"
                  value={`${currency} ${(stats?.average_order_value ?? 0).toFixed(0)}`}
                  subtitle="Per transaction"
                  icon={<Receipt size={20} color={colors.info} />}
                  iconBgColor={colors.infoLight}
                />
              </View>
            </View>

            {/* Payment Method Distribution */}
            <View style={{ marginTop: spacing.md }}>
              <PaymentBreakdownCard
                currency={currency}
                totalRevenue={stats?.total_revenue ?? 0}
                cashRevenue={stats?.payment_breakdown?.cash ?? 0}
                upiRevenue={stats?.payment_breakdown?.upi ?? 0}
                cardRevenue={stats?.payment_breakdown?.card ?? 0}
              />
            </View>

            {/* Top Selling Products */}
            <View style={{ marginTop: spacing.md, marginBottom: 40 }}>
              <TopProductsList currency={currency} products={topProducts} />
            </View>
          </>
        )}
      </ScrollView>
      </View>

      <CustomDateModal
        visible={showCustomModal}
        initialStartDate={customBounds?.startDate}
        initialEndDate={customBounds?.endDate}
        onClose={() => setShowCustomModal(false)}
        onApply={(startIso, endIso, label) => {
          setCustomBounds({ startDate: startIso, endDate: endIso, label });
          setPreset('custom');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
  },
});
