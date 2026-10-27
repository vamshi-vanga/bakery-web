import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

export interface BakeryNote {
  id: string;
  bakeryId: string;
  title: string;
  content: string;
  date: string; // ISO format: 'YYYY-MM-DD'
  color: string; // 'default' | 'amber' | 'emerald' | 'sky' | 'purple' | 'rose' | 'orange'
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteColorOption {
  key: string;
  name: string;
  lightBg: string;
  darkBg: string;
  borderLight: string;
  borderDark: string;
}

export const NOTE_COLORS: NoteColorOption[] = [
  { key: 'default', name: 'Default', lightBg: '#FFFFFF', darkBg: '#1E2538', borderLight: '#E2E8F0', borderDark: '#2D3748' },
  { key: 'amber', name: 'Warm Amber', lightBg: '#FEF3C7', darkBg: '#451A03', borderLight: '#FDE68A', borderDark: '#78350F' },
  { key: 'emerald', name: 'Fresh Mint', lightBg: '#D1FAE5', darkBg: '#064E3B', borderLight: '#A7F3D0', borderDark: '#047857' },
  { key: 'sky', name: 'Sky Blue', lightBg: '#E0F2FE', darkBg: '#082F49', borderLight: '#BAE6FD', borderDark: '#0369A1' },
  { key: 'purple', name: 'Lavender', lightBg: '#EDE9FE', darkBg: '#3B0764', borderLight: '#DDD6FE', borderDark: '#6D28D9' },
  { key: 'rose', name: 'Rose', lightBg: '#FFE4E6', darkBg: '#4C0519', borderLight: '#FECDD3', borderDark: '#9F1239' },
  { key: 'orange', name: 'Peach', lightBg: '#FFEDD5', darkBg: '#431407', borderLight: '#FED7AA', borderDark: '#9A3412' },
];

export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatNoteDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return `Today, ${format(d, 'd MMM')}`;
    if (isTomorrow(d)) return `Tomorrow, ${format(d, 'd MMM')}`;
    if (isYesterday(d)) return `Yesterday, ${format(d, 'd MMM')}`;
    return format(d, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

interface NotesState {
  notes: BakeryNote[];
  activeBakeryId: string | null;
  activeNoteId: string | null;
  selectedDateFilter: string | null; // null = 'All', or 'YYYY-MM-DD'
  searchQuery: string;
  isSaving: boolean;
  lastSavedAt: string | null;
  isLoading: boolean;

  loadNotes: (bakeryId: string) => Promise<void>;
  createNote: (bakeryId: string, customDate?: string) => BakeryNote;
  updateNote: (id: string, updates: Partial<Omit<BakeryNote, 'id' | 'bakeryId' | 'createdAt'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setNoteColor: (id: string, color: string) => Promise<void>;
  setActiveNoteId: (id: string | null) => void;
  setSelectedDateFilter: (date: string | null) => void;
  setSearchQuery: (query: string) => void;
  cleanupEmptyDrafts: () => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeBakeryId: null,
  activeNoteId: null,
  selectedDateFilter: null,
  searchQuery: '',
  isSaving: false,
  lastSavedAt: null,
  isLoading: false,

  loadNotes: async (bakeryId: string) => {
    set({ isLoading: true, activeBakeryId: bakeryId });
    try {
      const stored = await AsyncStorage.getItem(`@bakeflow_notes_${bakeryId}`);
      if (stored) {
        const parsed: BakeryNote[] = JSON.parse(stored);
        set({ notes: parsed });
      } else {
        // First time initialization with a welcome bakery reminder note
        const initialNote: BakeryNote = {
          id: 'welcome_note',
          bakeryId,
          title: 'Daily Bakery Reminders & Orders',
          content: 'Keep track of advance cake bookings, daily morning milk deliveries, egg & flour restock reminders, and customer custom instructions right here.\n\nNotes are organized by date and auto-saved instantly as you type!',
          date: getTodayDateString(),
          color: 'amber',
          isPinned: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const initialList = [initialNote];
        await AsyncStorage.setItem(`@bakeflow_notes_${bakeryId}`, JSON.stringify(initialList));
        set({ notes: initialList });
      }
    } catch (err) {
      console.warn('Failed to load notes from storage:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createNote: (bakeryId: string, customDate?: string) => {
    const newNote: BakeryNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      bakeryId,
      title: '',
      content: '',
      date: customDate || getTodayDateString(),
      color: 'default',
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newNote, ...get().notes];
    set({ notes: updated, activeNoteId: newNote.id, isSaving: false });

    // Persist to AsyncStorage in background
    AsyncStorage.setItem(`@bakeflow_notes_${bakeryId}`, JSON.stringify(updated)).catch((e) =>
      console.warn('Failed to persist new note:', e)
    );

    return newNote;
  },

  updateNote: async (id: string, updates: Partial<Omit<BakeryNote, 'id' | 'bakeryId' | 'createdAt'>>) => {
    const { notes, activeBakeryId } = get();
    if (!activeBakeryId) return;

    set({ isSaving: true });

    const nowIso = new Date().toISOString();
    const updated = notes.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: nowIso } : n
    );

    set({
      notes: updated,
      isSaving: false,
      lastSavedAt: format(new Date(), 'HH:mm:ss'),
    });

    try {
      await AsyncStorage.setItem(`@bakeflow_notes_${activeBakeryId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to auto-save note:', err);
    }
  },

  deleteNote: async (id: string) => {
    const { notes, activeBakeryId, activeNoteId } = get();
    if (!activeBakeryId) return;

    const filtered = notes.filter((n) => n.id !== id);
    set({
      notes: filtered,
      activeNoteId: activeNoteId === id ? null : activeNoteId,
    });

    try {
      await AsyncStorage.setItem(`@bakeflow_notes_${activeBakeryId}`, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Failed to delete note from storage:', err);
    }
  },

  togglePin: async (id: string) => {
    const { notes, activeBakeryId } = get();
    if (!activeBakeryId) return;

    const updated = notes.map((n) =>
      n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
    );

    set({ notes: updated });
    try {
      await AsyncStorage.setItem(`@bakeflow_notes_${activeBakeryId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to toggle pin:', err);
    }
  },

  setNoteColor: async (id: string, color: string) => {
    const { notes, activeBakeryId } = get();
    if (!activeBakeryId) return;

    const updated = notes.map((n) =>
      n.id === id ? { ...n, color, updatedAt: new Date().toISOString() } : n
    );

    set({ notes: updated });
    try {
      await AsyncStorage.setItem(`@bakeflow_notes_${activeBakeryId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update note color:', err);
    }
  },

  setActiveNoteId: (id: string | null) => set({ activeNoteId: id }),
  setSelectedDateFilter: (date: string | null) => set({ selectedDateFilter: date }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  cleanupEmptyDrafts: async () => {
    const { notes, activeBakeryId } = get();
    if (!activeBakeryId) return;

    const nonEmpty = notes.filter((n) => n.title.trim().length > 0 || n.content.trim().length > 0);
    if (nonEmpty.length !== notes.length) {
      set({ notes: nonEmpty });
      try {
        await AsyncStorage.setItem(`@bakeflow_notes_${activeBakeryId}`, JSON.stringify(nonEmpty));
      } catch (err) {
        console.warn('Failed to cleanup empty drafts:', err);
      }
    }
  },
}));
