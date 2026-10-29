'use client';

import React from 'react';
import { Calendar, CalendarDays, CalendarRange, SlidersHorizontal, X } from 'lucide-react';
import { DateRangeOption, getDateRangeLabel } from '@/lib/date-filter';

interface DateRangeFilterProps {
  range: DateRangeOption;
  setRange: (r: DateRangeOption) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  orderCount?: number;
  revenue?: number;
  pendingCount?: number;
  isLight?: boolean;
}

export default function DateRangeFilter({
  range,
  setRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  orderCount,
  revenue,
  pendingCount,
  isLight = false,
}: DateRangeFilterProps) {
  const options: { id: DateRangeOption; label: string; icon: React.ElementType }[] = [
    { id: 'today', label: "Today", icon: Calendar },
    { id: '7d', label: '7 Days', icon: CalendarDays },
    { id: '30d', label: '30 Days', icon: CalendarRange },
    { id: 'custom', label: 'Custom Range', icon: SlidersHorizontal },
  ];

  const handleResetCustom = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div
      className={`rounded-2xl p-2.5 sm:p-3 border transition-all ${
        isLight
          ? 'bg-[#FFFFFF] border-[#E5DFD5] shadow-sm shadow-stone-900/5'
          : 'bg-[#121214]/80 border-white/10 shadow-lg'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = range === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 select-none ${
                  isActive
                    ? isLight
                      ? 'bg-[#B45309] text-white shadow-md shadow-[#B45309]/20'
                      : 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : isLight
                    ? 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F0E6]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Filter Summary Badge */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono">
          <div
            className={`px-3 py-1 rounded-xl border flex items-center gap-2 ${
              isLight
                ? 'bg-[#FAF7F2] border-[#E8E2D8] text-[#44403C]'
                : 'bg-white/5 border-white/10 text-gray-300'
            }`}
          >
            <span className="font-sans text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {getDateRangeLabel(range, startDate, endDate)}
            </span>
            {orderCount !== undefined && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-bold">{orderCount} {orderCount === 1 ? 'order' : 'orders'}</span>
              </>
            )}
            {revenue !== undefined && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{revenue.toLocaleString('en-IN')}
                </span>
              </>
            )}
            {pendingCount !== undefined && pendingCount > 0 && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-bold text-amber-500 animate-pulse flex items-center gap-1">
                  <span>⏳</span> {pendingCount} pending review
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Pickers Drawer (when custom is selected) */}
      {range === 'custom' && (
        <div
          className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-2.5 sm:gap-4 animate-fade-in ${
            isLight ? 'border-[#E8E2D8]' : 'border-white/10'
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className={`font-semibold text-[11px] uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              From:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono outline-none transition-colors ${
                isLight
                  ? 'bg-[#FAF7F2] border-[#DDD5C7] text-[#1C1917] focus:border-[#B45309]'
                  : 'bg-black/40 border-white/10 text-white focus:border-amber-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className={`font-semibold text-[11px] uppercase tracking-wider ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
              To:
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono outline-none transition-colors ${
                isLight
                  ? 'bg-[#FAF7F2] border-[#DDD5C7] text-[#1C1917] focus:border-[#B45309]'
                  : 'bg-black/40 border-white/10 text-white focus:border-amber-500'
              }`}
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={handleResetCustom}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                isLight
                  ? 'text-red-700 bg-red-100/60 hover:bg-red-100'
                  : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
              }`}
            >
              <X className="w-3 h-3" />
              <span>Clear Dates</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
