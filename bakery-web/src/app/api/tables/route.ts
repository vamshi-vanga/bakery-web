import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tables')
      .select('*')
      .order('table_number', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Fetch tables error:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('tables')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, table: data });
  } catch (err) {
    console.error('Create table error:', err);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing table ID' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, table: data });
  } catch (err) {
    console.error('Update table error:', err);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}
