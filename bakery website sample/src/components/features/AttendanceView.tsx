'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, X, User } from 'lucide-react';
import { Branch, StaffAttendance } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface AttendanceViewProps {
  branches: Branch[];
  selectedBranch: string;
  onSelectBranch?: (id: string) => void;
  isSuperAdmin?: boolean;
  sessionRole?: string;
  sessionBranchId?: string;
}

export default function AttendanceView({
  branches,
  selectedBranch,
}: AttendanceViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    staff_name: '',
    role: 'Baker',
    status: 'present' as StaffAttendance['status'],
    shift: 'Morning' as StaffAttendance['shift'],
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/attendance');
        const data = await res.json();
        if (active) {
          setRecords(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          branch_id: selectedBranch === 'ALL' ? (branches[0]?.id || null) : selectedBranch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.attendance) {
        setRecords((prev) => [data.attendance, ...prev]);
        setShowModal(false);
        setForm({ staff_name: '', role: 'Baker', status: 'present', shift: 'Morning' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRecords = records.filter(
    (r) => selectedBranch === 'ALL' || !r.branch_id || r.branch_id === selectedBranch
  );

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
              Human Capital
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>• Daily Staff Roster</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Staff Attendance & Shifts
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
        >
          <PlusCircle className="w-4 h-4" /> Clock In Staff
        </button>
      </div>

      {/* Roster Table */}
      <Glass isLight={isLight} className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isLight ? 'border-slate-100 text-slate-400' : 'border-white/5 text-gray-500'} font-extrabold uppercase tracking-widest text-[10px]`}>
                <th className="pb-3 px-3">Staff Name</th>
                <th className="pb-3 px-3">Kitchen Role</th>
                <th className="pb-3 px-3">Shift</th>
                <th className="pb-3 px-3">Clock In Time</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className={`${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'} transition-colors`}>
                  <td className="py-3.5 px-3 font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-500" />
                    <span>{rec.staff_name}</span>
                  </td>
                  <td className="py-3.5 px-3 text-gray-400 font-medium">{rec.role}</td>
                  <td className="py-3.5 px-3 font-mono">{rec.shift}</td>
                  <td className="py-3.5 px-3 font-mono text-gray-400">
                    {rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                        rec.status === 'present'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : rec.status === 'half_day'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-mono text-xs">
                    No staff attendance logged for today yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Glass>

      {/* Clock In Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h3 className="font-serif text-lg font-bold">Clock In Kitchen Staff</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogAttendance} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Staff Member Name</label>
                <input
                  required
                  placeholder="e.g. Chef Marco or Alex"
                  value={form.staff_name}
                  onChange={(e) => setForm({ ...form, staff_name: e.target.value })}
                  className={inputCls(isLight)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Role</label>
                  <input
                    required
                    placeholder="e.g. Head Baker, Barista"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className={inputCls(isLight)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Shift</label>
                  <select
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value as StaffAttendance['shift'] })}
                    className={inputCls(isLight)}
                  >
                    <option value="Morning" className="bg-neutral-900 text-white">Morning (06:00 - 14:00)</option>
                    <option value="Evening" className="bg-neutral-900 text-white">Evening (14:00 - 22:00)</option>
                    <option value="Night" className="bg-neutral-900 text-white">Night Bake (22:00 - 06:00)</option>
                    <option value="Full Day" className="bg-neutral-900 text-white">Full Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Attendance Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StaffAttendance['status'] })}
                  className={inputCls(isLight)}
                >
                  <option value="present" className="bg-neutral-900 text-white">Present (On Duty)</option>
                  <option value="half_day" className="bg-neutral-900 text-white">Half Day</option>
                  <option value="on_leave" className="bg-neutral-900 text-white">On Leave</option>
                  <option value="absent" className="bg-neutral-900 text-white">Absent</option>
                </select>
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
                  Confirm Clock In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
