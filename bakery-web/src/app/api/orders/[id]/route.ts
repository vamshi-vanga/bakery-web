import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// UPDATE order status (Accept: 'preparing', Reject: 'cancelled', etc.)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader && authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Map 'confirmed' to database-compatible 'completed' status
    const mappedStatus = body.status === 'confirmed' ? 'completed' : body.status;
    const updatePayload = { ...body, ...(mappedStatus ? { status: mappedStatus } : {}) };

    // 1. Try to update by primary UUID
    let { data, error } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    // 2. If not found or error, try by order_id (e.g. #BK-8299)
    if (!data && (!error || error.code === 'PGRST116')) {
      const retry = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('order_id', id)
        .select()
        .maybeSingle();
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) throw error;

    // If order was cancelled/rejected, safely restore item stocks
    if (body.status === 'cancelled' && data && Array.isArray(data.items)) {
      try {
        for (const item of data.items) {
          if (!item.id) continue;
          const qty = Number(item.quantity) || 1;
          const { data: currentItem } = await supabaseAdmin
            .from('menu_items')
            .select('stock_quantity, track_inventory')
            .eq('id', item.id)
            .maybeSingle();

          if (currentItem && currentItem.track_inventory !== false && typeof currentItem.stock_quantity === 'number') {
            await supabaseAdmin
              .from('menu_items')
              .update({ stock_quantity: currentItem.stock_quantity + qty })
              .eq('id', item.id);
          }
        }
      } catch (invErr) {
        console.warn('Inventory restore on reject skipped:', invErr);
      }
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: any) {
    console.error('Update order error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update order' }, { status: 500 });
  }
}

export { PUT as PATCH };

// DELETE an order
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader && authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    let { error } = await supabaseAdmin.from('orders').delete().eq('id', id);
    if (error) {
      const retry = await supabaseAdmin.from('orders').delete().eq('order_id', id);
      if (retry.error) throw retry.error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete order error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete order' }, { status: 500 });
  }
}
