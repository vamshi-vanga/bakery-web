'use client';

import React, { useState } from 'react';
import { 
  Pin, CheckSquare, Calendar, Trash2, 
  Plus, Check, X, Search, RotateCcw
} from 'lucide-react';
import { BakeryNote, NoteColor } from '@/types';
import { Glass, inputCls } from '@/components/ui/Primitives';
import { useTheme } from '@/lib/theme-context';

interface NotesViewProps {
  notes: BakeryNote[];
  setNotes: React.Dispatch<React.SetStateAction<BakeryNote[]>>;
  onRefresh?: () => void;
}

// Color schemes inspired by Google Keep (supporting light & dark glass)
const COLOR_CONFIG: Record<NoteColor, {
  name: string;
  bgDark: string;
  bgLight: string;
  borderDark: string;
  borderLight: string;
  pillColor: string;
}> = {
  amber: {
    name: 'Artisan Amber',
    bgDark: 'bg-[#291e0a]/70',
    bgLight: 'bg-[#FEF3C7]/80',
    borderDark: 'border-amber-500/30',
    borderLight: 'border-amber-300',
    pillColor: 'bg-amber-500/20 text-amber-500',
  },
  rose: {
    name: 'Berry Coral',
    bgDark: 'bg-[#2b1016]/70',
    bgLight: 'bg-[#FFE4E6]/80',
    borderDark: 'border-rose-500/30',
    borderLight: 'border-rose-300',
    pillColor: 'bg-rose-500/20 text-rose-500',
  },
  emerald: {
    name: 'Sage Mint',
    bgDark: 'bg-[#0d261a]/70',
    bgLight: 'bg-[#DCFCE7]/80',
    borderDark: 'border-emerald-500/30',
    borderLight: 'border-emerald-300',
    pillColor: 'bg-emerald-500/20 text-emerald-500',
  },
  sky: {
    name: 'Morning Sky',
    bgDark: 'bg-[#0c2236]/70',
    bgLight: 'bg-[#E0F2FE]/80',
    borderDark: 'border-sky-500/30',
    borderLight: 'border-sky-300',
    pillColor: 'bg-sky-500/20 text-sky-500',
  },
  indigo: {
    name: 'Lavender Dusk',
    bgDark: 'bg-[#1b1933]/70',
    bgLight: 'bg-[#EDE9FE]/80',
    borderDark: 'border-indigo-500/30',
    borderLight: 'border-indigo-300',
    pillColor: 'bg-indigo-500/20 text-indigo-500',
  },
  slate: {
    name: 'Charcoal Minimal',
    bgDark: 'bg-[#18181b]/70',
    bgLight: 'bg-[#F1F5F9]/80',
    borderDark: 'border-white/10',
    borderLight: 'border-slate-300',
    pillColor: 'bg-gray-500/20 text-gray-400',
  },
  violet: {
    name: 'Royal Fig',
    bgDark: 'bg-[#271033]/70',
    bgLight: 'bg-[#F3E8FF]/80',
    borderDark: 'border-purple-500/30',
    borderLight: 'border-purple-300',
    pillColor: 'bg-purple-500/20 text-purple-500',
  },
};

const POPULAR_TAGS = ['VIP Order', 'Kitchen SOP', 'Recipes', 'Supplies', 'Maintenance', 'Weekend Specials'];

