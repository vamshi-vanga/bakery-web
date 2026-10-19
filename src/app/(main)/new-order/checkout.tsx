import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Banknote,
  QrCode,
  CreditCard,
  User,
  Phone,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useUIStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { submitOrder, InsufficientStockItem } from '@/services/orders';
import { haptic } from '@/utils/haptics';

export default function CheckoutScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();

  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';

  const {
    items,
    addItem,
    removeItem,
    deleteItem,
    getSubtotal,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    paymentMethod,
    setPaymentMethod,
    receiptRequested,
    setReceiptRequested,
  } = useCartStore();

  const subtotal = getSubtotal();

  // Cash tender calculator
  const [cashTendered, setCashTendered] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Insufficient stock confirmation modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [insufficientItems, setInsufficientItems] = useState<InsufficientStockItem[]>([]);

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeDue = tenderedAmount >= subtotal ? tenderedAmount - subtotal : 0;

  const handleProcessOrder = async (overrideStock = false) => {
    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (!currentBakery?.id) {
      setErrorMessage('Active bakery session not found.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const orderItems = items.map((i) => ({
        menu_item_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
        product_name: i.product.name,
      }));

      const result = await submitOrder({
        bakeryId: currentBakery.id,
        items: orderItems,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        receiptRequested,
        overrideInsufficientStock: overrideStock,
      });

      if (!result.success && result.requires_confirmation) {
        // Insufficient stock warning path
        haptic.warning();
        setInsufficientItems(result.insufficient_items);
        setShowStockModal(true);
        setSubmitting(false);
        return;
      }

      if (result.success) {
        haptic.success();
        setShowStockModal(false);
        // Navigate to success screen with order parameters
        router.replace({
          pathname: '/(main)/new-order/success',
          params: {
            orderNumber: result.order.order_number,
            orderId: result.order.order_id,
            total: result.order.total.toString(),
            paymentMethod: result.order.payment_method,
            itemCount: result.order.items.length.toString(),
            hasWarnings: result.order.stock_warnings ? 'true' : 'false',
            isOffline: result.order.is_offline ? 'true' : 'false',
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
          },
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to submit order.');
    } finally {
      setSubmitting(false);
    }
  };

  const getQuickCashSuggestions = () => {
    const ceil50 = Math.ceil(subtotal / 50) * 50;
    const ceil100 = Math.ceil(subtotal / 100) * 100;
    const ceil500 = Math.ceil(subtotal / 500) * 500;
    const suggestions = Array.from(new Set([subtotal, ceil50, ceil100, ceil500].filter((v) => v >= subtotal)));
    return suggestions;
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top Header */}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[typography.h3, { color: colors.text }]}>Checkout & Payment</Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerLight,
                borderColor: colors.danger,
                borderRadius: borderRadius.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Text style={[typography.captionBold, { color: colors.dangerText, fontSize: 13 }]}>
              {errorMessage}
            </Text>
            {(errorMessage.includes('TRIAL_EXPIRED') ||
              errorMessage.includes('SUBSCRIPTION') ||
              errorMessage.includes('expired')) && (
              <TouchableOpacity
                onPress={() => {
                  haptic.medium();
                  useUIStore.getState().openSubscriptionModal();
                }}
                style={styles.errorActionBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.errorActionBtnText}>Upgrade Bakery Plan Now →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Line Items List */}
        <Card>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Order Items ({items.length})
          </Text>

          {items.map((item) => (
            <View
              key={item.product.id}
              style={[
                styles.itemRow,
                { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: colors.text }]}>
                  {item.product.name}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {currency} {item.product.price.toFixed(2)} each
                </Text>
              </View>

              {/* Quantity Stepper */}
              <View style={styles.stepperWrapper}>
                <TouchableOpacity
                  onPress={() => {
                    haptic.light();
                    removeItem(item.product.id);
                  }}
                  style={[styles.stepperBtn, { backgroundColor: colors.surfaceSubtle }]}
                  activeOpacity={0.7}
                >
                  <Minus size={16} color={colors.text} />
                </TouchableOpacity>

                <Text style={[typography.bodyBold, { color: colors.text, minWidth: 28, textAlign: 'center', fontSize: 16 }]}>
                  {item.quantity}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    haptic.light();
                    addItem(item.product);
                  }}
                  style={[styles.stepperBtn, { backgroundColor: colors.primaryLight }]}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    haptic.medium();
                    deleteItem(item.product.id);
                  }}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              <Text style={[typography.bodyBold, { color: colors.primary, minWidth: 64, textAlign: 'right' }]}>
                {currency} {(item.product.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={[styles.totalRow, { marginTop: spacing.md }]}>
            <Text style={[typography.h3, { color: colors.text }]}>Total Payable</Text>
            <Text style={[typography.price, { color: colors.primary, fontSize: 24 }]}>
              {currency} {subtotal.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Payment Method Selector */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Select Payment Method
          </Text>

          <View style={styles.paymentMethodsRow}>
            {/* Cash */}
            <TouchableOpacity
              onPress={() => {
                haptic.selection();
                setPaymentMethod('cash');
              }}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: paymentMethod === 'cash' ? colors.primaryLight : colors.surfaceSubtle,
                  borderColor: paymentMethod === 'cash' ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              activeOpacity={0.8}
            >
              <Banknote size={24} color={paymentMethod === 'cash' ? colors.primary : colors.textMuted} />
              <Text
                style={[
                  typography.captionBold,
                  { color: paymentMethod === 'cash' ? colors.primary : colors.text, marginTop: 4 },
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>

            {/* UPI */}
            <TouchableOpacity
              onPress={() => {
                haptic.selection();
                setPaymentMethod('upi');
              }}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: paymentMethod === 'upi' ? colors.primaryLight : colors.surfaceSubtle,
                  borderColor: paymentMethod === 'upi' ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              activeOpacity={0.8}
            >
              <QrCode size={24} color={paymentMethod === 'upi' ? colors.primary : colors.textMuted} />
              <Text
                style={[
                  typography.captionBold,
                  { color: paymentMethod === 'upi' ? colors.primary : colors.text, marginTop: 4 },
                ]}
              >
                UPI QR
              </Text>
            </TouchableOpacity>

            {/* Card */}
            <TouchableOpacity
              onPress={() => {
                haptic.selection();
                setPaymentMethod('card');
              }}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: paymentMethod === 'card' ? colors.primaryLight : colors.surfaceSubtle,
                  borderColor: paymentMethod === 'card' ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              activeOpacity={0.8}
            >
              <CreditCard size={24} color={paymentMethod === 'card' ? colors.primary : colors.textMuted} />
              <Text
                style={[
                  typography.captionBold,
                  { color: paymentMethod === 'card' ? colors.primary : colors.text, marginTop: 4 },
                ]}
              >
                Card
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cash Tender Calculation */}
          {paymentMethod === 'cash' && (
            <View style={{ marginTop: spacing.md }}>
              <Input
                label="Cash Tendered by Customer"
                placeholder={`${currency} ${subtotal.toFixed(0)}`}
                value={cashTendered}
                onChangeText={setCashTendered}
                keyboardType="numeric"
              />

              {/* Quick Cash Chips */}
              <View style={styles.chipsRow}>
                {getQuickCashSuggestions().map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    onPress={() => {
                      haptic.light();
                      setCashTendered(amount.toString());
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          cashTendered === amount.toString() ? colors.primary : colors.surfaceSubtle,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color: cashTendered === amount.toString() ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      {currency} {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tenderedAmount > 0 && (
                <View
                  style={[
                    styles.changeBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      marginTop: spacing.sm,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Change Due</Text>
                  <Text
                    style={[
                      typography.price,
                      {
                        color: tenderedAmount >= subtotal ? colors.successText : colors.danger,
                        fontSize: 20,
                      },
                    ]}
                  >
                    {currency} {changeDue.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Customer Details & WhatsApp Receipt */}
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
            Customer & Digital Receipt
          </Text>

          <Input
            label="Customer Name (Optional)"
            placeholder="e.g. Rahul Sharma"
            value={customerName}
            onChangeText={setCustomerName}
            leftIcon={<User size={18} color={colors.textMuted} />}
          />

          <Input
            label="Customer Phone (For WhatsApp Receipt)"
            placeholder="+91 9876543210"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            leftIcon={<Phone size={18} color={colors.textMuted} />}
          />

          <View style={[styles.switchRow, { borderTopColor: colors.borderSubtle, borderTopWidth: 1 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>Send Digital Receipt</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Share receipt via WhatsApp / digital format
              </Text>
            </View>
            <Switch
              value={receiptRequested}
              onValueChange={setReceiptRequested}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        {/* Final Submit Button */}
        <Button
          title={`Charge ${currency} ${subtotal.toFixed(2)}`}
          onPress={() => handleProcessOrder(false)}
          loading={submitting}
          size="lg"
          style={{ marginTop: spacing.xl, marginBottom: 40 }}
        />
      </ScrollView>

      {/* Insufficient Stock Confirmation Modal */}
      <Modal
        visible={showStockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.xl,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconCircle,
                { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full },
              ]}
            >
              <AlertTriangle size={32} color={colors.accent} />
            </View>

            <Text
              style={[
                typography.h2,
                { color: colors.text, marginTop: spacing.md, textAlign: 'center' },
              ]}
            >
              Insufficient Stock
            </Text>

            <Text
              style={[
                typography.body,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              The following items in this order exceed current tracked inventory:
            </Text>

            <View style={{ marginVertical: spacing.md }}>
              {insufficientItems.map((item) => (
                <View
                  key={item.menu_item_id}
                  style={[
                    styles.stockWarningRow,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: borderRadius.sm,
                      padding: spacing.sm,
                      marginBottom: 6,
                    },
                  ]}
                >
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    {item.item_name}
                  </Text>
                  <Text style={[typography.captionBold, { color: colors.accent }]}>
                    Req: {item.requested_quantity} | Available: {item.available_stock}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
              As owner, you can override and record the sale anyway. Stock will be adjusted accordingly.
            </Text>

            <View style={[styles.modalActionsRow, { marginTop: spacing.lg }]}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowStockModal(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />

              <Button
                title="Confirm Override"
                variant="primary"
                onPress={() => handleProcessOrder(true)}
                loading={submitting}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  errorBanner: { padding: 12, borderWidth: 1 },
  errorActionBtn: {
    marginTop: 8,
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  errorActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    gap: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderWidth: 1.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockWarningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  modalActionsRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
