import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SAMPLE_CATEGORIES } from '@/data/mockMenu';

export const dynamic = 'force-dynamic';

// GET all categories
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      for (const cat of SAMPLE_CATEGORIES) {
        await supabaseAdmin.from('categories').upsert({
          name: cat.name,
          image_url: cat.image_url,
          subcategories: cat.subcategories,
        }, { onConflict: 'name' });
      }

      const { data: refreshed } = await supabaseAdmin
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      return NextResponse.json(refreshed || SAMPLE_CATEGORIES);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET Categories Error:', error);
    return NextResponse.json(SAMPLE_CATEGORIES);
  }
}

// CREATE a new category
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await supabaseAdmin.from('categories').insert(body).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    console.error('Create Category Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}