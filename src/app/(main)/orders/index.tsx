import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  ChevronRight,
  RotateCcw,
  Search,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fetchRecentOrders } from '@/services/orders';
import { voidOrder } from '@/services/inventory';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { ReceiptOrderData } from '@/services/receipts';
import { WhatsAppStatus } from '@/types/database';
import { HeaderProfileButton } from '@/components/profile/HeaderProfileButton';
import { HeaderNotesButton } from '@/components/notes/HeaderNotesButton';
import { CustomDateModal } from '@/components/dashboard/CustomDateModal';
import { haptic } from '@/utils/haptics';

export default function OrdersHistoryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { currentBakery, currentMembership } = useAuthStore();
  const bakeryId = currentBakery?.id;
  const currency = currentBakery?.currency ?? 'INR';
  const isOwner = currentMembership?.role === 'owner';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReceiptOrderData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'card'>('all');

  type DatePreset = 'all' | 'today' | 'yesterday' | '7d' | 'custom';
  const [dateFilter, setDateFilter] = useState<DatePreset>('all');
  const [startDateIso, setStartDateIso] = useState<string | undefined>(undefined);
  const [endDateIso, setEndDateIso] = useState<string | undefined>(undefined);
  const [customDateLabel, setCustomDateLabel] = useState<string | null>(null);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const handleSelectDatePreset = (preset: DatePreset) => {
    haptic.selection();
    setDateFilter(preset);
    const now = new Date();

    switch (preset) {
      case 'all':
        setStartDateIso(undefined);
        setEndDateIso(undefined);
        setCustomDateLabel(null);
        break;
      case 'today':
        setStartDateIso(startOfDay(now).toISOString());
        setEndDateIso(endOfDay(now).toISOString());
        setCustomDateLabel('Today');
        break;
      case 'yesterday': {
        const y = subDays(now, 1);
        setStartDateIso(startOfDay(y).toISOString());
        setEndDateIso(endOfDay(y).toISOString());
        setCustomDateLabel('Yesterday');
        break;
      }
      case '7d':
        setStartDateIso(startOfDay(subDays(now, 7)).toISOString());
        setEndDateIso(endOfDay(now).toISOString());
        setCustomDateLabel('Past 7 Days');
        break;
      case 'custom':
        setShowCustomDateModal(true);
        break;
    }
  };

  const loadData = useCallback(async () => {
    if (!bakeryId) return;

    try {
      const data = await fetchRecentOrders(bakeryId, 200, startDateIso, endDateIso);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load order history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bakeryId, startDateIso, endDateIso]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenReceipt = (order: any) => {
    const formatted: ReceiptOrderData = {
      id: order.id,
      order_number: order.order_number,
      total: order.total,
      payment_method: order.payment_method,
      created_at: order.created_at,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      whatsapp_status: order.whatsapp_status,
      items: (order.order_items ?? []).map((item: any) => ({
        item_name: item.item_name_snapshot,
        quantity: item.quantity,
        unit_price: item.unit_price_snapshot,
        line_total: item.line_total,
      })),
    };

    haptic.light();
    setSelectedOrder(formatted);
    setShowReceiptModal(true);
  };

  const handleVoidOrder = (order: any) => {
    if (!bakeryId || !isOwner) return;

    haptic.warning();
    Alert.alert(
      'Void Order',
      `Are you sure you want to void bill ${order.order_number}? This will reverse the revenue calculation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void & Restore Stock',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await voidOrder({
                bakeryId,
                orderId: order.id,
                reason: 'Voided by owner from Order History',
                restoreStock: true,
              });
              haptic.heavy();
              loadData();
            } catch (err: any) {
              haptic.error();
              Alert.alert('Error', err.message ?? 'Failed to void order');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        order.order_number?.toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_phone?.includes(q) ||
        order.order_items?.some((oi: any) =>
          oi.item_name_snapshot?.toLowerCase().includes(q)
        );

      const matchesPayment =
        selectedPaymentFilter === 'all' ||
        order.payment_method?.toLowerCase() === selectedPaymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [orders, searchQuery, selectedPaymentFilter]);

  const { totalRevenue, totalCount } = useMemo(() => {
    const total = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return { totalRevenue: total, totalCount: filteredOrders.length };
  }, [filteredOrders]);

  const renderWhatsAppStatusBadge = (status?: WhatsAppStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.successLight, borderRadius: borderRadius.xs }]}>
            <CheckCircle2 size={11} color={colors.success} />
            <Text style={[typography.captionBold, { color: colors.successText, fontSize: 10, marginLeft: 3 }]}>
              Delivered
            </Text>
          </View>
        );
      case 'accepted':
      case 'manual':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.xs }]}>
            <Smartphone size={11} color={colors.primary} />
            <Text style={[typography.captionBold, { color: colors.primary, fontSize: 10, marginLeft: 3 }]}>
              WhatsApp Sent
            </Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.xs }]}>
            <Clock size={11} color={colors.accent} />
            <Text style={[typography.captionBold, { color: colors.accent, fontSize: 10, marginLeft: 3 }]}>
              Pending
            </Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.dangerLight, borderRadius: borderRadius.xs }]}>
            <XCircle size={11} color={colors.danger} />
            <Text style={[typography.captionBold, { color: colors.dangerText, fontSize: 10, marginLeft: 3 }]}>
              Failed
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isVoided = item.status === 'voided';
    const dateFormatted = item.created_at
      ? format(new Date(item.created_at), 'dd MMM yyyy')
      : '—';
    const timeFormatted = item.created_at
      ? format(new Date(item.created_at), 'hh:mm a')
      : '—';

    const items = item.order_items ?? [];
    const displayedItems = items.slice(0, 3);
    const remainingCount = items.length - 3;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleOpenReceipt(item)}
      >
        <Card
          style={{
            marginBottom: spacing.md,
            padding: spacing.md,
            opacity: isVoided ? 0.6 : 1,
            borderColor: colors.borderSubtle,
          }}
        >
          {/* Top Row: Billing ID, Payment Badge, Revenue */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.numberRow}>
                <View
                  style={[
                    styles.billingIdBadge,
                    {
                      backgroundColor: colors.primaryLight,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                >
                  <Receipt size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      typography.captionBold,
                      {
                        color: colors.primary,
                        fontSize: 13,
                        textDecorationLine: isVoided ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    #{item.order_number}
                  </Text>
                </View>

                {isVoided ? (
                  <Badge label="VOIDED" variant="danger" style={{ marginLeft: 6 }} />
                ) : (
                  <View
                    style={[
                      styles.paymentBadge,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: borderRadius.xs,
                        marginLeft: 6,
                      },
                    ]}
                  >
                    {item.payment_method === 'cash' ? (
                      <Banknote size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
                    ) : item.payment_method === 'upi' ? (
                      <QrCode size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
                    ) : (
                      <CreditCard size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
                    )}
                    <Text style={[typography.captionBold, { color: colors.text, fontSize: 10 }]}>
                      {item.payment_method?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Date, Time & Customer details */}
              <View style={styles.metaRow}>
                <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {dateFormatted} • {timeFormatted}
                </Text>
              </View>

              {item.customer_name ? (
                <Text style={[typography.captionBold, { color: colors.text, marginTop: 2 }]}>
                  Customer: {item.customer_name} {item.customer_phone ? `(${item.customer_phone})` : ''}
                </Text>
              ) : null}
            </View>

            {/* Revenue of that specific order */}
            <View style={styles.priceColumn}>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'right' }]}>
                Order Total
              </Text>
              <Text
                style={[
                  typography.h2,
                  {
                    color: isVoided ? colors.textMuted : colors.primary,
                    textDecorationLine: isVoided ? 'line-through' : 'none',
                    fontSize: 20,
                  },
                ]}
              >
                {currency} {Number(item.total).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Itemized Order Items Box */}
          <View
            style={[
              styles.itemsBox,
              {
                backgroundColor: colors.surfaceSubtle,
                borderRadius: borderRadius.md,
                marginTop: spacing.sm,
                padding: spacing.sm,
              },
            ]}
          >
            <View style={styles.itemsBoxHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Layers size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[typography.captionBold, { color: colors.textMuted, fontSize: 11 }]}>
                  ORDERED ITEMS ({items.length})
                </Text>
              </View>
            </View>

            {displayedItems.map((orderItem: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <Text
                  style={[
                    typography.body,
                    { color: colors.text, fontSize: 13, flex: 1 },
                  ]}
                  numberOfLines={1}
                >
                  <Text style={{ fontWeight: '700', color: colors.primary }}>
                    {orderItem.quantity}×{' '}
                  </Text>
                  {orderItem.item_name_snapshot}
                </Text>
                <Text style={[typography.captionBold, { color: colors.text, fontSize: 12 }]}>
                  {currency} {Number(orderItem.line_total).toFixed(2)}
                </Text>
              </View>
            ))}

            {remainingCount > 0 && (
              <Text style={[typography.captionBold, { color: colors.primary, marginTop: 2, fontSize: 11 }]}>
                +{remainingCount} more item{remainingCount === 1 ? '' : 's'} (tap to view full bill)
              </Text>
            )}
          </View>

          {/* Card Footer: WhatsApp status, View Details & Void */}
          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {renderWhatsAppStatusBadge(item.whatsapp_status)}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isOwner && !isVoided && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleVoidOrder(item);
                  }}
                  style={[styles.voidBtn, { borderColor: colors.danger, borderRadius: borderRadius.xs }]}
                >
                  <RotateCcw size={12} color={colors.danger} />
                  <Text style={[typography.captionBold, { color: colors.danger, fontSize: 10, marginLeft: 2 }]}>
                    Void
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.captionBold, { color: colors.primary, fontSize: 12 }]}>
                  Full Receipt
                </Text>
                <ChevronRight size={16} color={colors.primary} />
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[typography.h2, { color: colors.text }]}>Order History</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Billing IDs, item details & order revenue logs
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HeaderNotesButton />
            <HeaderProfileButton />
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              borderRadius: borderRadius.lg,
              marginHorizontal: spacing.lg,
              marginTop: spacing.md,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search by Bill #, customer or item name..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, typography.body, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Filter Pills */}
        <View style={{ marginTop: spacing.xs }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.dateFilterScroll, { paddingHorizontal: spacing.lg }]}
          >
            {(['all', 'today', 'yesterday', '7d', 'custom'] as const).map((preset) => {
              const isSelected = dateFilter === preset;
              const label =
                preset === 'all'
                  ? 'All Time'
                  : preset === 'today'
                  ? 'Today'
                  : preset === 'yesterday'
                  ? 'Yesterday'
                  : preset === '7d'
                  ? 'Past 7 Days'
                  : customDateLabel
                  ? customDateLabel
                  : 'Custom Range 📅';

              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => handleSelectDatePreset(preset)}
                  style={[
                    styles.dateFilterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {preset === 'custom' && (
                    <CalendarIcon
                      size={12}
                      color={isSelected ? '#FFFFFF' : colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      typography.captionBold,
                      { color: isSelected ? '#FFFFFF' : colors.text, fontSize: 11 },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Payment Filter Pills & Revenue Summary */}
        <View style={[styles.filterRow, { paddingHorizontal: spacing.lg, marginTop: spacing.xs }]}>
          {(['all', 'cash', 'upi', 'card'] as const).map((method) => {
            const isSelected = selectedPaymentFilter === method;
            return (
              <TouchableOpacity
                key={method}
                onPress={() => {
                  haptic.selection();
                  setSelectedPaymentFilter(method);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: isSelected ? '#FFFFFF' : colors.textMuted, fontSize: 11 },
                  ]}
                >
                  {method === 'all' ? 'All Payments' : method.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Order Count & Total Revenue Bar */}
        <View
          style={[
            styles.summaryBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              marginHorizontal: spacing.lg,
              marginTop: spacing.xs,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Receipt size={13} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.text, fontSize: 11 }]}>
              {totalCount} {totalCount === 1 ? 'Order' : 'Orders'}
            </Text>
          </View>
          <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
            Total: {currency} {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Orders List */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
              Loading order history...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, { padding: spacing.lg }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Receipt size={44} color={colors.textLight} />
                <Text style={[typography.bodyBold, { color: colors.text, marginTop: 12 }]}>
                  {searchQuery ? 'No matching orders found' : 'No orders recorded yet'}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
                  {searchQuery
                    ? 'Try adjusting your search query or payment filter.'
                    : 'Completed POS billing orders will appear here with full itemized details.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        order={selectedOrder}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedOrder(null);
        }}
        onStatusUpdated={() => {
          loadData();
        }}
      />

      {/* Custom Date Range Modal */}
      <CustomDateModal
        visible={showCustomDateModal}
        initialStartDate={startDateIso}
        initialEndDate={endDateIso}
        onClose={() => setShowCustomDateModal(false)}
        onApply={(s, e, label) => {
          setStartDateIso(s);
          setEndDateIso(e);
          setCustomDateLabel(label);
          setDateFilter('custom');
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
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  dateFilterScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dateFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  itemsBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  itemsBoxHeader: {
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  voidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
});
