import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('DELETE Inventory Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
