import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function defaultSettings() {
  const whatsappNumber = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  return {
    brand_name: 'Sample Cloud Bakery / Cloud Kitchen',
    tagline: 'Freshly baked cloud kitchen favorites, made to be shared',
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
      brand_name: (!data.brand_name || data.brand_name === 'Crumbl Cloud Bakery' || data.brand_name === 'Sample Bakery')
        ? 'Sample Cloud Bakery / Cloud Kitchen'
        : data.brand_name,
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

    // In Supabase, the public.settings table currently contains:
    // id, brand_name, currency, tax_percent, allow_branch_menu_management, active_theme, theme_mode, inventory_tracking_enabled, updated_at
    const KNOWN_SETTINGS_COLS = [
      'id',
      'brand_name',
      'currency',
      'tax_percent',
      'allow_branch_menu_management',
      'active_theme',
      'theme_mode',
      'inventory_tracking_enabled',
    ];

    const safePayload: Record<string, any> = {
      id: 'global',
      updated_at: new Date().toISOString(),
    };

    for (const key of KNOWN_SETTINGS_COLS) {
      if (body[key] !== undefined) {
        safePayload[key] = body[key];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert(safePayload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Safe settings upsert warning:', error.message);
      // Fallback: minimal update of core attributes only
      const minimalPayload = {
        id: 'global',
        brand_name: body.brand_name || 'Sample Cloud Bakery / Cloud Kitchen',
        updated_at: new Date().toISOString(),
      };
      await supabaseAdmin.from('settings').upsert(minimalPayload);
    }

    return NextResponse.json({
      success: true,
      settings: { ...defaultSettings(), ...(data || {}), ...body },
    });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
