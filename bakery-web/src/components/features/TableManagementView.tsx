'use client';

import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, ArrowRight, X } from 'lucide-react';
import { Branch, LedgerEntry, Table } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface TableManagementViewProps {
  branches: Branch[];
  selectedBranch: string;
  onSelectBranch: (id: string) => void;
  isSuperAdmin: boolean;
  ledger: LedgerEntry[];
  onOpenPos: (tableNum: string, branchId?: string) => void;
}

export default function TableManagementView({
  branches,
  selectedBranch,
  ledger,
  onOpenPos,
}: TableManagementViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTable, setNewTable] = useState({ table_number: '', capacity: 4, section: 'Main Hall', status: 'available' });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/tables');
        const data = await res.json();
        if (active) setTables(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load tables:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      const data = await res.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  };

  const handleUpdateStatus = async (tableId: string, status: Table['status']) => {
    try {
      await fetch('/api/tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, status }),
      });
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status } : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTable,
          branch_id: selectedBranch === 'ALL' ? (branches[0]?.id || null) : selectedBranch,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewTable({ table_number: '', capacity: 4, section: 'Main Hall', status: 'available' });
        fetchTables();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTables = tables.filter((t) => {
    const branchMatch = selectedBranch === 'ALL' || !t.branch_id || t.branch_id === selectedBranch;
    const sectionMatch = filterSection === 'ALL' || t.section === filterSection;
    return branchMatch && sectionMatch;
  });

  const sections = Array.from(new Set(tables.map((t) => t.section))).filter(Boolean);

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'occupied':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'reserved':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'billing':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
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
              Floor Plan
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Dine-in & Cloud Counters</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Table & Floor Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Add Table
          </button>
        </div>
      </div>

      {/* Section Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setFilterSection('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            filterSection === 'ALL'
              ? 'bg-amber-500 text-black'
              : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          All Sections ({tables.length})
        </button>
        {sections.map((sec) => (
          <button
            key={sec}
            onClick={() => setFilterSection(sec)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterSection === sec
                ? 'bg-amber-500 text-black'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredTables.map((t) => (
          <Glass
            key={t.id}
            isLight={isLight}
            className="p-6 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-amber-500">{t.table_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-mono font-bold">{t.capacity}p</span>
                </div>
              </div>

              <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Section: <span className="font-semibold text-white/80">{t.section}</span>
              </p>
            </div>

            {/* Quick Status Toggles & POS Action */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                {(['available', 'occupied', 'billing'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(t.id, st)}
                    className={`flex-1 py-1 text-[10px] rounded font-bold uppercase transition-colors ${
                      t.status === st
                        ? 'bg-amber-500 text-black'
                        : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {st.slice(0, 4)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onOpenPos(t.table_number, t.branch_id || undefined)}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-all hover:border-amber-500/30"
              >
                <span>Punch POS Order</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          </Glass>
        ))}

        {filteredTables.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-gray-500 text-xs font-mono">
            No tables configured in this section. Click &ldquo;+ Add Table&rdquo; above to register floor seating.
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg font-bold">Add Floor Table</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Table Number / Label</label>
                <input
                  required
                  placeholder="e.g. T-07 or Patio-02"
                  value={newTable.table_number}
                  onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: Number(e.target.value) })}
                    className={inputCls(isLight)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Section</label>
                  <input
                    placeholder="e.g. Main Hall"
                    value={newTable.section}
                    onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
                    className={inputCls(isLight)}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
