'use client';

import React from 'react';
import { TrendingUp, Lightbulb, Clock } from 'lucide-react';
import { Glass } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

export default function IntelligenceView() {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400"
          >
            Neural Operations
          </span>
          <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Predictive Kitchen Engine</span>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          AI Kitchen Intelligence & Forecasts
        </h1>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Glass isLight={isLight} className="p-6 space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Peak Demand Window</span>
          </div>
          <h3 className="text-xl font-serif font-bold">08:30 AM — 11:00 AM</h3>
          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
            Morning breakfast rush accounts for 44% of daily Croissant and Cold Brew sales. Pre-bake 25% larger batches by 07:45 AM to prevent stock-outs.
          </p>
        </Glass>

        <Glass isLight={isLight} className="p-6 space-y-3 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>High-Margin Pairing</span>
          </div>
          <h3 className="text-xl font-serif font-bold">Opera Cake + Vanilla Cold Brew</h3>
          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
            Customers who add an Opera Cake slice have a 68% propensity to order a signature beverage when suggested at checkout. Projected basket uplift: +₹220.
          </p>
        </Glass>

        <Glass isLight={isLight} className="p-6 space-y-3 border-rose-500/30 bg-rose-500/5">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4" />
            <span>Waste Reduction Strategy</span>
          </div>
          <h3 className="text-xl font-serif font-bold">Sourdough Inventory Alert</h3>
          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
            Day-old sourdough surplus can be upcycled into Garlic Herb Croutons or French Toast prep for the morning kitchen, recovering up to 88% ingredient cost.
          </p>
        </Glass>
      </div>

      {/* Production Planning Schedule */}
      <Glass isLight={isLight} className="p-6 space-y-4">
        <h3 className={`font-serif text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          AI Recommended Night-Bake Schedule
        </h3>

        <div className="space-y-3">
          {[
            { time: '03:30 AM', task: 'Slow-ferment Sourdough Score & Oven Loading', target: '24 Country Batards', status: 'Optimal' },
            { time: '04:45 AM', task: 'Lamination & Rolling for French Croissants & Pain au Chocolat', target: '48 Viennoiseries', status: 'High Demand' },
            { time: '06:00 AM', task: 'Cheesecake Decorating & Fruit Tart Glazing', target: '18 Whole Cakes/Slices', status: 'Prepared' },
            { time: '07:15 AM', task: 'Cold Brew Filtration & Sweet Cream Batching', target: '30 Litres', status: 'Ready for Open' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#18181B]/60 border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  {item.time}
                </span>
                <div>
                  <p className="text-xs font-bold">{item.task}</p>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Target Output: {item.target}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </Glass>
    </div>
  );
}
