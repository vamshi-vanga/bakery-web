'use client';

import React, { useState, useEffect } from 'react';
import { 
  Palette, Moon, Sun, 
  ShieldCheck, CheckCircle2, Save, Package,
  Store, KeyRound, Eye, EyeOff,
  ExternalLink, Clock, RefreshCw,
  Instagram
} from 'lucide-react';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme, Palette as PaletteType } from '@/lib/theme-context';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
    </svg>
  );
}

interface SettingsViewProps {
  inventoryTrackingEnabled?: boolean;
  onToggleInventoryTracking?: (enabled: boolean) => void;
}

export default function SettingsView({
  inventoryTrackingEnabled: propTracking = true,
  onToggleInventoryTracking,
}: SettingsViewProps) {
  const { mode, toggleMode, palette, setPalette, themeConfig } = useTheme();
  const isLight = mode === 'light';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'inventory' | 'social' | 'security'>('profile');

  // Form Fields
  const [brandName, setBrandName] = useState('Sample Cloud Bakery / Cloud Kitchen');
  const [tagline, setTagline] = useState('Freshly baked, made to be shared');
  const [currency, setCurrency] = useState('₹');
  const [taxPercent, setTaxPercent] = useState('5.00');
  const [operatingHours, setOperatingHours] = useState('');
  const [adminPin, setAdminPin] = useState('779911');
  const [showPin, setShowPin] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [whatsappAutomationReady, setWhatsappAutomationReady] = useState(false);
  const [localTracking, setLocalTracking] = useState(propTracking);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const inventoryTrackingEnabled = onToggleInventoryTracking ? propTracking : localTracking;

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.brand_name) setBrandName(data.brand_name);
        if (data.tagline) setTagline(data.tagline);
        if (data.currency) setCurrency(data.currency);
        if (data.tax_percent) setTaxPercent(String(data.tax_percent));
        if (data.operating_hours) setOperatingHours(data.operating_hours);
        if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
        if (data.instagram_handle) setInstagramHandle(data.instagram_handle);
        setWhatsappAutomationReady(Boolean(data.whatsapp_automation_configured));
        if (data.inventory_tracking_enabled !== undefined) {
          const val = Boolean(data.inventory_tracking_enabled);
          if (onToggleInventoryTracking) {
            onToggleInventoryTracking(val);
          } else {
            setLocalTracking(val);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [onToggleInventoryTracking]);

  const handleToggleInventoryTracking = async () => {
    const nextState = !inventoryTrackingEnabled;
    if (onToggleInventoryTracking) {
      onToggleInventoryTracking(nextState);
    } else {
      setLocalTracking(nextState);
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName,
          tagline,
          currency,
          tax_percent: Number(taxPercent),
          operating_hours: operatingHours,
          whatsapp_number: whatsappNumber.replace(/\D/g, ''),
          instagram_handle: instagramHandle.replace(/^@/, ''),
          active_theme: palette,
          theme_mode: mode,
          inventory_tracking_enabled: nextState,
        }),
      });
      if (!response.ok) throw new Error('Could not save bakery settings.');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName,
          tagline,
          currency,
          tax_percent: Number(taxPercent),
          operating_hours: operatingHours,
          whatsapp_number: whatsappNumber.replace(/\D/g, ''),
          instagram_handle: instagramHandle.replace(/^@/, ''),
          active_theme: palette,
          theme_mode: mode,
          inventory_tracking_enabled: inventoryTrackingEnabled,
        }),
      });
      if (!response.ok) throw new Error('Could not save bakery settings.');

      const settings = await fetch('/api/settings').then((result) => result.json());
      setWhatsappAutomationReady(Boolean(settings.whatsapp_automation_configured));

      if (onToggleInventoryTracking) {
        onToggleInventoryTracking(inventoryTrackingEnabled);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Could not save your settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const palettes: { id: PaletteType; label: string; color: string; desc: string }[] = [
    { id: 'amber', label: 'Artisan Amber', color: '#F59E0B', desc: 'Warm French Golden Croissant' },
    { id: 'caramel', label: 'French Caramel', color: '#C68B59', desc: 'Dulce De Leche & Toffee' },
    { id: 'emerald', label: 'Matcha Emerald', color: '#10B981', desc: 'Japanese Ceremonial Uji Matcha' },
    { id: 'rose', label: 'Berry Rose', color: '#F43F5E', desc: 'Wild Raspberry & Ruby Velvet' },
    { id: 'indigo', label: 'Nordic Indigo', color: '#6366F1', desc: 'Modern Scandinavian Midnight' },
    { id: 'violet', label: 'Royal Violet', color: '#8B5CF6', desc: 'Lavender Vanilla Velvet' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border"
              style={{ backgroundColor: themeConfig.light, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              Settings
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Bakery profile, ordering and appearance</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Make the bakery yours
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Save changes when ready</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'profile', label: 'Bakery profile', icon: Store },
          { id: 'theme', label: 'Appearance', icon: Palette },
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'social', label: 'WhatsApp', icon: WhatsAppIcon },
          { id: 'security', label: 'Security', icon: KeyRound },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 select-none ${
                isActive
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/40'
                  : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BAKERY BRAND & PROFILE */}
        {activeTab === 'profile' && (
          <Glass isLight={isLight} className="p-6 sm:p-8 space-y-6 rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">Bakery Identity &amp; Fiscal Settings</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Public brand name, currency symbol, and regional tax configuration
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Brand Name
                  </label>
                  <input
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Sample Cloud Bakery / Cloud Kitchen"
                    className={`${inputCls(isLight)} !py-2.5`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Displayed on customer storefront, receipts, and order headers.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Brand Tagline / Subtitle
                  </label>
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Freshly baked, made to be shared"
                    className={`${inputCls(isLight)} !py-2.5`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Appears under brand logo on client pages.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={`${inputCls(isLight)} !py-2.5 font-mono text-base font-bold`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Default GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className={`${inputCls(isLight)} !py-2.5 font-mono text-base font-bold`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">E.g. 5% applied automatically in POS tickets.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Operating Hours
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      placeholder="08:00 AM – 10:30 PM"
                      className={`${inputCls(isLight)} !py-2.5 !pl-9 text-xs`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Glass>
        )}

        {/* TAB 2: LOOK & VISUAL STUDIO */}
        {activeTab === 'theme' && (
          <Glass isLight={isLight} className="p-6 sm:p-8 space-y-8 rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">Visual Themes &amp; Accent Studio</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Customize the bakery admin console aesthetic and color harmony
                  </p>
                </div>
              </div>
            </div>

            {/* Display Mode Selector Cards */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Console Display Mode
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { if (mode !== 'dark') toggleMode(); }}
                  className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    !isLight
                      ? 'border-amber-500 bg-[#16161a] ring-2 ring-amber-500/30 shadow-xl'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-amber-400 border border-white/10">
                        <Moon className="w-4 h-4" />
                      </div>
                      <span className="font-serif font-black text-sm text-white">Obsidian Onyx Dark</span>
                    </div>
                    {!isLight && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    High contrast, low eye fatigue for long kitchen shifts and busy bakery counters.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => { if (mode !== 'light') toggleMode(); }}
                  className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    isLight
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/30 shadow-xl'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 border border-amber-300">
                        <Sun className="w-4 h-4" />
                      </div>
                      <span className={`font-serif font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Crisp Studio Light
                      </span>
                    </div>
                    {isLight && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                    Bright daylight layout inspired by artisan culinary ateliers and boutique cafes.
                  </p>
                </button>
              </div>
            </div>

            {/* Accent Palettes */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Curated Artisan Brand Palettes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {palettes.map((p) => {
                  const isCurrent = palette === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPalette(p.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isCurrent
                          ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-1 ring-amber-500/30'
                          : isLight
                            ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white/20 shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className={`text-xs font-black ${isCurrent ? 'text-amber-400' : isLight ? 'text-slate-900' : 'text-white'}`}>
                            {p.label}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-black text-amber-400 uppercase">Selected</span>
                        )}
                      </div>
                      <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Glass>
        )}

        {/* TAB 3: INVENTORY MASTER CONTROL */}
        {activeTab === 'inventory' && (
          <Glass isLight={isLight} className="p-6 sm:p-8 space-y-6 rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">Inventory System Architecture</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Control whether shelf stock is tracked or treated as made-to-order
                  </p>
                </div>
              </div>

              <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                inventoryTrackingEnabled
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {inventoryTrackingEnabled ? '● Tracking Active' : '○ Tracking Disabled'}
              </span>
            </div>

            {/* Master Switch Banner */}
            <div
              className={`p-6 rounded-3xl border transition-all ${
                inventoryTrackingEnabled
                  ? isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-500/5 border-amber-500/20'
                  : isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Master Inventory Tracking Switch
                  </h4>
                  <p className={`text-xs max-w-xl leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    {inventoryTrackingEnabled
                      ? 'The inventory tracking system is actively enabled. Display shelves count remaining units, decrement upon sale, and trigger low-stock alerts.'
                      : 'Inventory tracking is globally disabled. All items are considered always available and made fresh to order without stock warnings.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleInventoryTracking}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    inventoryTrackingEnabled ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : isLight ? 'bg-slate-300' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      inventoryTrackingEnabled ? 'translate-x-8' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status Comparison Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
                <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/5'}`}>
                  <p className="font-black text-amber-500 mb-1.5 uppercase text-[10px] tracking-wider">
                    When Active (Enabled)
                  </p>
                  <ul className="space-y-1.5 text-gray-400 text-[11px]">
                    <li className="flex items-center gap-1.5">✓ Ready-to-sell display shelf counters active</li>
                    <li className="flex items-center gap-1.5">✓ Morning oven batch logs increment available stock</li>
                    <li className="flex items-center gap-1.5">✓ Automatic &quot;Low Stock&quot; and &quot;Sold Out&quot; badges</li>
                  </ul>
                </div>

                <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/5'}`}>
                  <p className="font-black text-sky-400 mb-1.5 uppercase text-[10px] tracking-wider">
                    When Disabled (Off)
                  </p>
                  <ul className="space-y-1.5 text-gray-400 text-[11px]">
                    <li className="flex items-center gap-1.5">✓ All products remain permanently orderable</li>
                    <li className="flex items-center gap-1.5">✓ Zero stock-decrement blockers during high-demand rushes</li>
                    <li className="flex items-center gap-1.5">✓ Best suited for made-to-order cloud bakeries</li>
                  </ul>
                </div>
              </div>
            </div>
          </Glass>
        )}

        {/* TAB 4: SOCIAL & WHATSAPP CHANNELS */}
        {activeTab === 'social' && (
          <Glass isLight={isLight} className="p-6 sm:p-8 space-y-6 rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">WhatsApp orders</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Choose where order alerts should go and check the delivery setup
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* WhatsApp Config Card */}
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-xs">WhatsApp Dispatch Number</span>
                  </div>
                  <a
                    href={whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hi! Testing Sample Cloud Bakery / Cloud Kitchen WhatsApp order dispatch channel.')}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!whatsappNumber}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold text-white transition-colors ${whatsappNumber ? 'bg-emerald-600 hover:bg-emerald-500' : 'cursor-not-allowed bg-slate-500'}`}
                  >
                    <span>Test WhatsApp Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9+\s()-]/g, ''))}
                  placeholder="Country code + number"
                  className={`${inputCls(isLight)} !py-2.5 font-mono text-sm`}
                />
                <span className="text-[10px] text-gray-400 mt-1.5 block">
                  Use the country code and number. If automatic WhatsApp delivery is not enabled, customers can open a prepared message and send it themselves.
                </span>
                <div className={`mt-4 rounded-xl border px-3.5 py-3 text-xs leading-5 ${whatsappAutomationReady ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>
                  {whatsappAutomationReady
                    ? 'Automatic order alerts are configured. New customer orders will be sent to this number.'
                    : 'Automatic alerts need WhatsApp Cloud API credentials and an approved order template on the server.'}
                </div>
              </div>

              {/* Instagram Config Card */}
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-rose-500" />
                    <span className="font-bold text-xs">Instagram Official Profile</span>
                  </div>
                  <a
                    href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                  >
                    <span>Open Instagram Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">@</span>
                  <input
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))}
                    placeholder="samplebakery"
                    className={`${inputCls(isLight)} !py-2.5 !pl-8 text-sm`}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1.5 block">
                  Saved with your bakery profile for future storefront links.
                </span>
              </div>
            </div>
          </Glass>
        )}

        {/* TAB 5: SECURITY & TERMINAL PIN */}
        {activeTab === 'security' && (
          <Glass isLight={isLight} className="p-6 sm:p-8 space-y-6 rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">Admin Terminal Security &amp; Access</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    PIN authorization for catalog modification and administrative commands
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Admin Terminal PIN (6 digits)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className={`${inputCls(isLight)} !py-2.5 !pr-10 font-mono tracking-widest text-lg font-black`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 mt-1.5 block">
                  Default: <code>779911</code>. Required to save catalog items and update business preferences.
                </span>
              </div>

              <div className={`p-4 rounded-2xl border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <p className="font-bold mb-1">Terminal Security Guidelines</p>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  To lock the terminal at any time during store operations, click the &quot;Lock Terminal&quot; button in the lower left navigation drawer. Re-entry requires this 6-digit PIN.
                </p>
              </div>
            </div>
          </Glass>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 sticky bottom-4 z-20 backdrop-blur-xl ${
          isLight ? 'bg-white/90 border-slate-200 shadow-xl' : 'bg-[#18181B]/90 border-white/10 shadow-2xl'
        }`}>
          <div className="flex items-center gap-2">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> System preferences saved to cloud!
              </span>
            ) : (
              <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                Changes take effect across customer ordering and admin console immediately.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
