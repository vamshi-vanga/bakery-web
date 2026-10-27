import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
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
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { WhatsAppStatus } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/utils/haptics';
import {
  ReceiptOrderData,
  formatReceiptText,
  sendWhatsAppReceiptManual,
  shareReceiptImage,
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

  const receiptCardRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [asyncItems, setAsyncItems] = useState<any[]>([]);

  // Compute items list directly during render - React Compiler optimizes automatically
  const itemsList =
    order?.items && order.items.length > 0
      ? order.items.map((item: any) => ({
          item_name: item.item_name || item.name || item.product_name || item.item_name_snapshot || 'Item',
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price ?? item.unit_price_snapshot ?? 0),
          line_total: Number(
            item.line_total ??
              Number(item.quantity || 1) * Number(item.unit_price ?? item.unit_price_snapshot ?? 0)
          ),
        }))
      : asyncItems;

  // Fallback load itemized rows from DB if order.items was empty
  useEffect(() => {
    if (order?.items && order.items.length > 0) return;
    if (!order?.id) return;

    let isMounted = true;
    const fetchOrderItems = async () => {
      try {
        const { data } = await supabase
          .from('order_items')
          .select('item_name_snapshot, quantity, unit_price_snapshot, line_total')
          .eq('order_id', order.id);

        if (isMounted && data && data.length > 0) {
          setAsyncItems(
            data.map((item: any) => ({
              item_name: item.item_name_snapshot || 'Item',
              quantity: Number(item.quantity || 1),
              unit_price: Number(item.unit_price_snapshot || 0),
              line_total: Number(item.line_total ?? (Number(item.quantity || 1) * Number(item.unit_price_snapshot || 0))),
            }))
          );
        }
      } catch (err) {
        console.warn('Failed to load items in ReceiptModal:', err);
      }
    };

    fetchOrderItems();
    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.items]);

  if (!order) return null;

  const dateStr = order.created_at
    ? format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a');

  const receiptText = formatReceiptText({ ...order, items: itemsList }, currentBakery);

  /**
   * Captures the visual receipt card as a pristine, high-resolution PNG image.
   */
  const captureCardImage = async (): Promise<string | null> => {
    if (!receiptCardRef.current) return null;
    try {
      // Small pause to ensure layout rendering is complete
      await new Promise((r) => setTimeout(r, 60));
      if (typeof receiptCardRef.current.capture === 'function') {
        return await receiptCardRef.current.capture();
      }
      const uri = await captureRef(receiptCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      return uri;
    } catch (err) {
      console.error('Failed to capture receipt card image:', err);
      return null;
    }
  };

  /**
   * Primary Action: Captures the receipt card as an IMAGE and sends to WhatsApp via native share sheet.
   */
  const handleWhatsAppImageSend = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    haptic.medium();

    try {
      const imageUri = await captureCardImage();
      if (!imageUri) {
        throw new Error('Could not generate receipt image. Falling back to text message.');
      }

      await shareReceiptImage(
        imageUri,
        order.id,
        currentBakery?.id,
        `Bill #${order.order_number} for ${order.customer_name || 'Customer'}`
      );

      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err: any) {
      console.warn('Image share encountered issue, offering text fallback:', err);
      // Fallback: If image sharing failed, send formatted text via WhatsApp URL
      if (order.customer_phone && currentBakery?.id) {
        await sendWhatsAppReceiptManual(
          order.customer_phone,
          receiptText,
          order.id,
          currentBakery.id
        );
        if (onStatusUpdated) {
          onStatusUpdated();
        }
      } else {
        Alert.alert('Sharing Notice', err.message ?? 'Failed to share receipt image.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Secondary Action: Share / Print receipt image.
   */
  const handleShareReceiptImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    haptic.selection();

    try {
      const imageUri = await captureCardImage();
      if (imageUri) {
        await shareReceiptImage(
          imageUri,
          order.id,
          currentBakery?.id,
          `Receipt ${order.order_number}`
        );
      } else {
        await Share.share({ message: receiptText });
      }
    } catch (err) {
      console.error('Error sharing receipt:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Alternative Action: Send plain text via WhatsApp directly.
   */
  const handleSendTextFallback = async () => {
    if (!order.customer_phone || !currentBakery?.id) return;
    haptic.light();
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
      case 'manual':
        return (
          <View style={[styles.statusChip, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.xs }]}>
            <Smartphone size={12} color={colors.primary} />
            <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11, marginLeft: 4 }]}>
              Bill Sent via WhatsApp
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
              Digital Receipt: Not Sent Yet
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
            {/* Visual Paper Receipt Card (Captured as Image) */}
            <ViewShot
              ref={receiptCardRef}
              options={{ format: 'png', quality: 1.0 }}
              style={styles.paperReceiptCard}
            >
              {/* Bakery Header */}
              <Text style={styles.receiptBakeryName}>
                {currentBakery?.name ?? 'Artisan Bakery'}
              </Text>
              {currentBakery?.address ? (
                <Text style={styles.receiptAddress}>{currentBakery.address}</Text>
              ) : null}
              {currentBakery?.phone ? (
                <Text style={styles.receiptPhone}>Ph: {currentBakery.phone}</Text>
              ) : null}

              <View style={styles.receiptDashedLine} />

              {/* Bill Number & Payment Method Badge */}
              <View style={styles.receiptMetaRow}>
                <Text style={styles.receiptBillNo}>
                  Bill No: {order.order_number}
                </Text>
                <View style={styles.paymentMethodChip}>
                  <Text style={styles.paymentMethodText}>
                    {order.payment_method?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.receiptDate}>{dateStr}</Text>

              {order.customer_name ? (
                <Text style={styles.receiptCustomerText}>
                  Customer: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{order.customer_name}</Text>
                </Text>
              ) : null}

              {order.customer_phone ? (
                <Text style={styles.receiptCustomerPhone}>
                  Phone: {order.customer_phone}
                </Text>
              ) : null}

              <View style={styles.receiptDashedLine} />

              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCol, { flex: 2, textAlign: 'left' }]}>ITEM</Text>
                <Text style={[styles.tableHeaderCol, { flex: 0.9, textAlign: 'center' }]}>QTY</Text>
                <Text style={[styles.tableHeaderCol, { flex: 1.4, textAlign: 'right' }]}>AMOUNT</Text>
              </View>

              {/* Items List - Fully Displaying Items and Prices */}
              {itemsList.length > 0 ? (
                itemsList.map((item, index) => (
                  <View key={index} style={styles.itemTableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.itemNameText} numberOfLines={2}>
                        {item.item_name}
                      </Text>
                      {item.unit_price ? (
                        <Text style={styles.itemUnitPriceText}>
                          @{currency} {Number(item.unit_price).toFixed(2)}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={styles.itemQtyText}>
                      {item.quantity}
                    </Text>

                    <Text style={styles.itemAmountText}>
                      {currency} {Number(item.line_total).toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic' }}>
                    Loading item details...
                  </Text>
                </View>
              )}

              <View style={styles.receiptDashedLine} />

              {/* Total Row */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>
                  {currency} {Number(order.total).toFixed(2)}
                </Text>
              </View>

              {/* Receipt Footer */}
              <View style={styles.receiptFooter}>
                <Text style={styles.footerGreeting}>
                  Thank you for visiting {currentBakery?.name ?? 'our bakery'}!
                </Text>
                <Text style={styles.footerBranding}>
                  BakeFlow POS • Digital Customer Receipt
                </Text>
              </View>
            </ViewShot>

            {/* Delivery Status Badge */}
            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
              {renderStatusBadge(order.whatsapp_status)}
            </View>

            {/* Action Button: Send Image via WhatsApp */}
            <Button
              title={isCapturing ? 'Generating Bill Image...' : 'Send via WhatsApp'}
              icon={
                isCapturing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MessageCircle size={18} color="#FFFFFF" />
                )
              }
              onPress={handleWhatsAppImageSend}
              disabled={isCapturing}
              style={{ marginBottom: spacing.sm, backgroundColor: '#6366F1' }}
            />

            {/* Action Button: Share / Print Receipt */}
            <Button
              title="Share / Print Receipt"
              variant="outline"
              icon={<Share2 size={18} color={colors.primary} />}
              onPress={handleShareReceiptImage}
              disabled={isCapturing}
            />

            {/* Text Message Fallback Link */}
            {order.customer_phone ? (
              <TouchableOpacity
                onPress={handleSendTextFallback}
                style={styles.textFallbackBtn}
                activeOpacity={0.7}
              >
                <Text style={[typography.caption, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
                  Send as text WhatsApp message instead
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '92%',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    padding: 6,
  },
  /* Printable / Capturable Paper Receipt Card */
  paperReceiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  receiptBakeryName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  receiptAddress: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 3,
  },
  receiptPhone: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 1,
  },
  receiptDashedLine: {
    borderBottomWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptBillNo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentMethodChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 5,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  receiptDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  receiptCustomerText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
  },
  receiptCustomerPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  tableHeaderCol: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  itemTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  itemNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemUnitPriceText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemQtyText: {
    flex: 0.9,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 2,
  },
  itemAmountText: {
    flex: 1.4,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#6366F1',
  },
  receiptFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    alignItems: 'center',
  },
  footerGreeting: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerBranding: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  textFallbackBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
});