export default function NotesView({
  notes,
  setNotes,
  onRefresh,
}: NotesViewProps) {
  const { mode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  // Search & Filter
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('All');

  // "Take a note" expanded form state
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<NoteColor>('amber');
  const [isPinned, setIsPinned] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Checklist creator
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Toggle checklist item completion directly on card
  const handleToggleChecklistOnCard = async (noteId: string, itemId: string) => {
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote || !targetNote.checklist) return;

    const updatedChecklist = targetNote.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    // Optimistic UI update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, checklist: updatedChecklist } : n))
    );

    try {
      await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, checklist: updatedChecklist }),
      });
    } catch (err) {
      console.error('Failed to update note checklist:', err);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (note: BakeryNote) => {
    const nextPinned = !note.is_pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPinned } : n))
    );

    try {
      await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id, is_pinned: nextPinned }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Change Note Color
  const handleChangeColor = async (noteId: string, newColor: NoteColor) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, color: newColor } : n))
    );

    try {
      await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, color: newColor }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this kitchen note?')) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));

    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  // Add Item to creation checklist
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      { id: String(Date.now()), text: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText('');
  };

  // Save New Note
  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && !content.trim() && checklistItems.length === 0) {
      setIsExpanded(false);
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          color: selectedColor,
          is_pinned: isPinned,
          target_date: targetDate || null,
          tags: selectedTags,
          checklist: checklistItems,
        }),
      });

      const data = await res.json();
      if (data.success && data.note) {
        setNotes((prev) => [data.note, ...prev]);
        // Reset form
        setTitle('');
        setContent('');
        setSelectedColor('amber');
        setIsPinned(false);
        setTargetDate('');
        setSelectedTags([]);
        setChecklistItems([]);
        setIsChecklistMode(false);
        setIsExpanded(false);
      } else {
        alert('Failed to save note: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error creating note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !search ||
      (n.title && n.title.toLowerCase().includes(search.toLowerCase())) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.tags && n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

    const matchesTag = activeTag === 'All' || (n.tags && n.tags.includes(activeTag));
    return matchesSearch && matchesTag;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const otherNotes = filteredNotes.filter((n) => !n.is_pinned);

  // Render a Single Note Card
  const renderNoteCard = (note: BakeryNote) => {
    const colorStyle = COLOR_CONFIG[note.color] || COLOR_CONFIG.amber;
    const cardBg = isLight ? colorStyle.bgLight : colorStyle.bgDark;
    const cardBorder = isLight ? colorStyle.borderLight : colorStyle.borderDark;

    return (
      <div
        key={note.id}
        className={`group relative rounded-2xl p-4.5 border backdrop-blur-xl transition-all duration-200 hover:shadow-xl flex flex-col justify-between ${cardBg} ${cardBorder}`}
      >
        <div>
          {/* Card Top: Title, Target Date, Pin Button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`font-serif text-sm font-bold leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {note.title || 'Untitled Kitchen Note'}
            </h4>
            <button
              onClick={() => handleTogglePin(note)}
              className={`p-1 rounded-lg transition-colors shrink-0 ${
                note.is_pinned
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-gray-400 hover:text-white opacity-40 group-hover:opacity-100'
              }`}
              title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
            >
              <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Specific Date Badge */}
          {note.target_date && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold mb-2.5 bg-black/20 text-amber-400 border border-amber-500/20">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(note.target_date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Content Body */}
          {note.content && (
            <p className={`text-xs whitespace-pre-wrap leading-relaxed mb-3 ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>
              {note.content}
            </p>
          )}

          {/* Checklist Items */}
          {note.checklist && note.checklist.length > 0 && (
            <div className="space-y-1.5 my-2.5">
              {note.checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklistOnCard(note.id, item.id)}
                  className="flex items-start gap-2 text-xs cursor-pointer select-none group/item"
                >
                  <div
                    className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : isLight
                        ? 'border-slate-400 bg-white/50'
                        : 'border-white/30 bg-black/30'
                    }`}
                  >
                    {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={`leading-tight transition-all ${
                      item.completed
                        ? 'line-through opacity-50 text-gray-400'
                        : isLight ? 'text-slate-800' : 'text-gray-100'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    isLight ? 'bg-black/5 border-black/10 text-slate-700' : 'bg-white/10 border-white/15 text-gray-300'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer Actions (Visible on hover) */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/10 dark:border-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
          {/* Color Switcher Dots */}
          <div className="flex items-center gap-1">
            {(Object.keys(COLOR_CONFIG) as NoteColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleChangeColor(note.id, c)}
                className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${
                  note.color === c ? 'ring-2 ring-white scale-110' : ''
                }`}
                style={{
                  backgroundColor:
                    c === 'amber' ? '#F59E0B' :
                    c === 'rose' ? '#F43F5E' :
                    c === 'emerald' ? '#10B981' :
                    c === 'sky' ? '#0284C7' :
                    c === 'indigo' ? '#6366F1' :
                    c === 'violet' ? '#9333EA' : '#475569',
                  borderColor: 'rgba(255,255,255,0.4)',
                }}
                title={COLOR_CONFIG[c].name}
              />
            ))}
          </div>

          <button
            onClick={() => handleDeleteNote(note.id)}
            className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: themeConfig.primary }}
            />
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Google Keep Inspired Kitchen Board
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Daily Bakery Notes & Prep
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            Pin special VIP orders, morning proofing schedules, technician reminders, and daily bakery checklists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-2.5 rounded-xl border transition-colors ${
                isLight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-white/10 hover:bg-white/5 text-gray-300'
              }`}
              title="Refresh Notes"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* GOOGLE KEEP "TAKE A NOTE..." INPUT BAR */}
      <div className="max-w-2xl mx-auto">
        {!isExpanded ? (
          <div
            onClick={() => setIsExpanded(true)}
            className={`cursor-pointer rounded-2xl p-3.5 px-5 border shadow-lg backdrop-blur-xl flex items-center justify-between transition-all hover:border-amber-500/40 ${
              isLight ? 'bg-white/80 border-slate-200 text-slate-500' : 'bg-[#18181B]/80 border-white/10 text-gray-400'
            }`}
          >
            <span className="text-xs font-medium">Take a kitchen note, prep checklist, or VIP order...</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChecklistMode(true);
                  setIsExpanded(true);
                }}
                className="p-1 hover:text-amber-500 transition-colors"
                title="New Checklist"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="p-1 hover:text-amber-500 transition-colors"
                title="New Note with Date"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl p-5 border shadow-2xl backdrop-blur-2xl transition-all animate-scale-in ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#18181B] border-white/20 text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <input
                type="text"
                placeholder="Title (e.g. Wedding Cake Delivery / Oven Maintenance)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent font-serif font-bold text-base outline-none placeholder:text-gray-400 placeholder:font-normal"
              />
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned ? 'text-amber-500 fill-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-white'
                }`}
                title={isPinned ? 'Pinned' : 'Pin note'}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Note Text Content */}
            {!isChecklistMode ? (
              <textarea
                rows={3}
                placeholder="Take a note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-transparent text-xs resize-none outline-none leading-relaxed placeholder:text-gray-400 mb-3"
              />
            ) : null}

            {/* Interactive Checklist Editor */}
            {isChecklistMode && (
              <div className="space-y-2 mb-4">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="flex-1 font-medium">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-400 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Add checklist item & press Enter..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    #{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Target Date Picker & Quick Tags Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-transparent text-[11px] font-mono outline-none text-gray-300"
                />
              </div>

              {/* Mode Toggle Checklist / Plain Text */}
              <button
                type="button"
                onClick={() => setIsChecklistMode(!isChecklistMode)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                  isChecklistMode
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                    : 'border-white/10 hover:bg-white/5 text-gray-400'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Checklist</span>
              </button>

              {/* Tag Quick Select */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {POPULAR_TAGS.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => handleAddTag(pt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      selectedTags.includes(pt)
                        ? 'bg-amber-500 text-black'
                        : isLight
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    +{pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Color Picker & Save */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10">
              {/* Color Circles */}
              <div className="flex items-center gap-1.5">
                {(Object.keys(COLOR_CONFIG) as NoteColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                      selectedColor === c ? 'ring-2 ring-amber-500 scale-125' : ''
                    }`}
                    style={{
                      backgroundColor:
                        c === 'amber' ? '#F59E0B' :
                        c === 'rose' ? '#F43F5E' :
                        c === 'emerald' ? '#10B981' :
                        c === 'sky' ? '#0284C7' :
                        c === 'indigo' ? '#6366F1' :
                        c === 'violet' ? '#9333EA' : '#475569',
                      borderColor: 'rgba(255,255,255,0.4)',
                    }}
                    title={COLOR_CONFIG[c].name}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleCreateNote()}
                  className="px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black shadow-md hover:opacity-95"
                  style={{ backgroundColor: themeConfig.primary }}
                >
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH & TAG FILTER BAR */}
      <Glass isLight={isLight} className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes, checklists, or VIP dates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls(isLight)} pl-9 text-xs`}
            />
          </div>

          {/* Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {['All', ...POPULAR_TAGS].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTag === t
                    ? 'bg-amber-500 text-black shadow-sm'
                    : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Glass>

      {/* PINNED NOTES SECTION */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-500 px-1">
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>Pinned Kitchen Notes ({pinnedNotes.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}

      {/* ALL / OTHER NOTES SECTION */}
      <div className="space-y-3">
        {pinnedNotes.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-gray-400 px-1">
            <span>Other Notes & Checklists ({otherNotes.length})</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherNotes.map((note) => renderNoteCard(note))}
        </div>
      </div>

      {filteredNotes.length === 0 && (
        <div className="py-16 text-center text-gray-500 text-xs font-mono">
          No kitchen notes match your search or filter. Take a note above to add reminders.
        </div>
      )}

    </div>
  );
}
