// ============================================================================
// Supabase Edge Function: whatsapp-webhook
// Description: Webhook callback receiver for Meta WhatsApp delivery statuses (Phase 5b)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') ?? 'bakery-pos-verify-token';

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Webhook Verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Event Notifications (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const entries = body.entry ?? [];
      for (const entry of entries) {
        const changes = entry.changes ?? [];
        for (const change of changes) {
          const statuses = change.value?.statuses ?? [];
          for (const statusObj of statuses) {
            const messageId = statusObj.id;
            const metaStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

            let appStatus: string | null = null;
            if (metaStatus === 'sent') appStatus = 'accepted';
            else if (metaStatus === 'delivered' || metaStatus === 'read') appStatus = 'delivered';
            else if (metaStatus === 'failed') appStatus = 'failed';

            if (appStatus && messageId) {
              await supabaseAdmin
                .from('orders')
                .update({
                  whatsapp_status: appStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq('whatsapp_message_id', messageId);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
