import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { format } from 'date-fns';
import {
  X,
  Share2,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WhatsAppStatus } from '@/types/database';
import {
  ReceiptOrderData,
  formatReceiptText,
  sendWhatsAppReceiptManual,
} from '@/services/receipts';

interface Props {
  visible: boolean;
  order: ReceiptOrderData | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export function ReceiptModal({ visible, order, onClose, onStatusUpdated }: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();
  const { currentBakery } = useAuthStore();
  const currency = currentBakery?.currency ?? 'INR';

  if (!order) return null;

  const dateStr = order.created_at
    ? format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a');

  const receiptText = formatReceiptText(order, currentBakery);

  const handleShare = async () => {
    try {
      await Share.share({
        message: receiptText,
      });
    } catch (err) {
      console.error('Error sharing receipt:', err);
    }
  };

  const handleWhatsAppSend = async () => {
    if (!order.customer_phone || !currentBakery?.id) return;

    await sendWhatsAppReceiptManual(
      order.customer_phone,
      receiptText,
      order.id,
      currentBakery.id
    );

    if (onStatusUpdated) {
      onStatusUpdated();
    }
  };

  const renderStatusBadge = (status?: WhatsAppStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.successLight, borderRadius: borderRadius.xs }]}>
            <CheckCircle2 size={12} color={colors.success} />
            <Text style={[typography.captionBold, { color: colors.successText, fontSize: 11, marginLeft: 4 }]}>
              Delivered
            </Text>
          </View>
        );
      case 'accepted':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.infoLight, borderRadius: borderRadius.xs }]}>
            <CheckCircle2 size={12} color={colors.info} />
            <Text style={[typography.captionBold, { color: colors.infoText, fontSize: 11, marginLeft: 4 }]}>
              Sent (Accepted)
            </Text>
          </View>
        );
      case 'manual':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.xs }]}>
            <Smartphone size={12} color={colors.primary} />
            <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11, marginLeft: 4 }]}>
              Sent via Device
            </Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.xs }]}>
            <Clock size={12} color={colors.accent} />
            <Text style={[typography.captionBold, { color: colors.accent, fontSize: 11, marginLeft: 4 }]}>
              Pending Delivery
            </Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.dangerLight, borderRadius: borderRadius.xs }]}>
            <AlertCircle size={12} color={colors.danger} />
            <Text style={[typography.captionBold, { color: colors.dangerText, fontSize: 11, marginLeft: 4 }]}>
              Delivery Failed
            </Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.xs }]}>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
              Digital Receipt: Not Requested
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
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
              <Text style={[typography.h3, { color: colors.text }]}>Digital Receipt</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Invoice {order.order_number}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
            {/* Paper Receipt Card */}
            <Card variant="outlined" style={styles.paperReceipt}>
              <Text style={[typography.h2, { textAlign: 'center', color: colors.text }]}>
                {currentBakery?.name ?? 'Artisan Bakery'}
              </Text>
              {currentBakery?.address && (
                <Text style={[typography.caption, { textAlign: 'center', color: colors.textMuted }]}>
                  {currentBakery.address}
                </Text>
              )}
              {currentBakery?.phone && (
                <Text style={[typography.caption, { textAlign: 'center', color: colors.textMuted }]}>
                  Ph: {currentBakery.phone}
                </Text>
              )}

              <View style={[styles.dashedLine, { borderColor: colors.border }]} />

              <View style={styles.metaRow}>
                <Text style={[typography.captionBold, { color: colors.text }]}>
                  Bill No: {order.order_number}
                </Text>
                <Badge label={order.payment_method.toUpperCase()} variant="neutral" />
              </View>

              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {dateStr}
              </Text>

              {order.customer_name && (
                <Text style={[typography.caption, { color: colors.text, marginTop: 4 }]}>
                  Customer: <Text style={typography.captionBold}>{order.customer_name}</Text>
                </Text>
              )}

              {order.customer_phone && (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Phone: {order.customer_phone}
                </Text>
              )}

              <View style={[styles.dashedLine, { borderColor: colors.border }]} />

              {/* Items Table */}
              <View style={styles.tableHeader}>
                <Text style={[typography.captionBold, { color: colors.textMuted, flex: 2 }]}>ITEM</Text>
                <Text style={[typography.captionBold, { color: colors.textMuted, flex: 1, textAlign: 'center' }]}>
                  QTY
                </Text>
                <Text style={[typography.captionBold, { color: colors.textMuted, flex: 1.2, textAlign: 'right' }]}>
                  AMOUNT
                </Text>
              </View>

              {order.items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.text, flex: 2 }]} numberOfLines={1}>
                    {item.item_name}
                  </Text>
                  <Text style={[typography.body, { color: colors.textMuted, flex: 1, textAlign: 'center' }]}>
                    {item.quantity}
                  </Text>
                  <Text style={[typography.bodyBold, { color: colors.text, flex: 1.2, textAlign: 'right' }]}>
                    {currency} {item.line_total.toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={[styles.dashedLine, { borderColor: colors.border }]} />

              {/* Total Row */}
              <View style={styles.totalRow}>
                <Text style={[typography.h3, { color: colors.text }]}>TOTAL</Text>
                <Text style={[typography.price, { color: colors.primary, fontSize: 22 }]}>
                  {currency} {order.total.toFixed(2)}
                </Text>
              </View>
            </Card>

            {/* Delivery Status Badge */}
            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
              {renderStatusBadge(order.whatsapp_status)}
            </View>

            {/* Action Buttons */}
            {order.customer_phone && (
              <Button
                title="Send via WhatsApp"
                icon={<MessageCircle size={18} color="#FFFFFF" />}
                onPress={handleWhatsAppSend}
                style={{ marginBottom: spacing.sm }}
              />
            )}

            <Button
              title="Share / Print Receipt"
              variant="outline"
              icon={<Share2 size={18} color={colors.primary} />}
              onPress={handleShare}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    padding: 4,
  },
  paperReceipt: {
    padding: 16,
    borderRadius: 8,
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
});
