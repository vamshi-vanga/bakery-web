import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// UPDATE a category
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, category: data });
  } catch (err) {
    console.error('Update category error:', err);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE a category
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (authHeader !== `Bearer ${expectedPin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete category error:', err);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}