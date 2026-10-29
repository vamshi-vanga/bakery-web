import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAMPLE_MENU, SAMPLE_CATEGORIES } from '@/data/mockMenu';

export const dynamic = 'force-dynamic';

// GET all menu items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceSeed = searchParams.get('seed') === 'true';

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Auto-seed if database is empty, has under 15 items, or ?seed=true is requested
    if (forceSeed || !data || data.length < 15) {
      // Ensure categories exist
      for (const cat of SAMPLE_CATEGORIES) {
        await supabaseAdmin.from('categories').upsert({
          name: cat.name,
          image_url: cat.image_url,
          subcategories: cat.subcategories,
        }, { onConflict: 'name' });
      }

      // Upsert authentic Indian bakery items
      for (const item of SAMPLE_MENU) {
        const payload = {
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          popular: item.popular ?? false,
          available: item.available ?? true,
          track_inventory: item.track_inventory ?? true,
          stock_quantity: item.stock_quantity ?? 12,
          daily_baked: item.daily_baked ?? 20,
          low_stock_threshold: item.low_stock_threshold ?? 5,
          pricing_type: item.pricing_type ?? 'quantity',
          size_variants: item.size_variants ?? [],
        };

        const existing = data?.find((d) => d.name === item.name);
        if (existing) {
          await supabaseAdmin.from('menu_items').update(payload).eq('id', existing.id);
        } else {
          await supabaseAdmin.from('menu_items').insert(payload);
        }
      }

      // Re-fetch updated items
      const { data: updatedData } = await supabaseAdmin
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      return NextResponse.json(updatedData || SAMPLE_MENU);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET Menu Error:', error);
    return NextResponse.json(SAMPLE_MENU);
  }
}

// CREATE a new menu item
export async function POST(request: Request) {
  try {
    // Verify admin PIN
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await supabaseAdmin.from('menu_items').insert(body).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Create Menu Item Error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}