'use client';

import React, { useState } from 'react';
import { 
  PlusCircle, Phone, MapPin, CheckCircle2, 
  ArrowRight, X 
} from 'lucide-react';
import { Branch, LedgerEntry } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface BranchesViewProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  ledger: LedgerEntry[];
  selectedBranch: string;
  onSelectBranch: (id: string) => void;
}

export default function BranchesView({
  branches,
  setBranches,
  ledger,
  selectedBranch,
  onSelectBranch,
}: BranchesViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', city: 'Hyderabad', address: '', phone: '' });

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active' }),
      });
      const data = await res.json();
      if (res.ok && data.branch) {
        setBranches((prev) => [...prev, data.branch]);
        setShowModal(false);
        setForm({ name: '', code: '', city: 'Hyderabad', address: '', phone: '' });
      } else {
        alert('Failed to register branch: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full border"
              style={{ backgroundColor: themeConfig.light, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              Enterprise Expansion
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Multi-Unit Network</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Franchise & Kitchen Network
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          <PlusCircle className="w-4 h-4" /> Add Franchise / Kitchen
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => {
          const isSelected = selectedBranch === b.id;
          const branchOrders = ledger.filter((l) => l.branch_id === b.id);
          const branchRevenue = branchOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

          return (
            <Glass
              key={b.id}
              isLight={isLight}
              className={`p-6 flex flex-col justify-between space-y-6 transition-all duration-300 ${
                isSelected
                  ? 'border-amber-500/80 bg-amber-500/5 shadow-xl shadow-amber-500/10'
                  : 'hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-500 px-2 py-0.5 rounded bg-amber-500/10">
                      {b.code || 'HUB'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      {b.status || 'Active'}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Scoped
                    </span>
                  )}
                </div>

                <h3 className={`font-serif text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{b.name}</h3>

                <div className={`space-y-1.5 mt-3 text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  {b.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span className="truncate">{b.address}, {b.city}</span>
                    </p>
                  )}
                  {b.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>{b.phone}</span>
                    </p>
                  )}
                </div>

                {/* Performance Snapshot */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/5">
                  <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                    <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Sales Volume</span>
                    <p className="text-base font-black font-mono mt-0.5 text-emerald-500">₹{branchRevenue.toLocaleString('en-IN')}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                    <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Orders</span>
                    <p className="text-base font-black font-mono mt-0.5">{branchOrders.length}</p>
                  </div>
                </div>
              </div>

              {/* Scope Action */}
              <button
                type="button"
                onClick={() => onSelectBranch(isSelected ? 'ALL' : b.id)}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-500'
                    : isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
                }`}
              >
                <span>{isSelected ? 'View All Franchises' : 'Scope Telemetry to This Hub'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Glass>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h3 className="font-serif text-lg font-bold">Register New Hub / Cloud Kitchen</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBranch} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Outlet / Hub Name</label>
                <input
                  required
                  placeholder="e.g. Hitec City Cloud Kitchen"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Outlet Code</label>
                  <input
                    required
                    placeholder="e.g. HC-04"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className={inputCls(isLight)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">City</label>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={inputCls(isLight)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Address / Landmark</label>
                <input
                  placeholder="Street / Unit Number"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Phone</label>
                <input
                  placeholder="+91 ..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                >
                  Save Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
