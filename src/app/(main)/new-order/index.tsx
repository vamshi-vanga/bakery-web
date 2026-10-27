import React, { useCallback, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  AlertTriangle,
  X,
  Trash2,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useCartStore } from '@/stores/cartStore';
import { useTheme } from '@/theme';
import { MenuItem } from '@/types/database';
import { fetchProducts } from '@/services/products';
import { fetchCategories } from '@/services/categories';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { CategoryManageModal } from '@/components/categories/CategoryManageModal';
import { HeaderProfileButton } from '@/components/profile/HeaderProfileButton';
import { HeaderNotesButton } from '@/components/notes/HeaderNotesButton';
import { getSubscriptionStatus } from '@/services/subscriptionService';
import { haptic } from '@/utils/haptics';

interface ProductTileProps {
  item: MenuItem;
  qtyInCart: number;
  currency: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
  shadows: ReturnType<typeof useTheme>['shadows'];
  onSelect: (item: MenuItem) => void;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (productId: string) => void;
}

const ProductTile = memo(function ProductTile({
  item,
  qtyInCart,
  currency,
  colors,
  typography,
  borderRadius,
  shadows,
  onSelect,
  onIncrement,
  onDecrement,
}: ProductTileProps) {
  const isOutOfStock = item.track_inventory && item.stock_quantity <= 0;
  const isLowStock =
    item.track_inventory &&
    item.low_stock_threshold !== null &&
    item.stock_quantity <= item.low_stock_threshold &&
    item.stock_quantity > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onSelect(item)}
      style={[
        styles.tileContainer,
        {
          backgroundColor: colors.surface,
          borderColor: qtyInCart > 0 ? colors.primary : colors.borderSubtle,
          borderWidth: qtyInCart > 0 ? 2 : 1,
          borderRadius: borderRadius.xl,
          ...shadows.sm,
        },
      ]}
    >
      {/* Active Quantity Badge */}
      {qtyInCart > 0 && (
        <View
          style={[
            styles.cartQtyBadge,
            { backgroundColor: colors.primary, borderRadius: borderRadius.full },
          ]}
        >
          <Text style={[typography.captionBold, { color: '#FFFFFF', fontSize: 13 }]}>
            {qtyInCart}
          </Text>
        </View>
      )}

      <View style={styles.tileContent}>
        <View>
          <Text
            style={[
              typography.captionBold,
              { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
            ]}
          >
            {item.category}
          </Text>
          <Text
            style={[typography.bodyBold, { color: colors.text, marginTop: 4, fontSize: 16 }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        <View style={styles.stockNoticeRow}>
          {isOutOfStock ? (
            <View style={styles.inlineWarning}>
              <AlertTriangle size={13} color={colors.danger} />
              <Text style={[typography.captionBold, { color: colors.danger, fontSize: 11, marginLeft: 4 }]}>
                0 in stock
              </Text>
            </View>
          ) : isLowStock ? (
            <View style={styles.inlineWarning}>
              <AlertTriangle size={13} color={colors.accent} />
              <Text style={[typography.captionBold, { color: colors.accent, fontSize: 11, marginLeft: 4 }]}>
                {item.stock_quantity} left
              </Text>
            </View>
          ) : null}
        </View>

        {qtyInCart > 0 ? (
          <View style={styles.tileFooterActive}>
            <Text style={[typography.price, { color: colors.primary, fontSize: 16 }]} numberOfLines={1}>
              {currency} {item.price.toFixed(2)}
            </Text>

            <View
              style={[
                styles.stepperPill,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: borderRadius.full,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDecrement(item.id);
                }}
                style={[
                  styles.stepperActionBtn,
                  { backgroundColor: colors.surface, borderRadius: borderRadius.full },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Minus size={15} color={colors.text} />
              </TouchableOpacity>

              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 13, fontWeight: '700' }]}>
                {qtyInCart}
              </Text>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onIncrement(item);
                }}
                style={[
                  styles.stepperActionBtn,
                  { backgroundColor: colors.primary, borderRadius: borderRadius.full },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Plus size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.tileFooter}>
            <Text style={[typography.price, { color: colors.primary, fontSize: 16 }]} numberOfLines={1}>
              {currency} {item.price.toFixed(2)}
            </Text>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              style={[
                styles.addIconCircle,
                { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Plus size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function POSOrderScreen() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const router = useRouter();
  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';

  const {
    addItem,
    removeItem,
    getItemQuantity,
    getTotalItems,
    getSubtotal,
    clearCart,
  } = useCartStore();

  const { width } = useWindowDimensions();
  const isTablet = width >= 640;

  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const openSubscriptionModal = useUIStore((s) => s.openSubscriptionModal);
  const openProfileModal = useUIStore((s) => s.openProfileModal);

  const subStatus = getSubscriptionStatus(currentBakery);
  const isTrial = currentBakery?.subscription_plan === 'trial' && subStatus.isActive;

  const bakeryId = currentBakery?.id;

  const loadData = useCallback(async () => {
    if (!bakeryId) return;
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts(bakeryId, {
          category: selectedCategory,
          query: searchQuery,
        }),
        fetchCategories(bakeryId),
      ]);
      setProducts(prods.filter((p) => p.is_active));
      setCategories(['All', ...cats]);
    } catch (err) {
      console.error('POS failed to load products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bakeryId, selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSelectItem = useCallback(
    (item: MenuItem) => {
      haptic.light();
      addItem(item);
    },
    [addItem]
  );

  const handleIncrement = useCallback(
    (item: MenuItem) => {
      haptic.light();
      addItem(item);
    },
    [addItem]
  );

  const handleDecrement = useCallback(
    (productId: string) => {
      haptic.light();
      removeItem(productId);
    },
    [removeItem]
  );

  const handleClearCart = () => {
    haptic.warning();
    clearCart();
  };

  const handleCategorySelect = (cat: string) => {
    haptic.selection();
    setSelectedCategory(cat);
  };

  const handleReviewPay = () => {
    haptic.medium();
    router.push('/(main)/new-order/checkout');
  };

  const totalItemsCount = getTotalItems();
  const subtotal = getSubtotal();

  const renderProductTile = useCallback(
    ({ item }: { item: MenuItem }) => {
      const qtyInCart = getItemQuantity(item.id);
      return (
        <ProductTile
          item={item}
          qtyInCart={qtyInCart}
          currency={currency}
          colors={colors}
          typography={typography}
          borderRadius={borderRadius}
          shadows={shadows}
          onSelect={handleSelectItem}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      );
    },
    [
      getItemQuantity,
      currency,
      colors,
      typography,
      borderRadius,
      shadows,
      handleSelectItem,
      handleIncrement,
      handleDecrement,
    ]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Header (Executive POS Branding Bar) */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.brandLogoWrap,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
            >
              <Image
                source={require('../../../../assets/images/app-logo.png')}
                style={styles.headerBrandLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text
                style={[typography.h3, { color: colors.text, fontSize: 16, fontWeight: '800' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentBakery?.name ?? 'BakeFlow POS'}
              </Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.headerLiveDot} />
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                  Counter Register • Live
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Trial Upgrade Button (Visible when bakery is using 2-day trial) */}
            {isTrial && (
              <TouchableOpacity
                onPress={() => {
                  haptic.medium();
                  openSubscriptionModal();
                }}
                style={[
                  styles.trialUpgradeBtn,
                  { borderRadius: borderRadius.full },
                ]}
                activeOpacity={0.8}
              >
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.trialUpgradeBtnText}>Upgrade Plan</Text>
              </TouchableOpacity>
            )}

            {/* Clear Cart Button */}
            {totalItemsCount > 0 && (
              <TouchableOpacity
                onPress={handleClearCart}
                style={[
                  styles.clearBtn,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.md,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color={colors.danger} style={{ marginRight: 4 }} />
                <Text style={[typography.captionBold, { color: colors.danger, fontSize: 12 }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}

            {/* Notes Button right beside Account */}
            <HeaderNotesButton />

            {/* Profile Icon on Top Right Corner */}
            <HeaderProfileButton onPress={openProfileModal} />
          </View>
        </View>

        {/* Offline Banner */}
        <OfflineBanner />

        {/* Search Input */}
        <View
          style={[
            styles.searchContainer,
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
            placeholder="Search items by name..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, typography.body, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills (Barbershop minimalist style) */}
        <View style={{ marginTop: spacing.md }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
            data={categories}
            keyExtractor={(cat) => cat}
            renderItem={({ item: cat }) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  onPress={() => handleCategorySelect(cat)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      borderRadius: borderRadius.full,
                      ...shadows.sm,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      typography.captionBold,
                      { color: isSelected ? '#FFFFFF' : colors.text, fontSize: 13 },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity
                onPress={() => {
                  haptic.medium();
                  setShowCategoryModal(true);
                }}
                style={[
                  styles.addCategoryPill,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                    borderRadius: borderRadius.full,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Plus size={15} color={colors.primary} />
                <Text
                  style={[
                    typography.captionBold,
                    { color: colors.primary, marginLeft: 4, fontSize: 13 },
                  ]}
                >
                  New
                </Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Products Grid */}
        <FlatList
          key={`grid-${isTablet ? 3 : 2}`}
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 3 : 2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={renderProductTile}
          contentContainerStyle={[
            styles.gridContent,
            { paddingHorizontal: spacing.lg, paddingBottom: totalItemsCount > 0 ? 110 : 40 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  No products found in this category.
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* Sticky Bottom Cart Bar (Admin Friendly & Ergonomic) */}
        {totalItemsCount > 0 && (
          <View
            style={[
              styles.bottomCartBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.borderSubtle,
                borderTopWidth: 1,
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.md,
                ...shadows.lg,
              },
            ]}
          >
            <View style={styles.cartBarInfo}>
              <View style={styles.cartIconWrapper}>
                <View
                  style={[
                    styles.cartIconCircle,
                    { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full },
                  ]}
                >
                  <ShoppingBag size={22} color={colors.primary} />
                </View>
                <View
                  style={[
                    styles.cartBadgeSmall,
                    { backgroundColor: colors.primary, borderRadius: borderRadius.full },
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    {totalItemsCount}
                  </Text>
                </View>
              </View>

              <View style={{ marginLeft: 12 }}>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12 }]}>
                  Total Payable
                </Text>
                <Text style={[typography.price, { color: colors.text, fontSize: 22, fontWeight: '800' }]}>
                  {currency} {subtotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReviewPay}
              style={[
                styles.checkoutBtn,
                { backgroundColor: colors.primary, borderRadius: borderRadius.lg },
              ]}
            >
              <Text style={[typography.button, { color: '#FFFFFF', marginRight: 8, fontSize: 16 }]}>
                Review & Pay
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {bakeryId && (
        <CategoryManageModal
          visible={showCategoryModal}
          bakeryId={bakeryId}
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onCategoriesChanged={() => {
            loadData();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  trialUpgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 4,
    elevation: 2,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  trialUpgradeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5,
  },
  brandLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerBrandLogo: {
    width: 26,
    height: 26,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 10,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  gridContent: {
    paddingTop: 14,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tileContainer: {
    flex: 1,
    minWidth: 145,
    minHeight: 155,
    position: 'relative',
    padding: 12,
    justifyContent: 'space-between',
  },
  cartQtyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
  },
  tileContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stockNoticeRow: {
    minHeight: 18,
    marginVertical: 4,
  },
  inlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  tileFooterActive: {
    marginTop: 6,
    gap: 6,
  },
  stepperPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 3,
    borderWidth: 1,
  },
  stepperActionBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  bottomCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartIconCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 22,
  },
});
