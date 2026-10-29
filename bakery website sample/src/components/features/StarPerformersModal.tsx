'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Star, X, Search, Crown, 
  ShoppingBag, IndianRupee, Sparkles, 
  Minimize2, ArrowUpDown, Package
} from 'lucide-react';
import { Dish, Category } from '@/types';

export interface ItemPerformanceStats {
  name: string;
  count: number;
  revenue: number;
  price: number;
}

interface StarPerformersModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: Dish[];
  categories: Category[];
  itemStats: Record<string, ItemPerformanceStats>;
  dateRangeLabel: string;
  isLight?: boolean;
}

type SortField = 'revenue' | 'count' | 'price' | 'name';

export default function StarPerformersModal({
  isOpen,
  onClose,
  dishes,
  categories,
  itemStats,
  dateRangeLabel,
  isLight = false,
}: StarPerformersModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortField>('revenue');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build combined stats for ALL dishes (even those with 0 sales)
  const allPerformanceData = dishes.map((dish) => {
    const stat = itemStats[dish.name] || { count: 0, revenue: 0, price: dish.price || 0 };
    return {
      dish,
      name: dish.name,
      category: dish.category,
      price: dish.price,
      count: stat.count,
      revenue: stat.revenue,
      image_url: dish.image_url,
      stock_quantity: dish.stock_quantity ?? 0,
      track_inventory: dish.track_inventory !== false,
      available: dish.available,
    };
  });

  // Calculate totals
  const totalUnitsSold = allPerformanceData.reduce((acc, it) => acc + it.count, 0);
  const totalRevenue = allPerformanceData.reduce((acc, it) => acc + it.revenue, 0);
  const topPerformer = [...allPerformanceData].sort((a, b) => b.revenue - a.revenue)[0];

  // Filter
  const filteredData = allPerformanceData.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Sort
  filteredData.sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue;
    if (sortBy === 'count') return b.count - a.count;
    if (sortBy === 'price') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const categoryNames = ['All', ...categories.map((c) => c.name)];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-2xl animate-fade-in">
      <div
        className={`w-full h-full max-w-7xl max-h-[96vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl transition-colors ${
          isLight
            ? 'bg-[#FBF9F5] border-[#E8E2D8] text-[#1C1917]'
            : 'bg-[#0E0E10] border-white/10 text-white'
        }`}
      >
        {/* MODAL HEADER */}
        <div
          className={`px-4 sm:px-8 py-5 border-b flex items-center justify-between gap-4 shrink-0 ${
            isLight ? 'border-[#E8E2D8] bg-[#FFFFFF]' : 'border-white/10 bg-[#141416]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Crown className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-2xl font-black tracking-tight truncate">
                  Item Sales & Revenue Performance
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {dateRangeLabel}
                </span>
              </div>
              <p className={`text-xs truncate ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                Full breakdown of all bakery items, quantity sold, shelf stock, and total revenue generated.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isLight
                  ? 'border-[#DDD5C7] bg-[#F5F0E6] hover:bg-[#EAE3D5] text-[#1C1917]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
              title="Close Fullscreen View (Esc)"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${
                isLight
                  ? 'border-[#DDD5C7] hover:bg-[#F5F0E6] text-[#78716C]'
                  : 'border-white/10 hover:bg-white/10 text-gray-400'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
          {/* SUMMARY KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Revenue */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-[#FFFFFF] border-[#E8E2D8] shadow-sm' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Revenue in Period
                </span>
                <IndianRupee className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </p>
              <p className={`text-[10px] mt-1 ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                {dateRangeLabel}
              </p>
            </div>

            {/* Card 2: Units Sold */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-[#FFFFFF] border-[#E8E2D8] shadow-sm' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Total Units Sold
                </span>
                <ShoppingBag className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {totalUnitsSold} <span className="text-xs font-normal">units</span>
              </p>
              <p className={`text-[10px] mt-1 ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                Across all orders
              </p>
            </div>

            {/* Card 3: Top Item */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-[#FFFFFF] border-[#E8E2D8] shadow-sm' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  #1 Best Seller
                </span>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-sm sm:text-base font-bold truncate">
                {topPerformer?.name || 'No sales yet'}
              </p>
              <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {topPerformer ? `₹${topPerformer.revenue.toLocaleString('en-IN')} (${topPerformer.count} sold)` : '—'}
              </p>
            </div>

            {/* Card 4: Catalog Size */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-[#FFFFFF] border-[#E8E2D8] shadow-sm' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Catalog Items
                </span>
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono">
                {dishes.length} <span className="text-xs font-normal">items</span>
              </p>
              <p className={`text-[10px] mt-1 ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                {categories.length} categories active
              </p>
            </div>
          </div>

          {/* TOOLBAR: SEARCH, CATEGORY FILTER & SORT SELECTOR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search item name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                  isLight
                    ? 'bg-[#FFFFFF] border-[#DDD5C7] text-[#1C1917] placeholder-[#78716C] focus:border-[#B45309]'
                    : 'bg-[#18181B] border-white/10 text-white placeholder-gray-500 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Category Pills & Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {categoryNames.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === cat
                        ? isLight
                          ? 'bg-[#B45309] text-white shadow-sm'
                          : 'bg-amber-500 text-black'
                        : isLight
                        ? 'bg-[#FFFFFF] border border-[#DDD5C7] text-[#57534E] hover:bg-[#F5F0E6]'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                    isLight
                      ? 'bg-[#FFFFFF] border-[#DDD5C7] text-[#1C1917]'
                      : 'bg-[#18181B] border-white/10 text-white'
                  }`}
                >
                  <option value="revenue">Sort by Revenue (Highest)</option>
                  <option value="count">Sort by Units Sold (Most)</option>
                  <option value="price">Sort by Price (Highest)</option>
                  <option value="name">Sort by Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* PERFORMANCE ITEMS LIST */}
          <div className="space-y-3">
            {filteredData.map((item, index) => {
              const revenueShare = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
              const isGold = index === 0 && item.revenue > 0;
              const isSilver = index === 1 && item.revenue > 0;
              const isBronze = index === 2 && item.revenue > 0;

              return (
                <div
                  key={item.dish.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isLight
                      ? 'bg-[#FFFFFF] border-[#E8E2D8] hover:border-[#DDD5C7] shadow-sm'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Left: Rank, Thumbnail, Name, Category */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                        isGold
                          ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
                          : isSilver
                          ? 'bg-slate-300 text-black'
                          : isBronze
                          ? 'bg-amber-700 text-white'
                          : isLight
                          ? 'bg-[#F5F0E6] text-[#78716C] border border-[#DDD5C7]'
                          : 'bg-white/5 text-gray-400 border border-white/5'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/10 shrink-0 border border-white/10">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Title & Category */}
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                        {isGold && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            <Crown className="w-3 h-3 fill-current" /> Top Seller
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className={`text-[11px] font-medium ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                          {item.category}
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="font-mono font-semibold">₹{item.price} each</span>
                        <span className="opacity-40">•</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            !item.track_inventory
                              ? 'bg-sky-500/10 text-sky-500'
                              : item.stock_quantity <= 0
                              ? 'bg-red-500/10 text-red-500'
                              : item.stock_quantity <= 5
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {!item.track_inventory
                            ? 'Made to Order'
                            : item.stock_quantity <= 0
                            ? 'Sold Out'
                            : `${item.stock_quantity} in stock`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Sold, Revenue Share Bar, Total Revenue */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                    {/* Units Sold */}
                    <div className="text-left md:text-right">
                      <p className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                        Units Sold
                      </p>
                      <p className="font-mono text-base font-extrabold text-amber-600 dark:text-amber-400">
                        {item.count} <span className="text-xs font-normal">sold</span>
                      </p>
                    </div>

                    {/* Revenue Bar (desktop) */}
                    <div className="hidden lg:block w-36">
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className={isLight ? 'text-[#78716C]' : 'text-gray-400'}>Share</span>
                        <span className="font-bold">{revenueShare.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(revenueShare, item.revenue > 0 ? 3 : 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="text-right min-w-[100px]">
                      <p className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                        Total Revenue
                      </p>
                      <p className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ₹{item.revenue.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="py-20 text-center text-gray-500 text-xs font-mono">
                No bakery items match your search filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
