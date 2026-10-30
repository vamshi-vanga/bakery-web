'use client';

import React, { useState } from 'react';
import { 
  Search, Printer, Receipt, CreditCard, 
  ShoppingBag, X, User, Phone, Table as TableIcon,
  Check, Clock, Filter
} from 'lucide-react';
import { LedgerEntry } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { DateRangeOption, filterOrdersByDateRange } from '@/lib/date-filter';

interface OrdersHistoryViewProps {
  ledger: LedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
}

export default function OrdersHistoryView({
  ledger,
  setLedger,
}: OrdersHistoryViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<LedgerEntry | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // 1. Filter by Date Range
  const dateFilteredOrders = filterOrdersByDateRange(ledger, dateRange, startDate, endDate);

  // 2. Filter by Search, Payment, Order Type, and Status
  const filteredOrders = dateFilteredOrders.filter((o) => {
    const searchLower = search.toLowerCase();
    const searchMatch =
      !search ||
      (o.order_id && o.order_id.toLowerCase().includes(searchLower)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchLower)) ||
      (o.customer_phone && o.customer_phone.includes(searchLower)) ||
      (o.items && o.items.some((it) => it.name.toLowerCase().includes(searchLower)));

    const paymentMatch =
      paymentFilter === 'all' ||
      (o.payment_method && o.payment_method.toLowerCase() === paymentFilter.toLowerCase());

    const typeMatch =
      typeFilter === 'all' ||
      (o.order_type && o.order_type.toLowerCase() === typeFilter.toLowerCase());

    const status = o.status || 'pending';
    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && status === 'pending') ||
      (statusFilter === 'confirmed' && status !== 'pending' && status !== 'cancelled') ||
      (statusFilter === 'cancelled' && status === 'cancelled') ||
      status === statusFilter;

    return searchMatch && paymentMatch && typeMatch && statusMatch;
  });

  // Calculate range totals:
  // IMPORTANT: Only CONFIRMED / ACCEPTED orders are added to revenue!
  // Pending and Cancelled orders are excluded until accepted.
  const confirmedOrders = filteredOrders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled');
  const pendingOrders = filteredOrders.filter((o) => (o.status || 'pending') === 'pending');
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // ACTION: Update order status (Accept ✓ / Reject ✕)
  const handleUpdateOrderStatus = async (
    order: LedgerEntry,
    newStatus: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  ) => {
    const targetId = order.id || order.order_id;
    if (!targetId) return;
    setUpdatingOrderId(targetId);

    // Optimistic UI state update
    setLedger((prev) =>
      prev.map((o) =>
        o.id === order.id || (o.order_id && o.order_id === order.order_id)
          ? { ...o, status: newStatus }
          : o
      )
    );
    if (selectedOrder && (selectedOrder.id === order.id || selectedOrder.order_id === order.order_id)) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch(`/api/orders/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PIN || '779911'}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        console.error('Failed to update status on server');
      }
    } catch (err) {
      console.error('Order status update error:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handlePrint = (order: LedgerEntry) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.order_id || order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 20px; font-size: 13px; max-width: 340px; margin: auto; color: #111; }
            h2, p { text-align: center; margin: 4px 0; }
            hr { border: none; border-top: 1px dashed #bbb; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; margin: 6px 0; }
            .bold { font-weight: bold; }
            .meta { font-size: 11px; color: #555; text-align: center; }
            .total-row { font-size: 15px; font-weight: bold; margin-top: 8px; border-top: 1px solid #000; padding-top: 6px; }
          </style>
        </head>
        <body>
          <h2>SAMPLE CLOUD BAKERY</h2>
          <p class="meta">Cloud Kitchen & Artisan Bakery</p>
          <p class="meta">Order Ref: ${order.order_id || `#BK-${order.id.slice(0, 4)}`}</p>
          <p class="meta">Date: ${new Date(order.created_at).toLocaleString('en-IN')}</p>
          <hr />
          <div class="row"><span>Customer:</span><span class="bold">${order.customer_name || 'Walk-in'}</span></div>
          ${order.customer_phone ? `<div class="row"><span>Phone:</span><span>${order.customer_phone}</span></div>` : ''}
          ${order.table_number ? `<div class="row"><span>Table:</span><span class="bold">${order.table_number}</span></div>` : ''}
          <div class="row"><span>Payment:</span><span class="bold">${(order.payment_method || 'CASH').toUpperCase()}</span></div>
          <div class="row"><span>Order Type:</span><span class="bold">${(order.order_type || 'POS').toUpperCase()}</span></div>
          <hr />
          ${(order.items || []).map(it => `
            <div class="row">
              <span>${it.name} <small>x${it.quantity}</small></span>
              <span class="bold">₹${(it.price || 0) * (it.quantity || 1)}</span>
            </div>
          `).join('')}
          <div class="row total-row">
            <span>TOTAL AMOUNT PAID</span>
            <span>₹${order.total}</span>
          </div>
          <hr />
          <p style="margin-top:16px; font-weight: bold; font-size: 12px;">Freshly Baked with Passion! 🥐</p>
          <p class="meta">Thank you for ordering from Sample Cloud Bakery / Cloud Kitchen!</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSelectOrder = (order: LedgerEntry) => {
    setSelectedOrder(order);
    setMobileDetailOpen(true);
  };

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
              Sales Ledger
            </span>
            <span className={`text-xs ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>• Historical Receipts & Logs</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
            Orders & Sales History
          </h1>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
            Complete historical records of walk-in sales, customer transactions, and item receipts.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search Order #, customer, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls(isLight)} pl-10`}
          />
        </div>
      </div>

      {/* DATE RANGE FILTER ON TOP */}
      <DateRangeFilter
        range={dateRange}
        setRange={setDateRange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        orderCount={confirmedOrders.length}
        revenue={totalRevenue}
        pendingCount={pendingOrders.length}
        isLight={isLight}
      />

      {/* SECONDARY BUSINESS FILTERS (Status, Payment & Channel) */}
      <div className="space-y-2.5 pt-1">
        {/* Status Filter (Highlighted Pending Tab) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider pr-1 flex items-center gap-1 ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {[
            { id: 'all', label: `All (${filteredOrders.length})` },
            { id: 'pending', label: `⏳ Pending Review (${pendingOrders.length})`, isPendingBadge: true },
            { id: 'confirmed', label: `✓ Confirmed (${confirmedOrders.length})` },
            { id: 'cancelled', label: '✕ Rejected' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === st.id
                  ? st.isPendingBadge
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : isLight
                    ? 'bg-[#B45309] text-white shadow-sm'
                    : 'bg-amber-500 text-black'
                  : st.isPendingBadge && pendingOrders.length > 0
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500 hover:bg-amber-500/25 animate-pulse'
                  : isLight
                  ? 'bg-[#FFFFFF] border border-[#DDD5C7] text-[#57534E] hover:bg-[#F5F0E6]'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Payment Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider pr-1 flex items-center gap-1 ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              <CreditCard className="w-3.5 h-3.5" /> Payment:
            </span>
            {['all', 'upi', 'cash', 'card'].map((pm) => (
              <button
                key={pm}
                onClick={() => setPaymentFilter(pm)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 capitalize ${
                  paymentFilter === pm
                    ? isLight
                      ? 'bg-[#B45309] text-white shadow-sm'
                      : 'bg-amber-500 text-black'
                    : isLight
                    ? 'bg-[#FFFFFF] border border-[#DDD5C7] text-[#57534E] hover:bg-[#F5F0E6]'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {pm === 'all' ? 'All Payments' : pm.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Order Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider pr-1 flex items-center gap-1 ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              <ShoppingBag className="w-3.5 h-3.5" /> Channel:
            </span>
            {['all', 'customer', 'pos', 'dine_in', 'takeaway', 'delivery'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 capitalize ${
                  typeFilter === type
                    ? isLight
                      ? 'bg-[#B45309] text-white shadow-sm'
                      : 'bg-amber-500 text-black'
                    : isLight
                    ? 'bg-[#FFFFFF] border border-[#DDD5C7] text-[#57534E] hover:bg-[#F5F0E6]'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {type === 'all' ? 'All Channels' : type === 'customer' ? 'Website' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ORDERS LIST & DETAIL SPLIT VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Column (2 cols on desktop, full on mobile) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredOrders.map((order) => {
            const isSelected = selectedOrder?.id === order.id;
            const payment = (order.payment_method || 'cash').toUpperCase();
            const type = order.order_type === 'customer' ? 'WEBSITE' : (order.order_type || 'pos').replace('_', ' ').toUpperCase();

            return (
              <Glass
                key={order.id}
                isLight={isLight}
                onClick={() => handleSelectOrder(order)}
                className={`p-4 sm:p-5 cursor-pointer transition-all border ${
                  isSelected
                    ? isLight
                      ? 'border-[#B45309] bg-[#FFFBEB] shadow-md shadow-[#B45309]/10'
                      : 'border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                    : isLight
                    ? 'hover:border-[#DDD5C7] hover:shadow-sm'
                    : 'hover:border-white/20'
                }`}
              >
                {/* Order Top Bar: Order ID, Badges, Amount, Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                      {order.order_id || `#BK-${order.id.slice(0, 4)}`}
                    </span>

                    {/* Payment badge */}
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold ${
                        payment === 'UPI'
                          ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/30'
                          : payment === 'CASH'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {payment}
                    </span>

                    {/* Order Type badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        isLight ? 'bg-[#EFE9DF] text-[#44403C]' : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      {type}
                    </span>

                    {order.table_number && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isLight ? 'bg-[#E8E2D8] text-[#1C1917]' : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {order.table_number}
                      </span>
                    )}

                    {/* Status badge */}
                    {order.status === 'pending' && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> ⏳ Awaiting Review
                      </span>
                    )}
                    {(order.status === 'completed' || order.status === 'preparing' || order.status === 'ready') && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> ✓ Confirmed
                      </span>
                    )}
                    {order.status === 'cancelled' && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <X className="w-2.5 h-2.5" /> ✕ Rejected
                      </span>
                    )}
                  </div>

                  {/* Grand total & Date */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{order.total}
                    </span>
                    <span className={`text-[11px] font-mono ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                      {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Order Summary & Customer Name */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1 border-t border-black/5 dark:border-white/5">
                  <div className="space-y-0.5 min-w-0">
                    <p className={`font-bold truncate ${isLight ? 'text-[#1C1917]' : 'text-gray-200'}`}>
                      {order.customer_name || 'Walk-in Customer'}{' '}
                      {order.customer_phone ? <span className="opacity-60 font-mono text-[11px]">({order.customer_phone})</span> : ''}
                    </p>
                    <p className={`text-[11px] truncate max-w-lg ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
                      {order.items?.map((it) => `${it.name} x${it.quantity}`).join(', ')}
                    </p>
                  </div>

                  {/* Print and Inspect Actions + Wrong (✕) & Tick (✓) Buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {/* If pending: prominent Wrong (Reject ✕) and Tick (Accept ✓) */}
                    {order.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order, 'cancelled')}
                          disabled={updatingOrderId === (order.id || order.order_id)}
                          title="Reject order (Wrong ✕)"
                          className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1 transition-all shadow-sm"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order, 'completed')}
                          disabled={updatingOrderId === (order.id || order.order_id)}
                          title="Accept order & confirm sales amount (Tick ✓)"
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Accept Order</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handlePrint(order)}
                      title="Print receipt"
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                        isLight
                          ? 'bg-[#FFFFFF] hover:bg-[#F5F0E6] border-[#DDD5C7] text-[#1C1917]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-500" />
                      <span>Print</span>
                    </button>

                    <button
                      onClick={() => handleSelectOrder(order)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isLight
                          ? 'bg-[#F5F0E6] text-[#78350F] hover:bg-[#EAE3D5]'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Receipt Details →
                    </button>
                  </div>
                </div>
              </Glass>
            );
          })}

          {filteredOrders.length === 0 && (
            <div
              className={`py-16 text-center text-xs font-mono rounded-2xl border border-dashed ${
                isLight ? 'border-[#DDD5C7] text-[#78716C] bg-white/40' : 'border-white/10 text-gray-500 bg-white/[0.02]'
              }`}
            >
              No orders found matching the selected date range and filters.
            </div>
          )}
        </div>

        {/* Selected Order Detail Sidebar (Desktop view) */}
        <div className="hidden lg:block">
          {selectedOrder ? (
            <Glass isLight={isLight} className="p-6 sticky top-20 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
                <div>
                  <span className="text-amber-600 dark:text-amber-400 font-mono text-base font-black">
                    {selectedOrder.order_id || `#BK-${selectedOrder.id.slice(0, 4)}`}
                  </span>
                  <p className={`text-[10px] font-mono ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                    {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                <span className={`text-[10px] px-2.5 py-1 rounded-md font-mono font-bold uppercase ${
                  isLight ? 'bg-[#FAF7F2] border border-[#DDD5C7] text-[#1C1917]' : 'bg-white/10 text-gray-200'
                }`}>
                  {(selectedOrder.order_type || 'POS').replace('_', ' ')}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-1.5 text-xs">
                <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Customer Information
                </p>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-bold">{selectedOrder.customer_name || 'Walk-in Customer'}</span>
                </div>
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                )}
                {selectedOrder.table_number && (
                  <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table: {selectedOrder.table_number}</span>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs italic mt-2 border border-amber-500/20">
                    &ldquo;{selectedOrder.notes}&rdquo;
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Itemized Bill
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-black/5 dark:border-white/5">
                      <div>
                        <span className="font-bold">{it.name}</span>
                        <span className={`ml-2 text-[11px] font-mono ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                          x{it.quantity}
                        </span>
                      </div>
                      <span className="font-mono font-bold">
                        ₹{(it.price || 0) * (it.quantity || 1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Grand Total */}
              <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5 text-xs">
                <div className="flex justify-between items-center text-xs">
                  <span className={isLight ? 'text-[#78716C]' : 'text-gray-400'}>Payment Method</span>
                  <span className="font-mono font-bold">{(selectedOrder.payment_method || 'CASH').toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-black pt-2">
                  <span>Grand Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{selectedOrder.total}</span>
                </div>
              </div>

              {/* Action Buttons & Acceptance Decision */}
              <div className="pt-2 space-y-2.5">
                {selectedOrder.status === 'pending' ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>Order Awaiting Acceptance</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
                      Accepting confirms this order, queues it for baking, and adds ₹{selectedOrder.total} to today&apos;s revenue. Rejecting cancels the order without adding to revenue.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(selectedOrder, 'cancelled')}
                        disabled={updatingOrderId === (selectedOrder.id || selectedOrder.order_id)}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                        <span>Reject (✕)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(selectedOrder, 'completed')}
                        disabled={updatingOrderId === (selectedOrder.id || selectedOrder.order_id)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Accept (✓)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                    isLight ? 'bg-[#FAF7F2] border-[#E8E2D8]' : 'bg-white/5 border-white/10'
                  }`}>
                    <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>Status:</span>
                    <span className="font-bold capitalize text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      {selectedOrder.status === 'cancelled' ? (
                        <>
                          <X className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-rose-500">Rejected</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Confirmed</span>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                    isLight
                      ? 'bg-[#B45309] text-white hover:bg-[#92400E]'
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
                >
                  <Printer className="w-4 h-4" /> Print Customer Receipt
                </button>
              </div>
            </Glass>
          ) : (
            <Glass isLight={isLight} className="p-8 text-center text-xs font-mono">
              <Receipt className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
              <p className={isLight ? 'text-[#78716C]' : 'text-gray-400'}>
                Click any order to inspect itemized receipt, customer details, and print options.
              </p>
            </Glass>
          )}
        </div>
      </div>

      {/* MOBILE RECEIPT DETAIL MODAL / DRAWER */}
      {mobileDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-[110] lg:hidden flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-h-[85vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl animate-slide-up ${
              isLight ? 'bg-[#FFFFFF] border-[#E8E2D8] text-[#1C1917]' : 'bg-[#141416] border-white/10 text-white'
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-[#E8E2D8] bg-[#FAF7F2]' : 'border-white/10 bg-white/5'}`}>
              <div>
                <span className="text-amber-600 dark:text-amber-400 font-mono text-base font-black">
                  {selectedOrder.order_id || `#BK-${selectedOrder.id.slice(0, 4)}`}
                </span>
                <p className={`text-[10px] font-mono ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setMobileDetailOpen(false)}
                className="p-1.5 rounded-lg border border-black/10 dark:border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Customer */}
              <div className="space-y-1 text-xs">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Customer
                </p>
                <p className="font-bold text-sm">{selectedOrder.customer_name || 'Walk-in Customer'}</p>
                {selectedOrder.customer_phone && <p className="font-mono text-gray-500">{selectedOrder.customer_phone}</p>}
                {selectedOrder.table_number && <p className="text-amber-600 font-medium">Table: {selectedOrder.table_number}</p>}
                {selectedOrder.notes && (
                  <p className="p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs italic mt-1">
                    &ldquo;{selectedOrder.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  Items
                </p>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <div>
                        <span className="font-bold">{it.name}</span>
                        <span className="ml-2 font-mono text-gray-400">x{it.quantity}</span>
                      </div>
                      <span className="font-mono font-bold">₹{(it.price || 0) * (it.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-base font-black">
                <span>Total Paid</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg">₹{selectedOrder.total}</span>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t space-y-2.5 ${isLight ? 'border-[#E8E2D8] bg-[#FAF7F2]' : 'border-white/10 bg-white/5'}`}>
              {selectedOrder.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder, 'cancelled');
                      setMobileDetailOpen(false);
                    }}
                    disabled={updatingOrderId === (selectedOrder.id || selectedOrder.order_id)}
                    className="flex-1 py-3 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                    <span>Reject (✕)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder, 'completed');
                      setMobileDetailOpen(false);
                    }}
                    disabled={updatingOrderId === (selectedOrder.id || selectedOrder.order_id)}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Accept Order (✓)</span>
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm ${
                    isLight ? 'bg-[#B45309] text-white' : 'bg-amber-500 text-black'
                  }`}
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={() => setMobileDetailOpen(false)}
                  className="px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
