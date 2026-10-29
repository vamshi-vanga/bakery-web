'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Package, Search, AlertTriangle, 
  CheckCircle2, X, RotateCcw, 
  Flame, ShoppingBag, Plus, Minus, ChefHat, Eye, EyeOff,
  Check, Pencil
} from 'lucide-react';
import { Dish, Category } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface InventoryViewProps {
  dishes: Dish[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
  categories: Category[];
  onRefresh?: () => void;
  inventoryTrackingEnabled?: boolean;
  onToggleInventoryTracking?: (enabled: boolean) => void;
  onNavigateToSettings?: () => void;
}

export default function InventoryView({
  dishes,
  setDishes,
  categories,
  onRefresh,
  inventoryTrackingEnabled = true,
  onToggleInventoryTracking,
  onNavigateToSettings,
}: InventoryViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'sold_out' | 'tracked' | 'untracked'>('all');

  // Quick Batch Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline Click-to-Edit Stock
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');

  const startEditingStock = (dish: Dish) => {
    setEditingStockId(dish.id);
    setEditingStockValue(String(dish.stock_quantity ?? 0));
  };

  // Grouped sets
  const trackedDishes = dishes.filter((d) => d.track_inventory !== false);
  const untrackedDishes = dishes.filter((d) => d.track_inventory === false);

  // Metrics
  const totalBakedToday = trackedDishes.reduce((acc, d) => acc + (Number(d.daily_baked) || 0), 0);
  const totalSoldToday = dishes.reduce((acc, d) => acc + (Number(d.sold_today) || 0), 0);
  const totalStockOnShelf = trackedDishes.reduce((acc, d) => acc + (Number(d.stock_quantity) || 0), 0);
  const lowStockItems = trackedDishes.filter((d) => (Number(d.stock_quantity) || 0) > 0 && (Number(d.stock_quantity) || 0) <= (Number(d.low_stock_threshold) || 5));
  const soldOutItems = trackedDishes.filter((d) => (Number(d.stock_quantity) || 0) <= 0 || !d.available);

  // Filtered List
  const categoryNames = ['All', ...categories.map((c) => c.name)];
  const filteredDishes = dishes.filter((dish) => {
    const matchesCat = activeCategory === 'All' || dish.category === activeCategory;
    const matchesSearch = !search || dish.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    const isTracked = dish.track_inventory !== false;
    const stock = Number(dish.stock_quantity) || 0;
    const threshold = Number(dish.low_stock_threshold) || 5;

    if (statusFilter === 'low') {
      matchesStatus = isTracked && stock > 0 && stock <= threshold;
    } else if (statusFilter === 'sold_out') {
      matchesStatus = isTracked && (stock <= 0 || !dish.available);
    } else if (statusFilter === 'tracked') {
      matchesStatus = isTracked;
    } else if (statusFilter === 'untracked') {
      matchesStatus = !isTracked;
    }

    return matchesCat && matchesSearch && matchesStatus;
  });

  // Action: Toggle tracking for an individual product
  const handleToggleProductTracking = async (dish: Dish) => {
    const nextTrack = dish.track_inventory === false;
    // Normalize stock if it was previously set to 9999 or 9997
    const currentStock = Number(dish.stock_quantity) || 0;
    const restoredStock = nextTrack ? (currentStock > 0 && currentStock < 500 ? currentStock : 12) : 0;

    try {
      const payload = {
        ...dish,
        track_inventory: nextTrack,
        stock_quantity: restoredStock,
      };

      const res = await fetch(`/api/menu/${dish.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 779911',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDishes((prev) =>
          prev.map((d) =>
            d.id === dish.id
              ? {
                  ...d,
                  track_inventory: nextTrack,
                  stock_quantity: restoredStock,
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Set exact stock directly (Click to edit)
  const handleSetExactStock = async (dish: Dish, exactValue: number) => {
    const newStock = Math.max(0, exactValue);
    setEditingStockId(null);

    // Optimistic UI update
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dish.id
          ? {
              ...d,
              stock_quantity: newStock,
              available: newStock > 0,
              daily_baked: Math.max(Number(d.daily_baked) || 0, newStock),
            }
          : d
      )
    );

    try {
      const res = await fetch('/api/menu/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          id: dish.id,
          stock_quantity: newStock,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setDishes((prev) => prev.map((d) => (d.id === dish.id ? data.item : d)));
      }
    } catch (err) {
      console.error('Failed to set stock:', err);
    }
  };

  // Action: Add freshly baked batch (+12, +24, etc.)
  const handleQuickAddBatch = async (dish: Dish, delta: number) => {
    try {
      const res = await fetch('/api/menu/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bake',
          id: dish.id,
          delta,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setDishes((prev) => prev.map((d) => (d.id === dish.id ? data.item : d)));
      } else {
        alert('Stock update failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error updating batch stock.');
    }
  };

  // Action: Adjust stock (+1, -1, spoilage/tester)
  const handleAdjustStock = async (dish: Dish, delta: number) => {
    try {
      const res = await fetch('/api/menu/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          id: dish.id,
          delta,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setDishes((prev) => prev.map((d) => (d.id === dish.id ? data.item : d)));
      } else {
        alert('Stock update failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error adjusting stock.');
    }
  };

  // Action: Toggle availability (Mark Sold Out / Available)
  const handleToggleAvailability = async (dish: Dish) => {
    try {
      const res = await fetch('/api/menu/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_availability',
          id: dish.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.item) {
        setDishes((prev) => prev.map((d) => (d.id === dish.id ? data.item : d)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Modal Submit: Add Fresh Bake Batch
  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDish) return;
    try {
      setIsSubmitting(true);
      await handleQuickAddBatch(selectedDish, batchQuantity);
      setShowBatchModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: themeConfig.primary }}
            />
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Fresh Bakery Inventory & Display Case
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Ready-to-Sell Bakery Goods
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            Real-time display case inventory. Track morning bake batches, shelf stock, sell-through rates, and instant sold-out states.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-2.5 rounded-xl border transition-colors ${
                isLight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-white/10 hover:bg-white/5 text-gray-300'
              }`}
              title="Refresh Inventory"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              setSelectedDish(dishes[0] || null);
              setBatchQuantity(12);
              setShowBatchModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 text-black hover:opacity-95"
            style={{ backgroundColor: themeConfig.primary }}
          >
            <ChefHat className="w-4 h-4" />
            Log Fresh Oven Batch
          </button>
        </div>
      </div>

      {/* GLOBAL INVENTORY TRACKING OFF BANNER */}
      {!inventoryTrackingEnabled && (
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-md ${
          isLight ? 'bg-amber-50/95 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/30 text-amber-100'
        }`}>
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif font-bold text-sm">Inventory Tracking System is Switched OFF</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Settings Toggle
                </span>
              </div>
              <p className={`text-xs mt-0.5 leading-relaxed ${isLight ? 'text-amber-900/80' : 'text-amber-200/80'}`}>
                Stock quantities, low-stock warnings, and oven logs are currently silenced. All bakery items are treated as made-to-order and always available with unlimited stock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleInventoryTracking && (
              <button
                onClick={() => onToggleInventoryTracking(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Turn Tracking ON
              </button>
            )}
            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  isLight ? 'border-amber-300 hover:bg-amber-100/50 text-amber-900' : 'border-amber-500/30 hover:bg-amber-500/10 text-amber-200'
                }`}
              >
                Open Settings
              </button>
            )}
          </div>
        </div>
      )}

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Glass isLight={isLight} className="p-5 flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Available on Shelf
            </p>
            <h3 className="text-2xl font-serif font-bold mt-1 text-emerald-500">
              {totalStockOnShelf} <span className="text-sm font-sans font-normal text-gray-400">units</span>
            </h3>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
              Ready in bakery display counter
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Package className="w-6 h-6" />
          </div>
        </Glass>

        <Glass isLight={isLight} className="p-5 flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Daily Baked Output
            </p>
            <h3 className="text-2xl font-serif font-bold mt-1 text-amber-500">
              {totalBakedToday} <span className="text-sm font-sans font-normal text-gray-400">units</span>
            </h3>
            <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
              Freshly prepared by pastry chefs today
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
        </Glass>

        <Glass isLight={isLight} className="p-5 flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Sold Today
            </p>
            <h3 className="text-2xl font-serif font-bold mt-1 text-indigo-400">
              {totalSoldToday} <span className="text-sm font-sans font-normal text-gray-400">items</span>
            </h3>
            <p className="text-[11px] text-indigo-400/90 font-medium mt-0.5">
              Fitted through counter POS & orders
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </Glass>

        <Glass isLight={isLight} className="p-5 flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Low Stock & Sold Out
            </p>
            <h3 className="text-2xl font-serif font-bold mt-1 text-rose-500">
              {lowStockItems.length + soldOutItems.length}
            </h3>
            <p className="text-[11px] text-rose-400/90 font-medium mt-0.5">
              {soldOutItems.length} sold out, {lowStockItems.length} low stock
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </Glass>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <Glass isLight={isLight} className="p-4 space-y-4">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'text-black shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
              style={{
                backgroundColor: activeCategory === cat ? themeConfig.primary : undefined,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Stock Status Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search baked items (croissant, cookie, cake)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls(isLight)} pl-9 text-xs`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <div className={`flex items-center rounded-xl p-0.5 border shrink-0 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === 'all'
                    ? isLight ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({dishes.length})
              </button>
              <button
                onClick={() => setStatusFilter('tracked')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === 'tracked'
                    ? isLight ? 'bg-white text-amber-600 shadow-sm' : 'bg-white/10 text-amber-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tracked ({trackedDishes.length})
              </button>
              <button
                onClick={() => setStatusFilter('untracked')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === 'untracked'
                    ? isLight ? 'bg-white text-sky-600 shadow-sm' : 'bg-white/10 text-sky-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Untracked ({untrackedDishes.length})
              </button>
              <button
                onClick={() => setStatusFilter('low')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === 'low'
                    ? isLight ? 'bg-white text-amber-600 shadow-sm' : 'bg-white/10 text-amber-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Low ({lowStockItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('sold_out')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === 'sold_out'
                    ? isLight ? 'bg-white text-rose-600 shadow-sm' : 'bg-white/10 text-rose-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sold Out ({soldOutItems.length})
              </button>
            </div>
          </div>
        </div>
      </Glass>

      {/* BAKED GOODS DISPLAY CASE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDishes.map((dish) => {
          const isTracked = dish.track_inventory !== false;
          const stock = Number(dish.stock_quantity) || 0;
          const baked = Math.max(Number(dish.daily_baked) || 0, stock);
          const threshold = Number(dish.low_stock_threshold) || 5;
          const isSoldOut = isTracked && (stock <= 0 || !dish.available);
          const isLowStock = isTracked && !isSoldOut && stock <= threshold;
          const soldCount = Math.max(0, baked - stock);
          const sellThroughPct = isTracked && baked > 0 ? Math.min(100, Math.max(0, Math.round((soldCount / baked) * 100))) : 0;

          return (
            <Glass 
              key={dish.id} 
              isLight={isLight} 
              className={`p-4 flex flex-col justify-between transition-all duration-200 border ${
                !isTracked
                  ? 'border-sky-500/20'
                  : isSoldOut 
                  ? 'border-rose-500/30 opacity-90' 
                  : isLowStock 
                  ? 'border-amber-500/40 shadow-sm shadow-amber-500/5' 
                  : 'hover:border-white/20'
              }`}
            >
              <div>
                {/* Header: Photo, Name, Price */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/20">
                    <Image
                      src={dish.image_url || 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'}
                      alt={dish.name}
                      fill
                      className="object-cover"
                    />
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[9px] font-black uppercase tracking-wider text-rose-400">
                        Sold Out
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-gray-400'
                      }`}>
                        {dish.category}
                      </span>
                      <span className="font-mono text-sm font-black text-amber-500">
                        ₹{dish.price}
                      </span>
                    </div>

                    <h3 className={`font-serif font-bold text-sm truncate mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {dish.name}
                    </h3>

                    {/* Stock Status Pill (Clickable to edit) */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {!isTracked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                          <span>♾️</span> Untracked (Made to order)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingStock(dish)}
                          title="Click to edit stock count"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                            isSoldOut
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {isSoldOut ? (
                            <>
                              <X className="w-3.5 h-3.5" /> Sold Out
                            </>
                          ) : isLowStock ? (
                            <>
                              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Only {stock} left!
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> In Stock ({stock})
                            </>
                          )}
                          <Pencil className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sell-Through Progress Bar or Made-to-order notice */}
                {isTracked ? (
                  <div className="space-y-1.5 py-2.5 border-t border-b border-white/5 text-xs">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">Display Shelf:</span>
                      <button
                        type="button"
                        onClick={() => startEditingStock(dish)}
                        className="font-bold text-xs sm:text-sm hover:underline cursor-pointer flex items-center gap-1"
                        title="Click to edit stock"
                      >
                        <span className="text-amber-400 font-black text-sm sm:text-base">{stock}</span>
                        <span className="text-gray-400">of {baked} baked</span>
                        <Pencil className="w-2.5 h-2.5 text-gray-500 hover:text-amber-400" />
                      </button>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isSoldOut ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, (stock / Math.max(1, baked)) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>Sold: <strong className="text-gray-200">{soldCount}</strong> items</span>
                      <span><strong className="text-emerald-400">{sellThroughPct}%</strong> sell-through</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 py-3 border-t border-b border-white/5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Inventory Mode:</span>
                      <span className="font-bold text-sky-500">Made to Order • Unlimited</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Always available. Shelf counting and oven logs are bypassed for this item.
                    </p>
                  </div>
                )}
              </div>

              {/* BAKER ACTIONS */}
              <div className="pt-3 space-y-2">
                {isTracked ? (
                  <>
                    {/* Quick Add Batch Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickAddBatch(dish, 6)}
                        className="flex-1 py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all text-center"
                        title="Add fresh half-dozen tray"
                      >
                        +6 Baked
                      </button>
                      <button
                        onClick={() => handleQuickAddBatch(dish, 12)}
                        className="flex-1 py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all text-center"
                        title="Add full dozen tray"
                      >
                        +12 Baked
                      </button>
                      <button
                        onClick={() => handleQuickAddBatch(dish, 24)}
                        className="flex-1 py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all text-center"
                        title="Add double tray"
                      >
                        +24 Baked
                      </button>
                    </div>

                    {/* Adjust Stock Counter, Untrack & Sold Out Toggle */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {editingStockId === dish.id ? (
                        <div className="flex items-center gap-1.5 bg-black/60 rounded-xl p-1 border border-amber-500 shadow-lg">
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            value={editingStockValue}
                            onChange={(e) => setEditingStockValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSetExactStock(dish, Number(editingStockValue) || 0);
                              } else if (e.key === 'Escape') {
                                setEditingStockId(null);
                              }
                            }}
                            className="w-18 sm:w-20 px-2 py-1.5 text-base sm:text-lg font-black font-mono text-center rounded-lg bg-black/80 border border-amber-500 text-amber-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetExactStock(dish, Number(editingStockValue) || 0)}
                            className="w-9 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-90 text-black flex items-center justify-center font-bold transition-all"
                            title="Save stock"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStockId(null)}
                            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1 rounded-xl p-1 border shadow-inner ${
                          isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/35 border-white/10'
                        }`}>
                          <button
                            onClick={() => handleAdjustStock(dish, -1)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                              isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-gray-300 hover:text-white'
                            }`}
                            title="Deduct 1"
                          >
                            <Minus className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          {/* BIG TOUCH-FRIENDLY CLICK-TO-EDIT STOCK NUMBER */}
                          <button
                            type="button"
                            onClick={() => startEditingStock(dish)}
                            className={`group px-3 py-1 min-w-[3.5rem] rounded-lg text-center transition-all cursor-pointer ${
                              isLight ? 'hover:bg-amber-100/70' : 'hover:bg-amber-500/15'
                            }`}
                            title="Click to type exact number"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className={`font-mono text-lg sm:text-xl font-black tracking-tight ${
                                isSoldOut ? 'text-rose-500' : isLowStock ? 'text-amber-500' : isLight ? 'text-slate-900' : 'text-white'
                              }`}>
                                {stock}
                              </span>
                              <Pencil className="w-3 h-3 text-gray-400 group-hover:text-amber-400 transition-colors" />
                            </div>
                            <span className="text-[9px] block text-gray-400 group-hover:text-amber-400 font-sans font-bold uppercase tracking-wider -mt-0.5">
                              tap to edit
                            </span>
                          </button>

                          <button
                            onClick={() => handleAdjustStock(dish, 1)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                              isLight ? 'hover:bg-slate-200 text-emerald-600' : 'hover:bg-white/10 text-emerald-400 hover:text-emerald-300'
                            }`}
                            title="Add 1"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleProductTracking(dish)}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            isLight ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                          title="Disable stock tracking for this product"
                        >
                          Untrack
                        </button>

                        <button
                          onClick={() => handleToggleAvailability(dish)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border active:scale-95 ${
                            isSoldOut
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isSoldOut ? (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Restock
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Sold Out
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleToggleProductTracking(dish)}
                    className="w-full py-2.5 px-3 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                    title="Enable inventory tracking for this item"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Enable Inventory Tracking</span>
                  </button>
                )}
              </div>
            </Glass>
          );
        })}
      </div>

      {filteredDishes.length === 0 && (
        <div className="py-16 text-center text-gray-500 font-mono text-xs">
          No bakery items match your search or filter criteria.
        </div>
      )}

      {/* MODAL: LOG FRESH OVEN BATCH */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif text-base font-bold">Log Fresh Oven Bake Batch</h3>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Select Bakery Item</label>
                <select
                  value={selectedDish?.id || ''}
                  onChange={(e) => setSelectedDish(dishes.find((d) => d.id === e.target.value) || null)}
                  className={inputCls(isLight)}
                >
                  {dishes.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">
                  Batch Quantity (Units fresh out of oven)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    required
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(parseInt(e.target.value) || 0)}
                    className={`${inputCls(isLight)} font-mono font-bold text-lg text-center`}
                  />
                  <span className="text-xs font-mono font-bold text-gray-400">units</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2">
                {[6, 12, 18, 24, 36].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setBatchQuantity(qty)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold font-mono transition-colors ${
                      batchQuantity === qty
                        ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                        : isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    +{qty}
                  </button>
                ))}
              </div>

              {selectedDish && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Current Shelf Stock:</span>
                  <span className="font-mono font-bold text-amber-500">{selectedDish.stock_quantity || 0} units</span>
                  <span className="text-gray-400">→ New Stock:</span>
                  <span className="font-mono font-bold text-emerald-400">{(selectedDish.stock_quantity || 0) + batchQuantity} units</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-black shadow-md hover:opacity-95"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  {isSubmitting ? 'Updating...' : 'Add to Shelf Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
