import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Boxes, History, Sliders, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MenuItem } from '@/types/database';
import { fetchProducts } from '@/services/products';
import {
  fetchInventoryMovements,
  computeInventoryStats,
  InventoryMovementRecord,
  InventoryOverviewStats,
} from '@/services/inventory';
import { haptic } from '@/utils/haptics';
import { InventorySummaryCards } from '@/components/inventory/InventorySummaryCards';
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { MovementHistoryList } from '@/components/inventory/MovementHistoryList';

type MainView = 'stock' | 'movements';
type StockFilter = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { currentBakery } = useAuthStore();
  const bakeryId = currentBakery?.id;

  const [activeView, setActiveView] = useState<MainView>('stock');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const [products, setProducts] = useState<MenuItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [stats, setStats] = useState<InventoryOverviewStats>({
    totalTracked: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!bakeryId) return;

    try {
      const [prods, movs] = await Promise.all([
        fetchProducts(bakeryId),
        fetchInventoryMovements(bakeryId, { limit: 50 }),
      ]);

      setProducts(prods);
      setMovements(movs);
      setStats(computeInventoryStats(prods));
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bakeryId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenAdjust = (product: MenuItem) => {
    haptic.light();
    setSelectedProduct(product);
    setShowAdjustModal(true);
  };

  const filteredTrackedProducts = products
    .filter((p) => p.track_inventory && !p.archived_at)
    .filter((p) => {
      if (stockFilter === 'out') return p.stock_quantity <= 0;
      if (stockFilter === 'low') {
        return (
          p.low_stock_threshold !== null &&
          p.stock_quantity <= p.low_stock_threshold &&
          p.stock_quantity > 0
        );
      }
      return true;
    });

  const renderProductItem = ({ item }: { item: MenuItem }) => {
    const isOutOfStock = item.stock_quantity <= 0;
    const isLow =
      item.low_stock_threshold !== null &&
      item.stock_quantity <= item.low_stock_threshold &&
      item.stock_quantity > 0;

    let statusColor: string = colors.successText;
    let statusBg: string = colors.successLight;
    let statusIcon = <CheckCircle2 size={14} color={colors.success} />;
    let statusLabel = 'In Stock';

    if (isOutOfStock) {
      statusColor = colors.dangerText;
      statusBg = colors.dangerLight;
      statusIcon = <XCircle size={14} color={colors.danger} />;
      statusLabel = 'Out of Stock';
    } else if (isLow) {
      statusColor = colors.accent;
      statusBg = colors.primaryLight;
      statusIcon = <AlertTriangle size={14} color={colors.accent} />;
      statusLabel = `Low (${item.stock_quantity} left)`;
    }

    return (
      <Card style={{ marginBottom: spacing.sm, padding: spacing.md }}>
        <View style={styles.productRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{item.name}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{item.category}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View
                style={[
                  styles.stockBadge,
                  { backgroundColor: statusBg, borderRadius: borderRadius.xs },
                ]}
              >
                {statusIcon}
                <Text
                  style={[
                    typography.captionBold,
                    { color: statusColor, fontSize: 11, marginLeft: 4 },
                  ]}
                >
                  {statusLabel}
                </Text>
              </View>

              {item.low_stock_threshold !== null && (
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
                  Alert at $\le$ {item.low_stock_threshold}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.adjustCol}>
            <Text style={[typography.h2, { color: colors.text, textAlign: 'right' }]}>
              {item.stock_quantity}
            </Text>
            <Button
              title="Adjust"
              size="sm"
              variant="outline"
              icon={<Sliders size={14} color={colors.primary} />}
              onPress={() => handleOpenAdjust(item)}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <View>
            <Text style={[typography.h2, { color: colors.text }]}>Inventory & Stock</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {currentBakery?.name ?? 'Bakery'} Management
            </Text>
          </View>
        </View>

      {/* Summary Metrics */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <InventorySummaryCards stats={stats} />
      </View>

      {/* View Switcher: Stock vs Movements */}
      <View style={[styles.tabBar, { marginHorizontal: spacing.lg, marginTop: spacing.md }]}>
        <TouchableOpacity
          onPress={() => {
            haptic.selection();
            setActiveView('stock');
          }}
          style={[
            styles.viewTab,
            {
              backgroundColor: activeView === 'stock' ? colors.primary : colors.surfaceSubtle,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Boxes size={16} color={activeView === 'stock' ? '#FFFFFF' : colors.textMuted} />
          <Text
            style={[
              typography.captionBold,
              { color: activeView === 'stock' ? '#FFFFFF' : colors.text, marginLeft: 6 },
            ]}
          >
            Tracked Stock ({filteredTrackedProducts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            haptic.selection();
            setActiveView('movements');
          }}
          style={[
            styles.viewTab,
            {
              backgroundColor: activeView === 'movements' ? colors.primary : colors.surfaceSubtle,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <History size={16} color={activeView === 'movements' ? '#FFFFFF' : colors.textMuted} />
          <Text
            style={[
              typography.captionBold,
              { color: activeView === 'movements' ? '#FFFFFF' : colors.text, marginLeft: 6 },
            ]}
          >
            Audit Log ({movements.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* If in Stock view, show filter sub-tabs */}
      {activeView === 'stock' && (
        <View style={[styles.filterRow, { marginHorizontal: spacing.lg, marginTop: spacing.sm }]}>
          <TouchableOpacity
            onPress={() => setStockFilter('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor: stockFilter === 'all' ? colors.primaryLight : colors.surface,
                borderColor: stockFilter === 'all' ? colors.primary : colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text
              style={[
                typography.captionBold,
                { color: stockFilter === 'all' ? colors.primary : colors.textMuted },
              ]}
            >
              All Tracked
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStockFilter('low')}
            style={[
              styles.filterChip,
              {
                backgroundColor: stockFilter === 'low' ? colors.primaryLight : colors.surface,
                borderColor: stockFilter === 'low' ? colors.accent : colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text
              style={[
                typography.captionBold,
                { color: stockFilter === 'low' ? colors.accent : colors.textMuted },
              ]}
            >
              Low Stock Only ({stats.lowStockCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStockFilter('out')}
            style={[
              styles.filterChip,
              {
                backgroundColor: stockFilter === 'out' ? colors.dangerLight : colors.surface,
                borderColor: stockFilter === 'out' ? colors.danger : colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text
              style={[
                typography.captionBold,
                { color: stockFilter === 'out' ? colors.dangerText : colors.textMuted },
              ]}
            >
              Out of Stock ({stats.outOfStockCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
            Loading inventory records...
          </Text>
        </View>
      ) : activeView === 'stock' ? (
        <FlatList
          data={filteredTrackedProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
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
              <Text style={[typography.body, { color: colors.textMuted }]}>
                {stockFilter === 'all'
                  ? 'No inventory-tracked products. Enable "Track Inventory" on products to manage stock here.'
                  : stockFilter === 'low'
                  ? 'Great news! No products are currently at low stock threshold.'
                  : 'No products are currently out of stock.'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={[{ key: 'movements_list' }]}
          renderItem={() => <MovementHistoryList movements={movements} />}
          contentContainerStyle={[styles.listContent, { padding: spacing.lg }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      </View>

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        visible={showAdjustModal}
        product={selectedProduct}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={() => {
          loadData();
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
  tabBar: {
    flexDirection: 'row',
    gap: 8,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adjustCol: {
    alignItems: 'flex-end',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
