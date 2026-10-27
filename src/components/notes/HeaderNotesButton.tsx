import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { StickyNote } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotesStore, getTodayDateString } from '@/stores/notesStore';
import { useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';

interface HeaderNotesButtonProps {
  onPress?: () => void;
}

export function HeaderNotesButton({ onPress }: HeaderNotesButtonProps) {
  const { colors, typography } = useTheme();
  const currentBakery = useAuthStore((s) => s.currentBakery);
  const openNotesModal = useUIStore((s) => s.openNotesModal);
  const { notes, loadNotes, activeBakeryId } = useNotesStore();

  const todayStr = getTodayDateString();

  useEffect(() => {
    if (currentBakery?.id && activeBakeryId !== currentBakery.id) {
      loadNotes(currentBakery.id);
    }
  }, [currentBakery?.id, activeBakeryId, loadNotes]);

  // Count active notes for today or pinned
  const todayCount = notes.filter((n) => n.date === todayStr || n.isPinned).length;

  const handlePress = () => {
    haptic.selection();
    if (onPress) {
      onPress();
    } else {
      openNotesModal();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel="Bakery Notes"
      accessibilityRole="button"
    >
      <View style={styles.innerContent}>
        <StickyNote size={17} color={colors.primary} strokeWidth={2.2} />
      </View>

      {/* Today's note count badge */}
      {todayCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.primary,
              borderColor: colors.surface,
            },
          ]}
        >
          <Text style={[typography.captionBold, styles.badgeText]}>
            {todayCount > 9 ? '9+' : todayCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: 'bold',
  },
});
