import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET all bakery notes
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('GET Notes Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new note
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, color, is_pinned, target_date, tags, checklist } = body;

    if (!content && (!checklist || checklist.length === 0)) {
      return NextResponse.json({ error: 'Note content or checklist is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
        title: title || null,
        content: content || '',
        color: color || 'amber',
        is_pinned: Boolean(is_pinned),
        target_date: target_date || null,
        tags: tags || [],
        checklist: checklist || [],
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, note: data });
  } catch (error: any) {
    console.error('POST Note Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update note (e.g. toggle pin, update checklist item, edit text, change color)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, note: data });
  } catch (error: any) {
    console.error('PUT Note Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
