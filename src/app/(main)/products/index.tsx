import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderPlus,
  Folder,
  X,
  Edit3,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MenuItem } from '@/types/database';
import { fetchProducts } from '@/services/products';
import { fetchCategories } from '@/services/categories';
import { CategoryManageModal } from '@/components/categories/CategoryManageModal';
import { HeaderProfileButton } from '@/components/profile/HeaderProfileButton';
import { haptic } from '@/utils/haptics';

export default function ProductsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';

  const { width } = useWindowDimensions();
  const isTablet = width >= 640;

  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const bakeryId = currentBakery?.id;

  const loadData = useCallback(async () => {
    if (!bakeryId) return;
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts(bakeryId),
        fetchCategories(bakeryId),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products:', err);
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

  // Group products by category
  const groupedData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Filter products by search query
    const filtered = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchesSearch;
    });

    // Categories to display
    const visibleCategories =
      selectedCategory === 'All'
        ? categories
        : categories.filter((c) => c.toLowerCase() === selectedCategory.toLowerCase());

    const groups: { category: string; items: MenuItem[] }[] = [];

    visibleCategories.forEach((cat) => {
      const items = filtered.filter(
        (p) => p.category.toLowerCase() === cat.toLowerCase()
      );
      // Only include empty categories if we're not actively typing a search query
      if (items.length > 0 || !q) {
        groups.push({ category: cat, items });
      }
    });

    // Check for any uncategorized items or items in categories not in categories table
    const uncategorizedItems = filtered.filter(
      (p) => !categories.some((c) => c.toLowerCase() === p.category.toLowerCase())
    );
    if (uncategorizedItems.length > 0) {
      groups.push({ category: 'Other', items: uncategorizedItems });
    }

    return groups;
  }, [products, categories, selectedCategory, searchQuery]);

  const renderStockBadge = (item: MenuItem) => {
    if (!item.track_inventory) {
      return (
        <View
          style={[
            styles.stockTag,
            { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.xs },
          ]}
        >
          <Text style={[typography.captionBold, { color: colors.textMuted, fontSize: 11 }]}>
            Unlimited
          </Text>
        </View>
      );
    }

    if (item.stock_quantity <= 0) {
      return (
        <View
          style={[
            styles.stockTag,
            { backgroundColor: colors.dangerLight, borderRadius: borderRadius.xs },
          ]}
        >
          <AlertTriangle size={12} color={colors.danger} />
          <Text
            style={[
              typography.captionBold,
              { color: colors.dangerText, fontSize: 11, marginLeft: 4 },
            ]}
          >
            Out of Stock
          </Text>
        </View>
      );
    }

    const isLow =
      item.low_stock_threshold !== null && item.stock_quantity <= item.low_stock_threshold;

    if (isLow) {
      return (
        <View
          style={[
            styles.stockTag,
            { backgroundColor: colors.primaryLight, borderRadius: borderRadius.xs },
          ]}
        >
          <AlertTriangle size={12} color={colors.accent} />
          <Text
            style={[
              typography.captionBold,
              { color: colors.accent, fontSize: 11, marginLeft: 4 },
            ]}
          >
            Low Stock: {item.stock_quantity}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.stockTag,
          { backgroundColor: colors.successLight, borderRadius: borderRadius.xs },
        ]}
      >
        <CheckCircle2 size={12} color={colors.success} />
        <Text
          style={[
            typography.captionBold,
            { color: colors.successText, fontSize: 11, marginLeft: 4 },
          ]}
        >
          In Stock: {item.stock_quantity}
        </Text>
      </View>
    );
  };

  const handleAddNewItemUnderCategory = (categoryName: string) => {
    haptic.medium();
    router.push({
      pathname: '/(main)/products/form',
      params: { category: categoryName },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[typography.h2, { color: colors.text }]}>Products & Menu</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {products.length} item{products.length === 1 ? '' : 's'} across {categories.length} categories
            </Text>
          </View>

          {/* On Tablet: Action buttons in header */}
          {isTablet ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  haptic.medium();
                  setShowCategoryModal(true);
                }}
                style={[
                  styles.categoryManageBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    borderRadius: borderRadius.md,
                  },
                ]}
                activeOpacity={0.7}
              >
                <FolderPlus size={16} color={colors.primary} />
                <Text style={[typography.captionBold, { color: colors.text, marginLeft: 6 }]}>
                  Categories
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  haptic.medium();
                  router.push('/(main)/products/form');
                }}
                style={[
                  styles.addProductBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.md,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={[typography.captionBold, { color: '#FFFFFF', marginLeft: 6 }]}>
                  Add Product
                </Text>
              </TouchableOpacity>

              <HeaderProfileButton />
            </View>
          ) : (
            <HeaderProfileButton />
          )}
        </View>

        {/* On Mobile: Full-width dual action bar */}
        {!isTablet && (
          <View style={[styles.mobileActionBar, { paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
            <TouchableOpacity
              onPress={() => {
                haptic.medium();
                setShowCategoryModal(true);
              }}
              style={[
                styles.mobileActionBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  borderRadius: borderRadius.md,
                },
              ]}
              activeOpacity={0.7}
            >
              <FolderPlus size={17} color={colors.primary} />
              <Text style={[typography.button, { color: colors.text, fontSize: 13, marginLeft: 6 }]}>
                Categories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                haptic.medium();
                router.push('/(main)/products/form');
              }}
              style={[
                styles.mobileActionBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: borderRadius.md,
                },
              ]}
              activeOpacity={0.8}
            >
              <Plus size={17} color="#FFFFFF" />
              <Text style={[typography.button, { color: '#FFFFFF', fontSize: 13, marginLeft: 6 }]}>
                Add Product
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar */}
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
            placeholder="Search products by item name..."
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

        {/* Category Jump Pills */}
        <View style={{ marginTop: spacing.sm }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => {
                haptic.selection();
                setSelectedCategory('All');
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: selectedCategory === 'All' ? colors.primary : colors.surface,
                  borderColor: selectedCategory === 'All' ? colors.primary : colors.borderSubtle,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <Text
                style={[
                  typography.captionBold,
                  { color: selectedCategory === 'All' ? '#FFFFFF' : colors.text },
                ]}
              >
                All Categories ({products.length})
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = products.filter((p) => p.category.toLowerCase() === cat.toLowerCase()).length;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    haptic.selection();
                    setSelectedCategory(cat);
                  }}
                  style={[
                    styles.pill,
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
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {cat} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Product Catalog Grouped By Categories */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
              Loading bakery items...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {groupedData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Folder size={44} color={colors.textLight} />
                <Text style={[typography.bodyBold, { color: colors.text, marginTop: 12 }]}>
                  {searchQuery ? 'No products match your search' : 'No categories or products yet'}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
                  {searchQuery
                    ? 'Try searching with another keyword.'
                    : 'Get started by creating a category or adding your first item.'}
                </Text>
                <Button
                  title="Add First Product"
                  size="lg"
                  onPress={() => router.push('/(main)/products/form')}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            ) : (
              groupedData.map((group) => (
                <View key={group.category} style={styles.categorySection}>
                  {/* Category Section Header Card */}
                  <View
                    style={[
                      styles.categoryHeaderCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                        borderRadius: borderRadius.lg,
                      },
                    ]}
                  >
                    <View style={styles.categoryHeaderLeft}>
                      <View
                        style={[
                          styles.categoryIconWrap,
                          {
                            backgroundColor: colors.primaryLight,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      >
                        <Folder size={18} color={colors.primary} />
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>
                          {group.category}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                          {group.items.length} product{group.items.length === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>

                    {/* Quick Add Button directly under this category */}
                    <TouchableOpacity
                      onPress={() => handleAddNewItemUnderCategory(group.category)}
                      style={[
                        styles.addUnderCatBtn,
                        {
                          backgroundColor: colors.primaryLight,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={colors.primary} />
                      <Text
                        style={[
                          typography.captionBold,
                          { color: colors.primary, fontSize: 11, marginLeft: 4 },
                        ]}
                      >
                        Add Item
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Items inside this Category */}
                  {group.items.length === 0 ? (
                    <TouchableOpacity
                      onPress={() => handleAddNewItemUnderCategory(group.category)}
                      style={[
                        styles.emptyCatBox,
                        {
                          borderColor: colors.borderSubtle,
                          borderRadius: borderRadius.lg,
                        },
                      ]}
                    >
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        No items in {group.category} yet.
                      </Text>
                      <Text style={[typography.captionBold, { color: colors.primary, marginTop: 4 }]}>
                        + Add product to {group.category}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.itemsWrapper, isTablet && styles.itemsWrapperTablet]}>
                      {group.items.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          style={isTablet ? styles.itemTouchTablet : styles.itemTouchMobile}
                          onPress={() => {
                            haptic.light();
                            router.push({
                              pathname: '/(main)/products/form',
                              params: { id: item.id },
                            });
                          }}
                        >
                          <Card
                            style={[
                              styles.itemCard,
                              {
                                borderColor: colors.borderSubtle,
                                opacity: item.is_active ? 1 : 0.6,
                              },
                            ]}
                          >
                            <View style={styles.itemCardContent}>
                              {/* Left Info */}
                              <View style={{ flex: 1, marginRight: 12 }}>
                                <View style={styles.itemNameRow}>
                                  <Text style={[typography.bodyBold, { color: colors.text, fontSize: 15 }]}>
                                    {item.name}
                                  </Text>
                                  {!item.is_active && (
                                    <Badge label="HIDDEN" variant="neutral" style={{ marginLeft: 6 }} />
                                  )}
                                </View>

                                {item.description ? (
                                  <Text
                                    style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}
                                    numberOfLines={1}
                                  >
                                    {item.description}
                                  </Text>
                                ) : null}

                                <View style={{ marginTop: 6 }}>
                                  {renderStockBadge(item)}
                                </View>
                              </View>

                              {/* Right Price & Edit Trigger */}
                              <View style={styles.itemRightSide}>
                                <View
                                  style={[
                                    styles.priceTag,
                                    {
                                      backgroundColor: colors.surfaceSubtle,
                                      borderRadius: borderRadius.md,
                                    },
                                  ]}
                                >
                                  <Text style={[typography.captionBold, { color: colors.primary, fontSize: 14 }]}>
                                    {currency} {item.price.toFixed(2)}
                                  </Text>
                                </View>

                                <View style={styles.editActionRow}>
                                  <Edit3 size={13} color={colors.textMuted} style={{ marginRight: 2 }} />
                                  <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                                    Edit
                                  </Text>
                                  <ChevronRight size={14} color={colors.textLight} />
                                </View>
                              </View>
                            </View>
                          </Card>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Category Management Modal */}
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
  safeArea: { flex: 1 },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  categoryManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    flexShrink: 0,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexShrink: 0,
  },
  mobileActionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  mobileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  searchContainer: {
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
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addUnderCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyCatBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsWrapper: {
    gap: 8,
  },
  itemsWrapperTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemTouchMobile: {
    width: '100%',
  },
  itemTouchTablet: {
    width: '49%',
  },
  itemCard: {
    padding: 12,
    borderWidth: 1,
  },
  itemCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRightSide: {
    alignItems: 'flex-end',
  },
  priceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  },
});
