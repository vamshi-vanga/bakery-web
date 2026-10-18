// ============================================================================
// Supabase Edge Function: send-whatsapp-receipt
// Description: Automated WhatsApp receipt delivery via Meta WhatsApp Cloud API (Phase 5b)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, bakeryId } = await req.json();

    if (!orderId || !bakeryId) {
      return new Response(JSON.stringify({ error: 'Missing orderId or bakeryId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch order details with order_items
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('bakery_id', bakeryId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!order.customer_phone) {
      return new Response(JSON.stringify({ error: 'Order has no customer phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = Deno.env.get('META_WHATSAPP_TOKEN');
    const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID');

    if (!token || !phoneNumberId) {
      // Return clear status that Meta API credentials are not yet configured (Phase 5a fallback)
      return new Response(
        JSON.stringify({
          success: false,
          fallback_to_manual: true,
          message: 'Meta WhatsApp credentials not configured on server. Please use manual send.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number
    const cleanPhone = order.customer_phone.replace(/\D/g, '');
    const toPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // Send via Meta Graph API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: `Your receipt for order ${order.order_number} is ready. Total: Rs. ${order.total}. Thank you for your purchase!`,
          },
        }),
      }
    );

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      await supabaseAdmin
        .from('orders')
        .update({ whatsapp_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      return new Response(JSON.stringify({ error: metaData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageId = metaData.messages?.[0]?.id;

    // Set to 'accepted' (never claim 'delivered' until webhook confirms)
    await supabaseAdmin
      .from('orders')
      .update({
        whatsapp_status: 'accepted',
        whatsapp_message_id: messageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({ success: true, messageId, status: 'accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
