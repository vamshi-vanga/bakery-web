import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { DateRangePreset } from '@/services/reporting';

interface Props {
  selectedPreset: DateRangePreset;
  customLabel?: string;
  onSelectPreset: (preset: DateRangePreset) => void;
  onOpenCustom?: () => void;
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom' },
];

export function DateRangeSelector({
  selectedPreset,
  customLabel,
  onSelectPreset,
  onOpenCustom,
}: Props) {
  const { colors, typography, borderRadius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {PRESETS.map((p) => {
        const isSelected = selectedPreset === p.key;
        const displayLabel = p.key === 'custom' && customLabel ? customLabel : p.label;

        return (
          <TouchableOpacity
            key={p.key}
            onPress={() => {
              onSelectPreset(p.key);
              if (p.key === 'custom' && onOpenCustom) {
                onOpenCustom();
              }
            }}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            {p.key === 'custom' && (
              <Calendar
                size={14}
                color={isSelected ? '#FFFFFF' : colors.textMuted}
                style={{ marginRight: 5 }}
              />
            )}
            <Text
              style={[
                typography.captionBold,
                { color: isSelected ? '#FFFFFF' : colors.text },
              ]}
            >
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
});
