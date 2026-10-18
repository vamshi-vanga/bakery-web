import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CheckCircle2,
  ShoppingBag,
  Share2,
  AlertTriangle,
  MessageCircle,
  Receipt,
  Smartphone,
  WifiOff,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import {
  ReceiptOrderData,
  sendWhatsAppReceiptManual,
  formatReceiptText,
} from '@/services/receipts';

export default function OrderSuccessScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderNumber?: string;
    orderId?: string;
    total?: string;
    paymentMethod?: string;
    itemCount?: string;
    hasWarnings?: string;
    isOffline?: string;
    customerName?: string;
    customerPhone?: string;
  }>();

  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';
  const { clearCart } = useCartStore();

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  useEffect(() => {
    // Clear active cart once order is confirmed
    clearCart();

    const backAction = () => {
      router.replace('/(main)/new-order');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [clearCart, router]);

  const handleNewSale = () => {
    router.replace('/(main)/new-order');
  };

  const receiptOrderData: ReceiptOrderData = {
    id: params.orderId ?? '',
    order_number: params.orderNumber ?? 'ORD-0000',
    total: parseFloat(params.total ?? '0'),
    payment_method: params.paymentMethod ?? 'cash',
    created_at: new Date().toISOString(),
    customer_name: params.customerName || null,
    customer_phone: params.customerPhone || null,
    whatsapp_status: whatsappSent ? 'manual' : params.customerPhone ? 'pending' : 'not_requested',
    items: [], // Loaded if viewed in modal or formatted below
  };

  const handleQuickWhatsAppSend = async () => {
    if (!params.customerPhone || !params.orderId || !currentBakery?.id) return;

    const summaryText = formatReceiptText(
      {
        ...receiptOrderData,
        items: [
          {
            item_name: `${params.itemCount ?? 1} Items`,
            quantity: 1,
            unit_price: parseFloat(params.total ?? '0'),
            line_total: parseFloat(params.total ?? '0'),
          },
        ],
      },
      currentBakery
    );

    await sendWhatsAppReceiptManual(
      params.customerPhone,
      summaryText,
      params.orderId,
      currentBakery.id
    );

    setWhatsappSent(true);
  };

  const handleShareReceipt = async () => {
    try {
      const shareMessage = `*${currentBakery?.name ?? 'Bakery'} Receipt*\nOrder Number: ${
        params.orderNumber
      }\nTotal: ${currency} ${params.total}\nPayment Method: ${params.paymentMethod?.toUpperCase()}\nThank you for visiting!`;
      await Share.share({
        message: shareMessage,
      });
    } catch (err) {
      console.error('Error sharing receipt:', err);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.xl }]}>
        {/* Success Icon */}
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: colors.successLight, borderRadius: borderRadius.full },
          ]}
        >
          <CheckCircle2 size={56} color={colors.success} />
        </View>

        <Text style={[typography.h1, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
          Order Completed!
        </Text>
        <Text style={[typography.subtitle, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
          Payment recorded and stock deducted
        </Text>

        {/* Receipt Card */}
        <Card style={{ marginTop: spacing.xl, width: '100%', alignItems: 'center' }}>
          <View style={styles.badgeRow}>
            <Badge label="PAID" variant="success" />
            <Badge
              label={(params.paymentMethod ?? 'cash').toUpperCase()}
              variant="neutral"
              style={{ marginLeft: 8 }}
            />
          </View>

          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
            Bill / Receipt Number
          </Text>
          <Text style={[typography.h1, { color: colors.primary, fontSize: 32, letterSpacing: 1 }]}>
            {params.orderNumber ?? 'ORD-0000'}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.detailRow}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Total Paid</Text>
            <Text style={[typography.h2, { color: colors.text }]}>
              {currency} {parseFloat(params.total ?? '0').toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[typography.body, { color: colors.textMuted }]}>Items Purchased</Text>
            <Text style={[typography.bodyBold, { color: colors.text }]}>
              {params.itemCount ?? '0'} line items
            </Text>
          </View>

          {params.customerPhone ? (
            <View style={styles.detailRow}>
              <Text style={[typography.body, { color: colors.textMuted }]}>Customer Phone</Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {params.customerPhone}
              </Text>
            </View>
          ) : null}

          {params.hasWarnings === 'true' && (
            <View
              style={[
                styles.warningBanner,
                {
                  backgroundColor: colors.primaryLight,
                  borderRadius: borderRadius.sm,
                  marginTop: spacing.md,
                },
              ]}
            >
              <AlertTriangle size={16} color={colors.accent} />
              <Text
                style={[
                  typography.captionBold,
                  { color: colors.accent, marginLeft: 6, flex: 1 },
                ]}
              >
                Stock override was approved for this transaction.
              </Text>
            </View>
          )}

          {params.isOffline === 'true' && (
            <View
              style={[
                styles.warningBanner,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: borderRadius.sm,
                  marginTop: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.accent,
                },
              ]}
            >
              <WifiOff size={16} color={colors.accent} />
              <Text
                style={[
                  typography.captionBold,
                  { color: colors.accent, marginLeft: 6, flex: 1 },
                ]}
              >
                Saved locally to SQLite. Will auto-sync when online.
              </Text>
            </View>
          )}
        </Card>

        {/* WhatsApp Receipt Actions */}
        {params.customerPhone ? (
          <View style={{ width: '100%', marginTop: spacing.md }}>
            <Button
              title={whatsappSent ? 'WhatsApp Sent ✓' : 'Send WhatsApp Receipt'}
              icon={
                whatsappSent ? (
                  <Smartphone size={18} color="#FFFFFF" />
                ) : (
                  <MessageCircle size={18} color="#FFFFFF" />
                )
              }
              variant={whatsappSent ? 'secondary' : 'primary'}
              onPress={handleQuickWhatsAppSend}
              style={{ width: '100%' }}
            />
          </View>
        ) : null}

        {/* Action Buttons */}
        <Button
          title="Start New Sale"
          size="lg"
          icon={<ShoppingBag size={20} color="#FFFFFF" />}
          onPress={handleNewSale}
          style={{ marginTop: spacing.md, width: '100%' }}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => setShowReceiptModal(true)}
            style={[
              styles.secondaryBtn,
              { borderColor: colors.border, borderRadius: borderRadius.md, marginRight: 8 },
            ]}
            activeOpacity={0.7}
          >
            <Receipt size={18} color={colors.primary} />
            <Text style={[typography.button, { color: colors.primary, marginLeft: 6 }]}>
              View Bill
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareReceipt}
            style={[
              styles.secondaryBtn,
              { borderColor: colors.border, borderRadius: borderRadius.md },
            ]}
            activeOpacity={0.7}
          >
            <Share2 size={18} color={colors.text} />
            <Text style={[typography.button, { color: colors.text, marginLeft: 6 }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Full Digital Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        order={receiptOrderData}
        onClose={() => setShowReceiptModal(false)}
        onStatusUpdated={() => setWhatsappSent(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 16,
  },
  detailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  warningBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
  },
});
