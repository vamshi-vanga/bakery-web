import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET a single menu item
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Fetch menu item error:', err);
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
}

// UPDATE a menu item
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const rawBody = await request.json();

    // Whitelist only columns that exist in public.menu_items
    const ALLOWED_COLUMNS = [
      'name', 'category', 'subcategory', 'description', 'price',
      'image_url', 'popular', 'available', 'track_inventory',
      'stock_quantity', 'daily_baked', 'low_stock_threshold',
      'pricing_type', 'size_variants'
    ];
    const cleanBody: Record<string, any> = {};
    for (const key of ALLOWED_COLUMNS) {
      if (rawBody[key] !== undefined) {
        cleanBody[key] = rawBody[key];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .update(cleanBody)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Update menu item with all fields failed, trying core update:', error.message);
      // Fallback: update without track_inventory if column not in schema
      const { track_inventory, ...coreFields } = cleanBody;
      const retry = await supabaseAdmin
        .from('menu_items')
        .update(coreFields)
        .eq('id', id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return NextResponse.json({ success: true, item: { ...retry.data, track_inventory } });
    }

    return NextResponse.json({ success: true, item: data || cleanBody });
  } catch (err) {
    console.error('Update menu item error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE a menu item
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { error } = await supabaseAdmin.from('menu_items').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete menu item error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}