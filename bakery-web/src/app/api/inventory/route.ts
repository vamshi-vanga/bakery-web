import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET all inventory items
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('GET Inventory Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create inventory item OR quick adjust stock
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // If quick stock adjustment
    if (body.action === 'adjust' && body.id) {
      const delta = Number(body.delta);
      const { data: current, error: fetchErr } = await supabaseAdmin
        .from('inventory')
        .select('current_stock')
        .eq('id', body.id)
        .single();

      if (fetchErr || !current) throw new Error('Inventory item not found');

      const newStock = Math.max(0, Number(current.current_stock) + delta);

      const { data, error } = await supabaseAdmin
        .from('inventory')
        .update({
          current_stock: newStock,
          last_restocked: delta > 0 ? new Date().toISOString() : undefined,
        })
        .eq('id', body.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    }

    // Standard Create New Item
    const { name, category, current_stock, unit, min_threshold, cost_per_unit, supplier } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and Category are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .insert({
        name,
        category,
        current_stock: Number(current_stock) || 0,
        unit: unit || 'kg',
        min_threshold: Number(min_threshold) || 5,
        cost_per_unit: Number(cost_per_unit) || 0,
        supplier: supplier || null,
        last_restocked: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    console.error('POST Inventory Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update inventory item details
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Inventory ID is required' }, { status: 400 });
    }

    if (updates.current_stock !== undefined) {
      updates.current_stock = Number(updates.current_stock);
    }
    if (updates.min_threshold !== undefined) {
      updates.min_threshold = Number(updates.min_threshold);
    }
    if (updates.cost_per_unit !== undefined) {
      updates.cost_per_unit = Number(updates.cost_per_unit);
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    console.error('PUT Inventory Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
