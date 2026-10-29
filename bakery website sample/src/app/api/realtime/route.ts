import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: latestOrder } = await supabaseAdmin
    .from('orders')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastOrderId = String(latestOrder?.id || '');
  const encoder = new TextEncoder();
  let pollInterval: ReturnType<typeof setInterval> | undefined;
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
          if (pollInterval) clearInterval(pollInterval);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      };

      send('connected', { status: 'live' });

      pollInterval = setInterval(async () => {
        if (closed) return;

        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          send('status', { status: 'refreshing' });
          return;
        }

        const latestId = String(data?.id || '');
        if (latestId && latestId !== lastOrderId) {
          lastOrderId = latestId;
          send('order', { id: latestId });
        }
      }, 3000);

      heartbeatInterval = setInterval(() => {
        send('ping', { time: new Date().toISOString() });
      }, 20000);
    },
    cancel() {
      closed = true;
      if (pollInterval) clearInterval(pollInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
