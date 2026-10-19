import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Bakery, WhatsAppStatus } from '@/types/database';
import { format } from 'date-fns';

export interface ReceiptOrderData {
  id: string;
  order_number: string;
  total: number;
  payment_method: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  whatsapp_status?: WhatsAppStatus;
  items: {
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
}

/**
 * Normalizes phone number into international format without leading + or special characters.
 * E.g., '9876543210' -> '919876543210', '+91 98765-43210' -> '919876543210'.
 */
export function sanitizePhoneNumber(phone: string, defaultCountryCode = '91'): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  return digits;
}

/**
 * Formats an artisanal, professional text receipt for WhatsApp and digital sharing.
 */
export function formatReceiptText(order: ReceiptOrderData, bakery: Bakery | null): string {
  const bakeryName = bakery?.name ?? 'Artisan Bakery';
  const currency = bakery?.currency ?? 'INR';
  const dateStr = order.created_at
    ? format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a');

  let text = `🧾 *${bakeryName.toUpperCase()}*\n`;
  if (bakery?.address) {
    text += `📍 ${bakery.address}\n`;
  }
  if (bakery?.phone) {
    text += `📞 Ph: ${bakery.phone}\n`;
  }

  text += `--------------------------------\n`;
  text += `*Bill No:* ${order.order_number}\n`;
  text += `*Date:* ${dateStr}\n`;
  if (order.customer_name) {
    text += `*Customer:* ${order.customer_name}\n`;
  }
  text += `--------------------------------\n`;
  text += `*ITEMS*\n`;

  (order.items || []).forEach((item: any) => {
    const itemName = item.item_name || item.name || item.product_name || 'Item';
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unit_price ?? item.unit_price_snapshot ?? 0);
    const lineTotal = Number(item.line_total ?? quantity * unitPrice);
    text += `• ${itemName}\n`;
    text += `   ${quantity} x ${currency} ${unitPrice.toFixed(2)} = *${currency} ${lineTotal.toFixed(2)}*\n`;
  });

  text += `--------------------------------\n`;
  text += `*TOTAL AMOUNT: ${currency} ${Number(order.total || 0).toFixed(2)}*\n`;
  text += `*Payment:* ${(order.payment_method || 'CASH').toUpperCase()} (PAID)\n`;
  text += `--------------------------------\n`;
  text += `Thank you for visiting *${bakeryName}*!\n`;
  text += `Freshly baked with love.`;

  return text;
}

/**
 * Phase 5a: Launches WhatsApp directly on the device with formatted text.
 */
export async function sendWhatsAppReceiptManual(
  phone: string,
  receiptText: string,
  orderId: string,
  bakeryId: string
): Promise<{ success: boolean; url: string }> {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(receiptText);

  // Deep link try whatsapp:// protocol, fallback to wa.me web URL
  const nativeUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }

    // Update order whatsapp_status to 'manual' (Phase 5a)
    await updateOrderWhatsAppStatus(orderId, bakeryId, 'manual');

    return { success: true, url: supported ? nativeUrl : webUrl };
  } catch (err) {
    console.warn('Could not launch WhatsApp native URI, falling back to web URL:', err);
    await Linking.openURL(webUrl);
    await updateOrderWhatsAppStatus(orderId, bakeryId, 'manual');
    return { success: true, url: webUrl };
  }
}

/**
 * Updates the WhatsApp delivery status on an order.
 */
export async function updateOrderWhatsAppStatus(
  orderId: string,
  bakeryId: string,
  status: WhatsAppStatus,
  messageId?: string
): Promise<void> {
  try {
    // Try dedicated RPC first
    const { error: rpcError } = await supabase.rpc('update_order_whatsapp_status', {
      p_order_id: orderId,
      p_bakery_id: bakeryId,
      p_status: status,
      p_message_id: messageId ?? null,
    });

    if (!rpcError) {
      return;
    }

    // Fallback to direct table update with RLS policy
    const payload: Record<string, any> = {
      whatsapp_status: status,
      updated_at: new Date().toISOString(),
    };

    if (messageId) {
      payload.whatsapp_message_id = messageId;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId)
      .eq('bakery_id', bakeryId);

    if (updateError) {
      console.warn('Failed to update WhatsApp status:', updateError.message);
    }
  } catch (err: any) {
    console.warn('Error updating WhatsApp status:', err?.message ?? err);
  }
}

/**
 * Shares a high-resolution receipt image directly via the native share sheet / WhatsApp.
 */
export async function shareReceiptImage(
  imageUri: string,
  orderId?: string,
  bakeryId?: string,
  dialogTitle = 'Share Receipt Image'
): Promise<boolean> {
  const Sharing = await import('expo-sharing');
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this platform/device');
  }

  await Sharing.shareAsync(imageUri, {
    mimeType: 'image/png',
    dialogTitle,
    UTI: 'public.png',
  });

  if (orderId && bakeryId) {
    await updateOrderWhatsAppStatus(orderId, bakeryId, 'manual');
  }

  return true;
}

