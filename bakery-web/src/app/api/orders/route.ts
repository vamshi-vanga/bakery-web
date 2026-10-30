import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function buildOrderMessage(order: Record<string, any>) {
  const items = (Array.isArray(order.items) ? order.items : [])
    .map((item: any) => `${item.name}${item.selected_size ? ` (${item.selected_size})` : ''} × ${item.quantity} — ₹${Number(item.price || 0) * Number(item.quantity || 1)}`)
    .join('\n');

  return [
    `New Sample Cloud Bakery / Cloud Kitchen order ${order.order_id}`,
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone || 'Not provided'}`,
    `Items:\n${items || 'No items listed'}`,
    `Total: ₹${Number(order.total || 0)}`,
    order.notes ? `Note: ${order.notes}` : '',
  ].filter(Boolean).join('\n');
}

async function notifyBakeryOnWhatsApp(order: Record<string, any>) {
  let settingsNumber = '';
  try {
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('whatsapp_number')
      .eq('id', 'global')
      .maybeSingle();
    settingsNumber = settings?.whatsapp_number || '';
  } catch (error) {
    console.error('Could not load the bakery WhatsApp number:', error);
  }

  const recipient = normalizeWhatsAppNumber(settingsNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  const message = buildOrderMessage(order);
  const url = recipient
    ? `https://wa.me/${recipient}?text=${encodeURIComponent(`🧁 ${message}`)}`
    : '';

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_ORDER_TEMPLATE_NAME;
  const language = process.env.WHATSAPP_ORDER_TEMPLATE_LANGUAGE || 'en';
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v22.0';

  if (!accessToken || !phoneNumberId || !templateName || !recipient) {
    return { status: recipient ? 'manual' : 'not_configured', url };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: message.slice(0, 1024) }],
          }],
        },
      }),
    });

    if (!response.ok) {
      console.error('WhatsApp order notification failed:', response.status);
      return { status: 'failed', url };
    }

    return { status: 'sent', url: '' };
  } catch (error) {
    console.error('WhatsApp order notification error:', error);
    return { status: 'failed', url };
  }
}

// GET all orders (supports format=ledger)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (branchId && branchId !== 'ALL') {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) {
      // If error occurs (e.g. branch_id column doesn't exist), retry without filter
      if (branchId && branchId !== 'ALL') {
        const retry = await supabaseAdmin
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!retry.error) {
          const formatted = (retry.data || []).map((o: any, idx: number) => ({
            ...o,
            order_id: o.order_id || `#BK-${String(8000 + (retry.data.length - idx)).padStart(4, '0')}`,
          }));
          return NextResponse.json(formatted);
        }
      }
      throw error;
    }

    // Map to ensure order_id is present
    const formatted = (data || []).map((o: any, idx: number) => ({
      ...o,
      order_id: o.order_id || `#BK-${String(8000 + (data.length - idx)).padStart(4, '0')}`,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET Orders Error:', error);
    return NextResponse.json([]);
  }
}

// CREATE a new order (from customer checkout or POS)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.source === 'customer' && body.humanConfirmed !== true) {
      return NextResponse.json({ error: 'Please confirm that you are not a robot.' }, { status: 400 });
    }

    const orderNumber = `#BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const allowedStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    const safeStatus = allowedStatuses.includes(body.status) ? body.status : 'pending';

    const validOrderTypes = ['pos', 'dine_in', 'takeaway', 'delivery'];
    const safeOrderType = validOrderTypes.includes(body.order_type)
      ? body.order_type
      : body.source === 'customer' ? 'takeaway' : 'pos';

    const payload: Record<string, any> = {
      order_id: body.order_id || orderNumber,
      customer_name: (body.customer_name || 'Guest Customer').trim(),
      customer_phone: (body.customer_phone || '').trim() || 'Not provided',
      items: Array.isArray(body.items) ? body.items : [],
      total: Number(body.total) || 0,
      status: safeStatus,
      notes: body.notes || null,
      table_number: body.table_number || null,
      order_type: safeOrderType,
      payment_method: body.payment_method || 'cash',
      branch_id: body.branch_id && body.branch_id !== 'ALL' ? body.branch_id : null,
      branch_name: body.branch_name || null,
    };

    let data: any = null;

    // Attempt 1: Full payload with all POS & branch fields
    const fullResult = await supabaseAdmin
      .from('orders')
      .insert(payload)
      .select()
      .maybeSingle();

    if (fullResult.error) {
      console.warn('Full order insert failed (likely schema columns missing in Supabase), trying core schema:', fullResult.error.message);
      
      // Attempt 2: Fallback to guaranteed core schema columns
      const corePayload = {
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        items: payload.items,
        total: payload.total,
        status: payload.status,
        notes: payload.notes,
      };

      const coreResult = await supabaseAdmin
        .from('orders')
        .insert(corePayload)
        .select()
        .single();

      if (coreResult.error) {
        console.error('Core order insert failed:', coreResult.error);
        throw coreResult.error;
      }
      data = { ...coreResult.data, order_id: payload.order_id };
    } else {
      data = fullResult.data;
    }

    // Try to decrement inventory safely in background
    try {
      for (const item of (payload.items || [])) {
        if (!item.id) continue;
        const qty = Number(item.quantity) || 1;
        const { data: currentItem } = await supabaseAdmin
          .from('menu_items')
          .select('stock_quantity, track_inventory')
          .eq('id', item.id)
          .maybeSingle();

        if (currentItem && currentItem.track_inventory !== false && typeof currentItem.stock_quantity === 'number') {
          const newStock = Math.max(0, currentItem.stock_quantity - qty);
          await supabaseAdmin
            .from('menu_items')
            .update({ stock_quantity: newStock })
            .eq('id', item.id);
        }
      }
    } catch (invErr) {
      console.warn('Inventory decrement after order skipped:', invErr);
    }

    const whatsapp = body.source === 'customer'
      ? await notifyBakeryOnWhatsApp(data || payload)
      : undefined;

    return NextResponse.json({ success: true, order: data || payload, whatsapp });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    const message = error?.message || error?.details || 'Could not save your order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
