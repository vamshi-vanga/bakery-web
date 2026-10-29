import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, delta, daily_baked, stock_quantity } = body;

    if (action === 'bake' && id) {
      // Add fresh baked batch to stock & daily baked
      const { data: current, error: fetchErr } = await supabaseAdmin
        .from('menu_items')
        .select('stock_quantity, daily_baked')
        .eq('id', id)
        .single();

      if (fetchErr || !current) throw new Error('Item not found');

      const addCount = Number(delta) || 12;
      const newStock = (Number(current.stock_quantity) || 0) + addCount;
      const newBaked = (Number(current.daily_baked) || 0) + addCount;

      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .update({
          stock_quantity: newStock,
          daily_baked: newBaked,
          available: newStock > 0,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    }

    if (action === 'adjust' && id) {
      const change = Number(delta) || 0;
      const { data: current, error: fetchErr } = await supabaseAdmin
        .from('menu_items')
        .select('stock_quantity, daily_baked')
        .eq('id', id)
        .single();

      if (fetchErr || !current) throw new Error('Item not found');

      const newStock = Math.max(0, (Number(current.stock_quantity) || 0) + change);
      const updates: any = {
        stock_quantity: newStock,
        available: newStock > 0,
      };
      if (newStock > (Number(current.daily_baked) || 0)) {
        updates.daily_baked = newStock;
      }

      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    }

    if (action === 'set' && id) {
      const newStock = Math.max(0, Number(stock_quantity) || 0);
      const updates: any = {
        stock_quantity: newStock,
        available: newStock > 0,
      };
      if (daily_baked !== undefined) {
        updates.daily_baked = Number(daily_baked);
      } else {
        const { data: current } = await supabaseAdmin
          .from('menu_items')
          .select('daily_baked')
          .eq('id', id)
          .single();
        if (current && (Number(current.daily_baked) || 0) < newStock) {
          updates.daily_baked = newStock;
        }
      }

      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    }

    if (action === 'toggle_availability' && id) {
      const { data: current, error: fetchErr } = await supabaseAdmin
        .from('menu_items')
        .select('available, stock_quantity')
        .eq('id', id)
        .single();

      if (fetchErr || !current) throw new Error('Item not found');

      const nextAvail = !current.available;
      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .update({
          available: nextAvail,
          // if marking available and stock was 0, restore default batch 12
          stock_quantity: nextAvail && Number(current.stock_quantity) <= 0 ? 12 : current.stock_quantity,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Stock Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
