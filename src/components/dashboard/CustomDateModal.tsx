import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  addDays,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { haptic } from '@/utils/haptics';

interface CustomDateModalProps {
  visible: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  onClose: () => void;
  onApply: (startIso: string, endIso: string, displayLabel: string) => void;
}

export function CustomDateModal({
  visible,
  initialStartDate,
  initialEndDate,
  onClose,
  onApply,
}: CustomDateModalProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [startDate, setStartDate] = useState<Date>(
    initialStartDate ? new Date(initialStartDate) : subDays(new Date(), 7)
  );
  const [endDate, setEndDate] = useState<Date>(
    initialEndDate ? new Date(initialEndDate) : new Date()
  );

  const handleQuickPreset = (preset: '3d' | '7d' | '14d' | '30d' | 'this_month' | 'last_month') => {
    haptic.selection();
    const now = new Date();
    switch (preset) {
      case '3d':
        setStartDate(subDays(now, 3));
        setEndDate(now);
        break;
      case '7d':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case '14d':
        setStartDate(subDays(now, 14));
        setEndDate(now);
        break;
      case '30d':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case 'this_month':
        setStartDate(startOfMonth(now));
        setEndDate(now);
        break;
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      }
    }
  };

  const adjustStartDate = (days: number) => {
    haptic.light();
    const next = addDays(startDate, days);
    if (next <= endDate) {
      setStartDate(next);
    }
  };

  const adjustEndDate = (days: number) => {
    haptic.light();
    const next = addDays(endDate, days);
    const now = new Date();
    if (next >= startDate && next <= addDays(now, 1)) {
      setEndDate(next);
    }
  };

  const handleApply = () => {
    haptic.success();
    const sIso = startOfDay(startDate).toISOString();
    const eIso = endOfDay(endDate).toISOString();
    const label = `${format(startDate, 'dd MMM')} – ${format(endDate, 'dd MMM yyyy')}`;
    onApply(sIso, eIso, label);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.xl,
              padding: spacing.lg,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md },
                ]}
              >
                <CalendarIcon size={20} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[typography.h3, { color: colors.text }]}>Custom Date Range</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Select specific dates to audit sales & revenue
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <Text style={[typography.captionBold, { color: colors.textMuted, marginTop: spacing.md, marginBottom: 8 }]}>
              QUICK RANGE SHORTCUTS
            </Text>

            <View style={styles.quickGrid}>
              {[
                { key: '3d', label: 'Past 3 Days' },
                { key: '7d', label: 'Past 7 Days' },
                { key: '14d', label: 'Past 14 Days' },
                { key: '30d', label: 'Past 30 Days' },
                { key: 'this_month', label: 'This Month' },
                { key: 'last_month', label: 'Last Month' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => handleQuickPreset(p.key as any)}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Text style={[typography.captionBold, { color: colors.text, fontSize: 11 }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Steppers */}
            <Text style={[typography.captionBold, { color: colors.textMuted, marginTop: spacing.lg, marginBottom: 8 }]}>
              FINE-TUNE DATES
            </Text>

            {/* Start Date Stepper */}
            <Card style={[styles.dateCard, { borderColor: colors.borderSubtle }]}>
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
                START DATE
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => adjustStartDate(-1)}
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.sm }]}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.dateDisplay}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>
                    {format(startDate, 'EEE, dd MMM yyyy')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => adjustStartDate(1)}
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.sm }]}
                >
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </Card>

            {/* End Date Stepper */}
            <Card style={[styles.dateCard, { borderColor: colors.borderSubtle, marginTop: spacing.sm }]}>
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
                END DATE
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => adjustEndDate(-1)}
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.sm }]}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.dateDisplay}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>
                    {format(endDate, 'EEE, dd MMM yyyy')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => adjustEndDate(1)}
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.sm }]}
                >
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Selected Range Summary Box */}
            <View
              style={[
                styles.summaryBox,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: borderRadius.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Check size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[typography.captionBold, { color: colors.primary, flex: 1 }]}>
                Selected: {format(startDate, 'dd MMM yyyy')} to {format(endDate, 'dd MMM yyyy')}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { marginTop: spacing.lg }]}>
            <Button
              title="Cancel"
              variant="outline"
              size="lg"
              onPress={onClose}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              title="Apply Range"
              size="lg"
              onPress={handleApply}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  dateCard: {
    padding: 12,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
