'use client';

import React from 'react';
import { Building2, IndianRupee } from 'lucide-react';
import { Branch, LedgerEntry } from '@/types';
import { Glass } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface SuperAdminViewProps {
  branches: Branch[];
  ledger: LedgerEntry[];
  selectedBranch: string;
  onSelectBranch: (id: string) => void;
}

export default function SuperAdminView({
  branches,
  ledger,
  onSelectBranch,
}: SuperAdminViewProps) {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  const totalGross = ledger.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400"
            >
              Enterprise Tier
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Super Admin Root Control</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Super Admin HQ & System Audit
          </h1>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Glass isLight={isLight} className="p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Database Node</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">PostgreSQL Live</p>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            Connected to Supabase (ap-northeast-1)
          </p>
        </Glass>

        <Glass isLight={isLight} className="p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Enterprise Network</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black font-mono">{branches.length} Active Kitchens</p>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            Synchronized across all city outlets
          </p>
        </Glass>

        <Glass isLight={isLight} className="p-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Total Consolidated GMV</span>
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">₹{totalGross.toLocaleString('en-IN')}</p>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            Across all {ledger.length} processed orders
          </p>
        </Glass>
      </div>

      {/* Cross-Branch Revenue Matrix */}
      <Glass isLight={isLight} className="p-6 space-y-4">
        <h3 className={`font-serif text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Franchise Performance Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isLight ? 'border-slate-100 text-slate-400' : 'border-white/5 text-gray-500'} font-extrabold uppercase tracking-widest text-[10px]`}>
                <th className="pb-3 px-3">Branch / Hub</th>
                <th className="pb-3 px-3">Code</th>
                <th className="pb-3 px-3">City</th>
                <th className="pb-3 px-3">Total Orders</th>
                <th className="pb-3 px-3">Gross Revenue</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {branches.map((b) => {
                const bOrders = ledger.filter((l) => l.branch_id === b.id);
                const bRev = bOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

                return (
                  <tr key={b.id} className={`${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors`}>
                    <td className="py-3.5 px-3 font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-gray-400">{b.code || '—'}</td>
                    <td className="py-3.5 px-3">{b.city || 'Hyderabad'}</td>
                    <td className="py-3.5 px-3 font-mono font-bold">{bOrders.length}</td>
                    <td className="py-3.5 px-3 font-mono font-extrabold text-emerald-400">
                      ₹{bRev.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10">
                        {b.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Glass>
    </div>
  );
}
