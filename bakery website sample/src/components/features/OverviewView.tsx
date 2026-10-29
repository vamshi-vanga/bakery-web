'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, ShoppingBag, IndianRupee, 
  Star, CheckCircle2,
  Sparkles, Package, ArrowRight, Pin, Calendar,
  Maximize2, Cookie
} from 'lucide-react';
import { Dish, LedgerEntry, Category, BakeryNote } from '@/types';
import { Glass } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { DateRangeOption, filterOrdersByDateRange, getDateRangeLabel } from '@/lib/date-filter';
import StarPerformersModal, { ItemPerformanceStats } from '@/components/features/StarPerformersModal';

interface OverviewViewProps {
  dishes: Dish[];
  ledger: LedgerEntry[];
  categories: Category[];
  notes?: BakeryNote[];
  onNavigateToTab?: (tabId: string) => void;
  inventoryTrackingEnabled?: boolean;
}

export default function OverviewView({
  dishes,
  ledger,
  categories,
  notes = [],
  onNavigateToTab,
  inventoryTrackingEnabled = true,
}: OverviewViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  // Date Range Filtering State
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStarModal, setShowStarModal] = useState(false);

  // Filter orders based on active date range
  const filteredLedger = filterOrdersByDateRange(ledger, dateRange, startDate, endDate);

  // CRITICAL: Only CONFIRMED orders are added to revenue and sales!
  // Pending and Cancelled orders are excluded until accepted by the baker.
  const confirmedLedger = filteredLedger.filter((item) => item.status !== 'pending' && item.status !== 'cancelled');
  const pendingOrders = filteredLedger.filter((item) => (item.status || 'pending') === 'pending');

  // Metrics based on confirmed orders in filtered date range
  const totalRevenue = confirmedLedger.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalOrders = confirmedLedger.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  // Total units of baked goods sold in this period from confirmed orders
  const totalItemsSold = confirmedLedger.reduce((sum, item) => {
    const itemQty = (item.items || []).reduce((qSum, it) => qSum + (Number(it.quantity) || 1), 0);
    return sum + itemQty;
  }, 0);

  // Low stock baked goods (only for products with inventory tracking enabled)
  const lowStockDishes = !inventoryTrackingEnabled
    ? []
    : dishes.filter(
        (d) =>
          d.track_inventory !== false &&
          ((Number(d.stock_quantity) || 0) <= (Number(d.low_stock_threshold) || 5) || !d.available)
      );

  // Top pinned note
  const pinnedNote = notes.find((n) => n.is_pinned) || notes[0];

  // Sales per item from confirmed orders
  const itemCounts: Record<string, ItemPerformanceStats> = {};
  confirmedLedger.forEach((entry) => {
    (entry.items || []).forEach((it) => {
      if (!it.name) return;
      if (!itemCounts[it.name]) {
        itemCounts[it.name] = { name: it.name, count: 0, revenue: 0, price: it.price || 0 };
      }
      itemCounts[it.name].count += it.quantity || 1;
      itemCounts[it.name].revenue += (it.price || 0) * (it.quantity || 1);
    });
  });

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const activeRangeLabel = getDateRangeLabel(dateRange, startDate, endDate);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border"
              style={{ backgroundColor: themeConfig.light, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              Overview
            </span>
            <span className={`text-xs ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>• Live order updates</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
            Analysis
          </h1>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
            New orders, sales and stock at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <>
              <button
                onClick={() => onNavigateToTab('notes')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isLight
                    ? 'border-[#DDD5C7] bg-[#FFFFFF] hover:bg-[#F5F0E6] text-[#1C1917]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span>Daily Notes</span>
              </button>

              <button
                onClick={() => onNavigateToTab('ledger')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all shadow-md hover:opacity-95"
                style={{ backgroundColor: themeConfig.primary }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>New sale</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* DATE RANGE FILTER BAR */}
      <DateRangeFilter
        range={dateRange}
        setRange={setDateRange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        orderCount={totalOrders}
        revenue={totalRevenue}
        pendingCount={pendingOrders.length}
        isLight={isLight}
      />

      {/* PENDING ORDERS ACTION BANNER */}
      {pendingOrders.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-fade-in shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-black font-mono font-black text-base shadow-md shadow-amber-500/20">
              {pendingOrders.length}
            </span>
            <div>
              <p className="font-serif font-bold text-sm text-amber-500 flex items-center gap-1.5">
                <span>Incoming Orders Awaiting Approval</span>
              </p>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
                {pendingOrders.length === 1 ? '1 incoming customer order is' : `${pendingOrders.length} incoming customer orders are`} waiting for confirmation. Accept to queue for baking and confirm sales revenue.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('orders')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 shrink-0"
            >
              <span>Review & Accept (✓ / ✕)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Revenue */}
        <Glass isLight={isLight} className="p-4 sm:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              Gross Revenue
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {activeRangeLabel}
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </Glass>

        {/* Metric 2: Total Orders */}
        <Glass isLight={isLight} className="p-4 sm:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              Total Orders
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-3xl font-black font-mono">{totalOrders}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sales transactions
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </Glass>

        {/* Metric 3: Average Order Value */}
        <Glass isLight={isLight} className="p-4 sm:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              Avg Order Value
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-3xl font-black font-mono">₹{avgOrderValue}</p>
            <p className={`text-[11px] font-medium ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              Per customer receipt
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </Glass>

        {/* Metric 4: Total Items Sold (Replaces old Kitchen Queue status) */}
        <Glass isLight={isLight} className="p-4 sm:p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              Baked Items Sold
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Cookie className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
              {totalItemsSold} <span className="text-xs font-normal">units</span>
            </p>
            <p className={`text-[11px] font-medium ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              Pastries, cookies & cakes
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        </Glass>
      </div>

      {/* TWO COLUMNS: RECENT ORDERS STREAM & SIDEBAR WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Orders Feed (2 cols) */}
        <Glass isLight={isLight} className="lg:col-span-2 p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className={`font-serif text-base sm:text-lg font-bold ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
                  Recent orders
                </h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
                  isLight ? 'bg-[#F5F0E6] border-[#DDD5C7] text-[#78716C]' : 'bg-white/5 border-white/10 text-gray-400'
                }`}>
                  {filteredLedger.length} in range
                </span>
              </div>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('orders')}
                  className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  View Order History <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredLedger.slice(0, 6).map((order) => {
                const payment = (order.payment_method || 'cash').toUpperCase();
                const type = (order.order_type || 'pos').toUpperCase();

                return (
                  <div
                    key={order.id}
                    className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isLight
                        ? 'bg-[#FAF7F2] hover:bg-[#F5F0E6] border-[#E8E2D8]'
                        : 'bg-[#18181B]/60 hover:bg-[#18181B] border-white/5'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                          {order.order_id || `#BK-${order.id.slice(0, 4)}`}
                        </span>
                        
                        {/* Payment badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          payment === 'UPI' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20' :
                          payment === 'CASH' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        }`}>
                          {payment}
                        </span>

                        {/* Order Type badge */}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          isLight ? 'bg-[#EFE9DF] text-[#44403C]' : 'bg-white/10 text-gray-300'
                        }`}>
                          {type}
                        </span>

                        {order.table_number && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            isLight ? 'bg-[#E8E2D8] text-[#1C1917]' : 'bg-white/10 text-gray-200'
                          }`}>
                            {order.table_number}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs font-semibold truncate ${isLight ? 'text-[#1C1917]' : 'text-gray-200'}`}>
                        {order.customer_name} • <span className={isLight ? 'text-[#78716C]' : 'text-gray-400'}>{order.items?.length || 0} items</span>
                      </p>
                      
                      <p className={`text-[11px] truncate max-w-md ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
                        {order.items?.map((it) => `${it.name} x${it.quantity}`).join(', ')}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{order.total}
                      </span>
                      <span className={`text-[10px] font-mono ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                        {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredLedger.length === 0 && (
                <div className={`py-12 text-center text-xs font-mono rounded-xl border border-dashed ${
                  isLight ? 'border-[#DDD5C7] text-[#78716C]' : 'border-white/10 text-gray-500'
                }`}>
                  No orders recorded for {activeRangeLabel}. Place an order from the POS tab or adjust date filter.
                </div>
              )}
            </div>
          </div>
        </Glass>

        {/* Right Column: Pinned Prep Note, Stock Alerts & Star Performers */}
        <div className="space-y-6">
          
          {/* Pinned Kitchen Note (Google Keep Style) */}
          {pinnedNote && (
            <Glass isLight={isLight} className="p-5 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                  <span>Pinned Kitchen Note</span>
                </div>
                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('notes')}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Open Notes →
                  </button>
                )}
              </div>

              <h4 className="font-serif font-bold text-sm mb-1">{pinnedNote.title || 'Special Kitchen Note'}</h4>
              <p className={`text-xs line-clamp-3 leading-relaxed ${isLight ? 'text-[#44403C]' : 'text-gray-300'}`}>
                {pinnedNote.content}
              </p>

              {pinnedNote.target_date && (
                <div className="flex items-center gap-1 mt-2.5 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  <Calendar className="w-3 h-3" />
                  <span>Target: {pinnedNote.target_date}</span>
                </div>
              )}
            </Glass>
          )}

          {/* Baked Goods Stock Alert Widget */}
          <Glass isLight={isLight} className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                <h3 className={`font-serif text-base font-bold ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
                  Baked Stock Alerts
                </h3>
              </div>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('inventory')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Manage <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {!inventoryTrackingEnabled ? (
                <div className="py-6 text-center text-xs flex flex-col items-center gap-1.5 text-amber-500">
                  <Package className="w-5 h-5 opacity-70" />
                  <span className="font-bold">Inventory Tracking is Disabled in Settings</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    All products are treated as made-to-order with unlimited stock.
                  </span>
                </div>
              ) : (
                <>
                  {lowStockDishes.slice(0, 4).map((dish) => {
                    const stock = Number(dish.stock_quantity) || 0;
                    const isOut = stock <= 0 || !dish.available;

                    return (
                      <div
                        key={dish.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isOut
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold truncate">{dish.name}</p>
                          <p className="text-[10px] opacity-80">
                            {isOut ? 'Sold Out on Shelf' : `Only ${stock} left in display case`}
                          </p>
                        </div>
                        <span className="font-mono font-bold shrink-0">
                          {isOut ? '0 units' : `${stock} units`}
                        </span>
                      </div>
                    );
                  })}

                  {lowStockDishes.length === 0 && (
                    <div className="py-6 text-center text-emerald-600 dark:text-emerald-400 text-xs flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>All tracked baked items are well-stocked on shelves.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Glass>

          {/* Star Performers with Fullscreen View Button */}
          <Glass isLight={isLight} className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className={`font-serif text-base font-bold ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
                  Top sellers
                </h3>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={() => setShowStarModal(true)}
                title="View All Items & Revenue Fullscreen"
                className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                  isLight
                    ? 'border-[#DDD5C7] bg-[#F5F0E6] hover:bg-[#EAE3D5] text-[#78350F]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-amber-400'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen View</span>
              </button>
            </div>

            <div className="space-y-3">
              {topItems.map(([name, stats], idx) => (
                <div key={name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-md text-[10px] font-bold font-mono flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-500 text-black shadow-sm' :
                      idx === 1 ? 'bg-slate-300 text-black' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      isLight ? 'bg-[#EFE9DF] text-[#44403C]' : 'bg-white/5 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className={`font-bold truncate ${isLight ? 'text-[#1C1917]' : 'text-gray-200'}`}>{name}</p>
                      <p className={`text-[10px] ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>{stats.count} sold</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    ₹{stats.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}

              {topItems.length === 0 && (
                <div className={`py-4 text-center text-xs font-mono ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                  No sales recorded for {activeRangeLabel}.
                </div>
              )}
            </div>

            {/* View Full Revenue Breakdown trigger */}
            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
              <button
                onClick={() => setShowStarModal(true)}
                className="w-full py-2 rounded-xl text-xs font-bold text-center text-amber-600 dark:text-amber-400 hover:underline flex items-center justify-center gap-1"
              >
                <span>View All {dishes.length} Items & Revenue Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Glass>
        </div>

      </div>

      {/* FULLSCREEN STAR PERFORMERS & REVENUE MODAL */}
      <StarPerformersModal
        isOpen={showStarModal}
        onClose={() => setShowStarModal(false)}
        dishes={dishes}
        categories={categories}
        itemStats={itemCounts}
        dateRangeLabel={activeRangeLabel}
        isLight={isLight}
      />
    </div>
  );
}
