import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Search,
  Plus,
  Pin,
  PinOff,
  Trash2,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import {
  format,
  parseISO,
  addDays,
  subDays,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import {
  useNotesStore,
  BakeryNote,
  NOTE_COLORS,
  getTodayDateString,
  formatNoteDate,
} from '@/stores/notesStore';
import { haptic } from '@/utils/haptics';

interface BakeryNotesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BakeryNotesModal({ visible, onClose }: BakeryNotesModalProps) {
  const { colors, typography, borderRadius, isDark } = useTheme();
  const currentBakery = useAuthStore((s) => s.currentBakery);
  const {
    notes,
    activeNoteId,
    selectedDateFilter,
    searchQuery,
    loadNotes,
    createNote,
    deleteNote,
    togglePin,
    setActiveNoteId,
    setSelectedDateFilter,
    setSearchQuery,
    cleanupEmptyDrafts,
  } = useNotesStore();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Load notes when bakery changes or modal opens
  useEffect(() => {
    if (visible && currentBakery?.id) {
      loadNotes(currentBakery.id);
    }
  }, [visible, currentBakery?.id, loadNotes]);

  // Clean up any empty drafts when modal is closed
  const handleModalClose = () => {
    cleanupEmptyDrafts();
    setActiveNoteId(null);
    onClose();
  };

  // Find active note if editing
  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  // Filter notes based on active date filter and search query
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Filter by date
    if (selectedDateFilter) {
      result = result.filter((n) => n.date === selectedDateFilter);
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.date.includes(q)
      );
    }

    // Sort: Pinned first, then newest updated first
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, selectedDateFilter, searchQuery]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  // Quick date chips
  const todayStr = getTodayDateString();
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Handle creating a new note
  const handleCreateNewNote = (customDate?: string) => {
    if (!currentBakery?.id) return;
    haptic.selection();
    const dateToUse = customDate || selectedDateFilter || todayStr;
    createNote(currentBakery.id, dateToUse);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {activeNote ? (
            <NoteEditorView
              note={activeNote}
              onBack={() => {
                cleanupEmptyDrafts();
                setActiveNoteId(null);
              }}
              onClose={handleModalClose}
            />
          ) : (
            <View style={styles.contentWrap}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
                <View style={styles.headerTitleWrap}>
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <StickyNote size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[typography.h3, { color: colors.text }]}>Bakery Notes</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      Auto-saved daily reminders & bookings
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                  onPress={handleModalClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchSection}>
                <View
                  style={[
                    styles.searchInputWrap,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.searchInput, typography.body, { color: colors.text }]}
                    placeholder="Search notes, reminders, or dates..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Date Filter Bar */}
              <View style={styles.dateFilterContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateFilterScroll}
                >
                  {/* All Dates Filter */}
                  <TouchableOpacity
                    style={[
                      styles.dateFilterChip,
                      {
                        backgroundColor:
                          selectedDateFilter === null ? colors.primary : colors.surface,
                        borderColor:
                          selectedDateFilter === null ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setSelectedDateFilter(null);
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color: selectedDateFilter === null ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      All ({notes.length})
                    </Text>
                  </TouchableOpacity>

                  {/* Today Chip */}
                  <TouchableOpacity
                    style={[
                      styles.dateFilterChip,
                      {
                        backgroundColor:
                          selectedDateFilter === todayStr ? colors.primary : colors.surface,
                        borderColor:
                          selectedDateFilter === todayStr ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setSelectedDateFilter(todayStr);
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color: selectedDateFilter === todayStr ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      Today ({notes.filter((n) => n.date === todayStr).length})
                    </Text>
                  </TouchableOpacity>

                  {/* Tomorrow Chip */}
                  <TouchableOpacity
                    style={[
                      styles.dateFilterChip,
                      {
                        backgroundColor:
                          selectedDateFilter === tomorrowStr ? colors.primary : colors.surface,
                        borderColor:
                          selectedDateFilter === tomorrowStr ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setSelectedDateFilter(tomorrowStr);
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color: selectedDateFilter === tomorrowStr ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      Tomorrow ({notes.filter((n) => n.date === tomorrowStr).length})
                    </Text>
                  </TouchableOpacity>

                  {/* Yesterday Chip */}
                  <TouchableOpacity
                    style={[
                      styles.dateFilterChip,
                      {
                        backgroundColor:
                          selectedDateFilter === yesterdayStr ? colors.primary : colors.surface,
                        borderColor:
                          selectedDateFilter === yesterdayStr ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setSelectedDateFilter(yesterdayStr);
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color: selectedDateFilter === yesterdayStr ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      Yesterday
                    </Text>
                  </TouchableOpacity>

                  {/* Custom Pick Date Chip */}
                  <TouchableOpacity
                    style={[
                      styles.dateFilterChip,
                      {
                        backgroundColor:
                          selectedDateFilter &&
                          selectedDateFilter !== todayStr &&
                          selectedDateFilter !== tomorrowStr &&
                          selectedDateFilter !== yesterdayStr
                            ? colors.primary
                            : colors.surface,
                        borderColor:
                          selectedDateFilter &&
                          selectedDateFilter !== todayStr &&
                          selectedDateFilter !== tomorrowStr &&
                          selectedDateFilter !== yesterdayStr
                            ? colors.primary
                            : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setShowDatePicker(true);
                    }}
                  >
                    <CalendarIcon
                      size={14}
                      color={
                        selectedDateFilter &&
                        selectedDateFilter !== todayStr &&
                        selectedDateFilter !== tomorrowStr &&
                        selectedDateFilter !== yesterdayStr
                          ? '#FFFFFF'
                          : colors.textMuted
                      }
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color:
                            selectedDateFilter &&
                            selectedDateFilter !== todayStr &&
                            selectedDateFilter !== tomorrowStr &&
                            selectedDateFilter !== yesterdayStr
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {selectedDateFilter &&
                      selectedDateFilter !== todayStr &&
                      selectedDateFilter !== tomorrowStr &&
                      selectedDateFilter !== yesterdayStr
                        ? format(parseISO(selectedDateFilter), 'd MMM')
                        : 'Pick Date'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Notes Grid / List */}
              <ScrollView
                style={styles.notesScroll}
                contentContainerStyle={styles.notesScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredNotes.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                      ]}
                    >
                      <StickyNote size={40} color={colors.textMuted} />
                    </View>
                    <Text style={[typography.h3, { color: colors.text, marginTop: 16 }]}>
                      No notes found
                    </Text>
                    <Text
                      style={[
                        typography.body,
                        {
                          color: colors.textMuted,
                          textAlign: 'center',
                          marginTop: 6,
                          paddingHorizontal: 32,
                        },
                      ]}
                    >
                      {selectedDateFilter
                        ? `No notes recorded for ${formatNoteDate(selectedDateFilter)}. Tap below to write a note!`
                        : 'Keep track of advance cake bookings, milk deliveries, and daily tasks.'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.emptyCreateBtn,
                        { backgroundColor: colors.primary, borderRadius: borderRadius.md },
                      ]}
                      onPress={() => handleCreateNewNote()}
                    >
                      <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Create Note</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Pinned Notes Section */}
                    {pinnedNotes.length > 0 && (
                      <View style={styles.sectionWrap}>
                        <View style={styles.sectionHeader}>
                          <Pin size={13} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[typography.captionBold, { color: colors.primary }]}>
                            PINNED
                          </Text>
                        </View>
                        <View style={styles.cardsGrid}>
                          {pinnedNotes.map((note) => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              isDark={isDark}
                              onPress={() => {
                                haptic.selection();
                                setActiveNoteId(note.id);
                              }}
                              onTogglePin={() => {
                                haptic.selection();
                                togglePin(note.id);
                              }}
                              onDelete={() => {
                                haptic.selection();
                                deleteNote(note.id);
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Other Notes Section */}
                    {otherNotes.length > 0 && (
                      <View style={styles.sectionWrap}>
                        {pinnedNotes.length > 0 && (
                          <View style={styles.sectionHeader}>
                            <Text style={[typography.captionBold, { color: colors.textMuted }]}>
                              OTHERS
                            </Text>
                          </View>
                        )}
                        <View style={styles.cardsGrid}>
                          {otherNotes.map((note) => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              isDark={isDark}
                              onPress={() => {
                                haptic.selection();
                                setActiveNoteId(note.id);
                              }}
                              onTogglePin={() => {
                                haptic.selection();
                                togglePin(note.id);
                              }}
                              onDelete={() => {
                                haptic.selection();
                                deleteNote(note.id);
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Bottom Google Keep Style "Take a note..." Bar */}
              <View
                style={[
                  styles.bottomBar,
                  {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.borderSubtle,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.takeNoteInput,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  onPress={() => handleCreateNewNote()}
                  activeOpacity={0.85}
                >
                  <Plus size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[typography.body, { color: colors.textMuted, flex: 1 }]}>
                    Take a note for {selectedDateFilter ? formatNoteDate(selectedDateFilter) : 'today'}...
                  </Text>
                  <View
                    style={[
                      styles.autoSavePill,
                      { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
                    ]}
                  >
                    <Sparkles size={11} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={[typography.captionBold, { color: '#10B981', fontSize: 10 }]}>
                      Auto-Save
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Calendar Date Picker Modal */}
          {showDatePicker && (
            <CalendarPickerModal
              visible={showDatePicker}
              currentSelectedDate={selectedDateFilter || todayStr}
              month={calendarMonth}
              onPrevMonth={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              onNextMonth={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              onSelectDate={(d) => {
                haptic.selection();
                setSelectedDateFilter(d);
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ----------------------------------------------------------------------------------
// NOTE CARD COMPONENT (Google Keep Pastel Aesthetic)
// ----------------------------------------------------------------------------------
interface NoteCardProps {
  note: BakeryNote;
  isDark: boolean;
  onPress: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function NoteCard({ note, isDark, onPress, onTogglePin, onDelete }: NoteCardProps) {
  const { typography } = useTheme();

  const colorOpt = useMemo(
    () => NOTE_COLORS.find((c) => c.key === note.color) || NOTE_COLORS[0],
    [note.color]
  );

  const cardBg = isDark ? colorOpt.darkBg : colorOpt.lightBg;
  const cardBorder = isDark ? colorOpt.borderDark : colorOpt.borderLight;
  const textColor = isDark ? '#F8FAFC' : '#1E293B';
  const textMutedColor = isDark ? '#94A3B8' : '#64748B';

  const confirmDelete = () => {
    Alert.alert(
      'Delete Note?',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top Header inside card: Date & Pin */}
      <View style={styles.cardHeader}>
        <View style={styles.cardDateBadge}>
          <CalendarIcon size={11} color={textMutedColor} style={{ marginRight: 4 }} />
          <Text style={[typography.captionBold, { color: textMutedColor, fontSize: 10 }]}>
            {formatNoteDate(note.date)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onTogglePin}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {note.isPinned ? (
            <Pin size={15} color="#F59E0B" fill="#F59E0B" />
          ) : (
            <Pin size={14} color={textMutedColor} />
          )}
        </TouchableOpacity>
      </View>

      {/* Note Title */}
      {note.title.trim().length > 0 && (
        <Text
          style={[
            typography.bodyBold,
            { color: textColor, marginBottom: 4 },
          ]}
          numberOfLines={2}
        >
          {note.title}
        </Text>
      )}

      {/* Note Content Preview */}
      {note.content.trim().length > 0 ? (
        <Text
          style={[
            typography.body,
            { color: textMutedColor, fontSize: 13, lineHeight: 18 },
          ]}
          numberOfLines={5}
        >
          {note.content}
        </Text>
      ) : (
        <Text style={[typography.caption, { color: textMutedColor, fontStyle: 'italic' }]}>
          Empty note...
        </Text>
      )}

      {/* Card Footer: Quick Actions */}
      <View style={styles.cardFooter}>
        <Text style={[typography.caption, { color: textMutedColor, fontSize: 10 }]}>
          Auto-saved
        </Text>

        <TouchableOpacity
          onPress={confirmDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={13} color={textMutedColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ----------------------------------------------------------------------------------
// NOTE EDITOR VIEW (Google Keep Fullscreen Editor with Live Auto-Save)
// ----------------------------------------------------------------------------------
interface NoteEditorViewProps {
  note: BakeryNote;
  onBack: () => void;
  onClose: () => void;
}

function NoteEditorView({ note, onBack }: NoteEditorViewProps) {
  const { colors, typography, isDark } = useTheme();
  const { updateNote, deleteNote, togglePin, setNoteColor } = useNotesStore();

  // Local draft state for lag-free typing
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [noteDate, setNoteDate] = useState(note.date);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Ref to hold the debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef({ title: note.title, content: note.content, date: note.date });

  // Keep latest draft ref updated
  useEffect(() => {
    latestDraftRef.current = { title: localTitle, content: localContent, date: noteDate };
  }, [localTitle, localContent, noteDate]);

  // Synchronous flush on unmount or back
  const flushSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const { title, content, date } = latestDraftRef.current;
    updateNote(note.id, { title, content, date });
  }, [note.id, updateNote]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [flushSave]);

  // Debounced auto-save function
  const triggerDebouncedSave = (newTitle: string, newContent: string, newDate: string) => {
    setSaveStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateNote(note.id, { title: newTitle, content: newContent, date: newDate }).then(() => {
        setSaveStatus('saved');
      });
    }, 350);
  };

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    triggerDebouncedSave(val, localContent, noteDate);
  };

  const handleContentChange = (val: string) => {
    setLocalContent(val);
    triggerDebouncedSave(localTitle, val, noteDate);
  };

  const handleDateChange = (newDate: string) => {
    setNoteDate(newDate);
    triggerDebouncedSave(localTitle, localContent, newDate);
    setShowDatePicker(false);
  };

  const currentColorOpt = useMemo(
    () => NOTE_COLORS.find((c) => c.key === note.color) || NOTE_COLORS[0],
    [note.color]
  );

  const editorBg = isDark ? currentColorOpt.darkBg : currentColorOpt.lightBg;
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const textMutedColor = isDark ? '#94A3B8' : '#64748B';

  const todayStr = getTodayDateString();
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <View style={[styles.editorContainer, { backgroundColor: editorBg }]}>
      {/* Top Header */}
      <View
        style={[
          styles.editorHeader,
          {
            borderBottomColor: isDark ? currentColorOpt.borderDark : currentColorOpt.borderLight,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.editorBackBtn}
          onPress={() => {
            haptic.selection();
            flushSave();
            onBack();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={textColor} />
        </TouchableOpacity>

        {/* Live Auto-Save Status Indicator */}
        <View style={styles.autoSaveIndicator}>
          {saveStatus === 'saving' ? (
            <View style={styles.statusRow}>
              <Clock size={14} color="#F59E0B" style={{ marginRight: 5 }} />
              <Text style={[typography.captionBold, { color: '#F59E0B' }]}>
                Saving...
              </Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 5 }} />
              <Text style={[typography.captionBold, { color: '#10B981' }]}>
                Saved automatically ✓
              </Text>
            </View>
          )}
        </View>

        {/* Header Actions: Pin, Delete */}
        <View style={styles.editorTopActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => {
              haptic.selection();
              togglePin(note.id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {note.isPinned ? (
              <Pin size={20} color="#F59E0B" fill="#F59E0B" />
            ) : (
              <PinOff size={20} color={textMutedColor} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => {
              Alert.alert('Delete Note?', 'Are you sure you want to delete this note?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    haptic.selection();
                    deleteNote(note.id);
                    onBack();
                  },
                },
              ]);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={20} color={textMutedColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Bar: Shows current note date with quick switchers */}
      <View
        style={[
          styles.editorDateBar,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
            borderColor: isDark ? currentColorOpt.borderDark : currentColorOpt.borderLight,
          },
        ]}
      >
        <CalendarIcon size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[typography.captionBold, { color: textColor, marginRight: 10 }]}>
          Date: {formatNoteDate(noteDate)}
        </Text>

        <View style={styles.quickDateChipsRow}>
          <TouchableOpacity
            style={[
              styles.miniDateChip,
              noteDate === todayStr && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              haptic.selection();
              handleDateChange(todayStr);
            }}
          >
            <Text
              style={[
                typography.captionBold,
                {
                  fontSize: 10,
                  color: noteDate === todayStr ? '#FFFFFF' : textMutedColor,
                },
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.miniDateChip,
              noteDate === tomorrowStr && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              haptic.selection();
              handleDateChange(tomorrowStr);
            }}
          >
            <Text
              style={[
                typography.captionBold,
                {
                  fontSize: 10,
                  color: noteDate === tomorrowStr ? '#FFFFFF' : textMutedColor,
                },
              ]}
            >
              Tomorrow
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniDateChip}
            onPress={() => {
              haptic.selection();
              setShowDatePicker(true);
            }}
          >
            <Text style={[typography.captionBold, { fontSize: 10, color: colors.primary }]}>
              Change Date ▾
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Text Inputs (Google Keep style) */}
      <ScrollView
        style={styles.editorInputScroll}
        contentContainerStyle={styles.editorInputContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <TextInput
          style={[styles.editorTitleInput, typography.h2, { color: textColor }]}
          placeholder="Title"
          placeholderTextColor={textMutedColor}
          value={localTitle}
          onChangeText={handleTitleChange}
          multiline
        />

        {/* Content Input */}
        <TextInput
          style={[styles.editorContentInput, typography.body, { color: textColor }]}
          placeholder="Take a note..."
          placeholderTextColor={textMutedColor}
          value={localContent}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
          autoFocus={note.title === '' && note.content === ''}
        />
      </ScrollView>

      {/* Bottom Color Palette Toolbar */}
      <View
        style={[
          styles.editorBottomToolbar,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.85)',
            borderTopColor: isDark ? currentColorOpt.borderDark : currentColorOpt.borderLight,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorPaletteRow}
        >
          {NOTE_COLORS.map((c) => {
            const isSelected = c.key === note.color;
            const circleBg = isDark ? c.darkBg : c.lightBg;
            const circleBorder = isDark ? c.borderDark : c.borderLight;

            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.colorCircle,
                  {
                    backgroundColor: circleBg,
                    borderColor: isSelected ? colors.primary : circleBorder,
                    borderWidth: isSelected ? 2.5 : 1.5,
                  },
                ]}
                onPress={() => {
                  haptic.selection();
                  setNoteColor(note.id, c.key);
                }}
                accessibilityLabel={c.name}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.selectedColorDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[typography.caption, { color: textMutedColor, fontSize: 10, marginTop: 4 }]}>
          ✨ Auto-saved as you type • No save button needed
        </Text>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <CalendarPickerModal
          visible={showDatePicker}
          currentSelectedDate={noteDate}
          month={calendarMonth}
          onPrevMonth={() => setCalendarMonth(subMonths(calendarMonth, 1))}
          onNextMonth={() => setCalendarMonth(addMonths(calendarMonth, 1))}
          onSelectDate={handleDateChange}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------------
// SLEEK EMBEDDED CALENDAR PICKER MODAL
// ----------------------------------------------------------------------------------
interface CalendarPickerModalProps {
  visible: boolean;
  currentSelectedDate: string;
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

function CalendarPickerModal({
  visible,
  currentSelectedDate,
  month,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onClose,
}: CalendarPickerModalProps) {
  const { colors, typography, borderRadius, isDark } = useTheme();

  // Generate days in month
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.calendarOverlay}>
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={onPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeft size={22} color={colors.text} />
            </TouchableOpacity>

            <Text style={[typography.h3, { color: colors.text }]}>
              {format(month, 'MMMM yyyy')}
            </Text>

            <TouchableOpacity onPress={onNextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronRight size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Week Days */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((d) => (
              <Text key={d} style={[styles.weekDayText, typography.captionBold, { color: colors.textMuted }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = dateStr === currentSelectedDate;
              const isCurMonth = isSameMonth(day, month);
              const isTodayDate = isToday(day);

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 18 },
                    !isSelected && isTodayDate && {
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      borderRadius: 18,
                    },
                  ]}
                  onPress={() => onSelectDate(dateStr)}
                  disabled={!isCurMonth}
                >
                  <Text
                    style={[
                      typography.bodyBold,
                      {
                        fontSize: 13,
                        color: isSelected
                          ? '#FFFFFF'
                          : !isCurMonth
                          ? isDark
                            ? '#334155'
                            : '#CBD5E1'
                          : colors.text,
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Shortcuts */}
          <View style={[styles.calendarFooterShortcuts, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.shortcutBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={() => onSelectDate(getTodayDateString())}
            >
              <Text style={[typography.captionBold, { color: colors.primary }]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={() => onSelectDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
            >
              <Text style={[typography.captionBold, { color: colors.primary }]}>Tomorrow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={onClose}
            >
              <Text style={[typography.captionBold, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ----------------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------------
const { width } = Dimensions.get('window');
const cardWidth = (width - 36) / 2; // 2 column grid

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
  },
  dateFilterContainer: {
    paddingVertical: 4,
  },
  dateFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  dateFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  notesScroll: {
    flex: 1,
  },
  notesScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 80,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardContainer: {
    width: cardWidth,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 120,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  takeNoteInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
  },
  autoSavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // Editor Styles
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  editorBackBtn: {
    padding: 4,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  editorTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 4,
  },
  editorDateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  quickDateChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  miniDateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  editorInputScroll: {
    flex: 1,
  },
  editorInputContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  editorTitleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    padding: 0,
  },
  editorContentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 240,
    padding: 0,
  },
  editorBottomToolbar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Calendar Picker Modal Styles
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    padding: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarFooterShortcuts: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  shortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
