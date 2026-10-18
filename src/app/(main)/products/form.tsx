import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  X,
  Trash2,
  DollarSign,
  Package,
  Plus,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { createProduct, updateProduct, archiveProduct, fetchProducts } from '@/services/products';
import { fetchCategories, addCategory } from '@/services/categories';
import { haptic } from '@/utils/haptics';

export default function ProductFormModal() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; category?: string }>();
  const isEditing = Boolean(params.id);

  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';
  const bakeryId = currentBakery?.id;

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [trackInventory, setTrackInventory] = useState(false);
  const [initialStock, setInitialStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  // Quick inline category creation
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!bakeryId) return;

    const loadInitialData = async () => {
      try {
        const cats = await fetchCategories(bakeryId);
        if (!isMounted) return;
        setCategories(cats);

        if (isEditing && params.id) {
          const products = await fetchProducts(bakeryId, { includeArchived: true });
          if (!isMounted) return;
          const found = products.find((p) => p.id === params.id);
          if (found) {
            setName(found.name);
            setCategory(found.category);
            setPrice(found.price.toString());
            setDescription(found.description ?? '');
            setTrackInventory(found.track_inventory);
            setCurrentStock(found.stock_quantity);
            setLowStockThreshold(
              found.low_stock_threshold !== null ? found.low_stock_threshold.toString() : '5'
            );
            setIsActive(found.is_active);
          }
        } else {
          // Pre-fill category if passed via navigation param, or default to first category
          if (params.category) {
            setCategory(params.category);
          } else if (cats.length > 0) {
            setCategory(cats[0]);
          }
        }
      } catch (err: any) {
        if (isMounted) setErrorMessage(err.message ?? 'Failed to load details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [bakeryId, isEditing, params.id, params.category]);

  const handleCreateNewCategory = async () => {
    const cleaned = newCatInput.trim();
    if (!cleaned || !bakeryId) return;

    setCreatingCat(true);
    try {
      await addCategory(bakeryId, cleaned);
      haptic.success();
      const updatedCats = await fetchCategories(bakeryId);
      setCategories(updatedCats);
      setCategory(cleaned);
      setNewCatInput('');
      setIsAddingNewCat(false);
    } catch (err: any) {
      haptic.error();
      Alert.alert('Error', err.message ?? 'Could not add category.');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Please enter a valid price (0 or greater).');
      return;
    }

    if (!bakeryId) {
      setErrorMessage('No active bakery found.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const selectedCat = category.trim() || 'General';

      if (isEditing && params.id) {
        await updateProduct(params.id, bakeryId, {
          name: name.trim(),
          category: selectedCat,
          price: parsedPrice,
          description: description.trim() || undefined,
          is_active: isActive,
          track_inventory: trackInventory,
          low_stock_threshold: trackInventory ? parseInt(lowStockThreshold, 10) || null : null,
        });
      } else {
        const parsedInitialStock = parseInt(initialStock, 10) || 0;
        await createProduct({
          bakery_id: bakeryId,
          name: name.trim(),
          category: selectedCat,
          price: parsedPrice,
          description: description.trim() || undefined,
          track_inventory: trackInventory,
          initial_stock: trackInventory ? parsedInitialStock : 0,
          low_stock_threshold: trackInventory ? parseInt(lowStockThreshold, 10) || null : null,
        });
      }

      haptic.success();
      router.back();
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = () => {
    if (!params.id || !bakeryId) return;

    Alert.alert(
      'Archive Product',
      `Are you sure you want to archive "${name}"? It will no longer appear on POS counters.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await archiveProduct(params.id!, bakeryId);
              router.back();
            } catch (err: any) {
              setErrorMessage(err.message ?? 'Failed to archive product.');
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.subtitle, { color: colors.textMuted, marginTop: 12 }]}>
            Loading product details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top Header Bar */}
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.borderSubtle,
              borderBottomWidth: 1,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[typography.h3, { color: colors.text }]}>
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.responsiveFormWrapper}>
            {errorMessage && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.sm,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.dangerText }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Basic Information Card */}
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
                Product Details
              </Text>

              <Input
                label="Product Name *"
                placeholder="e.g. Sourdough Loaf, Chocolate Croissant"
                value={name}
                onChangeText={setName}
                leftIcon={<Package size={20} color={colors.textMuted} />}
              />

              <Input
                label={`Price (${currency}) *`}
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                leftIcon={<DollarSign size={20} color={colors.textMuted} />}
              />

              <Input
                label="Description (Optional)"
                placeholder="Flavor profile, allergens, serving notes..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
              />
            </Card>

            {/* Category Card */}
            <Card style={{ marginBottom: spacing.md }}>
              <View style={styles.categoryHeaderRow}>
                <Text style={[typography.h3, { color: colors.text }]}>Category</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Select or add a new category
                </Text>
              </View>

              {/* Category Chips Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}
              >
                {categories.map((preset) => {
                  const isSelected = category === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => {
                        haptic.selection();
                        setCategory(preset);
                      }}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          borderRadius: borderRadius.full,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          typography.captionBold,
                          { color: isSelected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Inline Add Category Button */}
                <TouchableOpacity
                  onPress={() => setIsAddingNewCat(!isAddingNewCat)}
                  style={[
                    styles.addCategoryChip,
                    {
                      borderColor: colors.primary,
                      borderRadius: borderRadius.full,
                      backgroundColor: isAddingNewCat ? colors.primaryLight : colors.surface,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={colors.primary} />
                  <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 4 }]}>
                    New Category
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Inline Add Category Input Box */}
              {isAddingNewCat && (
                <View
                  style={[
                    styles.inlineAddBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.primary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <TextInput
                    placeholder="Enter new category name..."
                    placeholderTextColor={colors.textLight}
                    value={newCatInput}
                    onChangeText={setNewCatInput}
                    autoFocus
                    style={[styles.inlineInput, { color: colors.text }]}
                    onSubmitEditing={handleCreateNewCategory}
                  />
                  <TouchableOpacity
                    onPress={handleCreateNewCategory}
                    disabled={creatingCat || !newCatInput.trim()}
                    style={[styles.inlineConfirmBtn, { backgroundColor: colors.primary }]}
                  >
                    {creatingCat ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Check size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Card>

            {/* Inventory Management Card */}
            <Card style={{ marginBottom: spacing.md }}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={[typography.h3, { color: colors.text }]}>Track Inventory</Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    Deduct stock on sale and track inventory movements
                  </Text>
                </View>
                <Switch
                  value={trackInventory}
                  onValueChange={setTrackInventory}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {trackInventory && (
                <View style={{ marginTop: spacing.md }}>
                  {!isEditing ? (
                    <Input
                      label="Initial Stock Quantity"
                      placeholder="0"
                      value={initialStock}
                      onChangeText={setInitialStock}
                      keyboardType="number-pad"
                      helperText="Initial batch count recorded with audited movement"
                    />
                  ) : (
                    <View
                      style={[
                        styles.stockInfoBanner,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderRadius: borderRadius.sm,
                          padding: spacing.md,
                          marginBottom: spacing.md,
                        },
                      ]}
                    >
                      <Text style={[typography.captionBold, { color: colors.text }]}>
                        Current Stock: {currentStock ?? 0} units
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                        To adjust current stock, use the Stock Adjustment action in the Inventory tab.
                      </Text>
                    </View>
                  )}

                  <Input
                    label="Low Stock Alert Threshold"
                    placeholder="5"
                    value={lowStockThreshold}
                    onChangeText={setLowStockThreshold}
                    keyboardType="number-pad"
                    helperText="Counter will display low stock warning when remaining units reach this number"
                  />
                </View>
              )}
            </Card>

            {/* Product Visibility */}
            {isEditing && (
              <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={[typography.h3, { color: colors.text }]}>Available on Counter</Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      When active, staff can ring up orders for this item at the POS
                    </Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </Card>
            )}

            {/* Action Buttons */}
            <Button
              title={isEditing ? 'Save Changes' : 'Create Product'}
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
              style={{ marginTop: spacing.sm }}
            />

            {isEditing && (
              <TouchableOpacity
                onPress={handleArchive}
                disabled={submitting}
                style={[styles.archiveBtn, { marginTop: spacing.md }]}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={[typography.bodyBold, { color: colors.danger, marginLeft: 8 }]}>
                  Archive Product
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  responsiveFormWrapper: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  errorBanner: {
    padding: 12,
    borderWidth: 1,
  },
  categoryHeaderRow: {
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inlineInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  inlineConfirmBtn: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfoBanner: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
});
