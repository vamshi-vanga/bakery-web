import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function defaultSettings() {
  const whatsappNumber = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  return {
    brand_name: 'Sample Bakery',
    tagline: 'Freshly baked, made to be shared',
    currency: '₹',
    tax_percent: 5,
    allow_branch_menu_management: true,
    active_theme: 'amber',
    theme_mode: 'dark',
    inventory_tracking_enabled: true,
    whatsapp_number: whatsappNumber,
    whatsapp_automation_configured: Boolean(
      whatsappNumber &&
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_ORDER_TEMPLATE_NAME
    ),
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('id', 'global')
      .single();

    if (error || !data) {
      return NextResponse.json(defaultSettings());
    }

    return NextResponse.json({
      ...defaultSettings(),
      ...data,
      brand_name: data.brand_name === 'Crumbl Cloud Bakery' ? 'Sample Bakery' : data.brand_name,
      whatsapp_number: normalizeWhatsAppNumber(data.whatsapp_number) || normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
      whatsapp_automation_configured: Boolean(
        (normalizeWhatsAppNumber(data.whatsapp_number) || normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)) &&
        process.env.WHATSAPP_ACCESS_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_ORDER_TEMPLATE_NAME
      ),
    });
  } catch (err) {
    console.error('Settings fetch error:', err);
    return NextResponse.json(defaultSettings());
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert({ id: 'global', ...body, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, settings: data });
  } catch (err) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
