import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Plus, Minus, Edit3 } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { MenuItem } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adjustProductStock } from '@/services/inventory';
import { haptic } from '@/utils/haptics';

interface Props {
  visible: boolean;
  product: MenuItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ActionType = 'restock' | 'waste' | 'correction';

export function StockAdjustModal({ visible, product, onClose, onSuccess }: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();
  const { currentBakery } = useAuthStore();

  const [actionType, setActionType] = useState<ActionType>('restock');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!product) return null;

  const handleAdjust = async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid quantity greater than 0.');
      return;
    }

    if (!currentBakery?.id) {
      setErrorMessage('Bakery profile not found.');
      return;
    }

    let delta = qty;
    if (actionType === 'waste') {
      delta = -qty;
      if (product.stock_quantity + delta < 0) {
        setErrorMessage(
          `Cannot remove ${qty} units. Current stock is only ${product.stock_quantity}.`
        );
        return;
      }
    } else if (actionType === 'correction') {
      // In correction, allow user note explaining discrepancy
      delta = qty; // User enters delta or absolute
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await adjustProductStock({
        bakeryId: currentBakery.id,
        menuItemId: product.id,
        quantityDelta: delta,
        movementType: actionType,
        note: note.trim() || undefined,
      });

      // Reset form
      haptic.success();
      setQuantity('');
      setNote('');
      onSuccess();
      onClose();
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to adjust stock.');
    } finally {
      setSubmitting(false);
    }
  };

  const getComputedNewStock = () => {
    const qty = parseInt(quantity, 10) || 0;
    if (actionType === 'restock') return product.stock_quantity + qty;
    if (actionType === 'waste') return Math.max(0, product.stock_quantity - qty);
    return product.stock_quantity + qty;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[typography.h3, { color: colors.text }]}>Adjust Inventory</Text>
              <Text style={[typography.bodyBold, { color: colors.primary, marginTop: 2 }]}>
                {product.name}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Current Stock Banner */}
            <View
              style={[
                styles.currentStockBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginVertical: spacing.md,
                },
              ]}
            >
              <View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Current Stock</Text>
                <Text style={[typography.h2, { color: colors.text }]}>
                  {product.stock_quantity} units
                </Text>
              </View>

              {quantity.trim().length > 0 && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>New Stock</Text>
                  <Text style={[typography.h2, { color: colors.primary }]}>
                    {getComputedNewStock()} units
                  </Text>
                </View>
              )}
            </View>

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

            {/* Action Type Selector */}
            <Text style={[typography.captionBold, { color: colors.text, marginBottom: spacing.xs }]}>
              Movement Type
            </Text>
            <View style={styles.actionsRow}>
              {/* Restock */}
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setActionType('restock');
                }}
                style={[
                  styles.actionTab,
                  {
                    backgroundColor: actionType === 'restock' ? colors.successLight : colors.surfaceSubtle,
                    borderColor: actionType === 'restock' ? colors.success : colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Plus size={18} color={actionType === 'restock' ? colors.successText : colors.textMuted} />
                <Text
                  style={[
                    typography.captionBold,
                    {
                      color: actionType === 'restock' ? colors.successText : colors.text,
                      marginTop: 4,
                    },
                  ]}
                >
                  Restock (+)
                </Text>
              </TouchableOpacity>

              {/* Waste */}
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setActionType('waste');
                }}
                style={[
                  styles.actionTab,
                  {
                    backgroundColor: actionType === 'waste' ? colors.dangerLight : colors.surfaceSubtle,
                    borderColor: actionType === 'waste' ? colors.danger : colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Minus size={18} color={actionType === 'waste' ? colors.dangerText : colors.textMuted} />
                <Text
                  style={[
                    typography.captionBold,
                    {
                      color: actionType === 'waste' ? colors.dangerText : colors.text,
                      marginTop: 4,
                    },
                  ]}
                >
                  Waste (−)
                </Text>
              </TouchableOpacity>

              {/* Correction */}
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setActionType('correction');
                }}
                style={[
                  styles.actionTab,
                  {
                    backgroundColor: actionType === 'correction' ? colors.primaryLight : colors.surfaceSubtle,
                    borderColor: actionType === 'correction' ? colors.primary : colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Edit3 size={18} color={actionType === 'correction' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    typography.captionBold,
                    {
                      color: actionType === 'correction' ? colors.primary : colors.text,
                      marginTop: 4,
                    },
                  ]}
                >
                  Count (±)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quantity Input */}
            <Input
              label={
                actionType === 'restock'
                  ? 'Quantity to Add'
                  : actionType === 'waste'
                  ? 'Quantity to Deduct'
                  : 'Adjustment Delta'
              }
              placeholder="e.g. 10"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              containerStyle={{ marginTop: spacing.md }}
            />

            {/* Note / Audit Reason */}
            <Input
              label="Reason / Audit Note"
              placeholder={
                actionType === 'restock'
                  ? 'e.g. Fresh afternoon bake batch'
                  : actionType === 'waste'
                  ? 'e.g. Stale batch, dropped or burnt'
                  : 'e.g. Weekly physical inventory count correction'
              }
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />

            {/* Actions */}
            <View style={[styles.btnRow, { marginTop: spacing.md }]}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={{ flex: 1, marginRight: spacing.sm }}
              />

              <Button
                title="Confirm Adjustment"
                variant="primary"
                onPress={handleAdjust}
                loading={submitting}
                style={{ flex: 1.5 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    padding: 4,
  },
  currentStockBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBanner: {
    padding: 12,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  btnRow: {
    flexDirection: 'row',
    paddingBottom: 20,
  },
});
