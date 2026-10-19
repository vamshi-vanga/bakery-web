import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { User, Crown } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';
import { getSubscriptionStatus } from '@/services/subscriptionService';
import { haptic } from '@/utils/haptics';

interface HeaderProfileButtonProps {
  onPress?: () => void;
}

export function HeaderProfileButton({ onPress }: HeaderProfileButtonProps) {
  const { colors } = useTheme();
  const currentBakery = useAuthStore((s) => s.currentBakery);
  const openProfileModal = useUIStore((s) => s.openProfileModal);
  const status = getSubscriptionStatus(currentBakery);

  const isTrial = currentBakery?.subscription_plan === 'trial';
  const isPaid =
    currentBakery?.subscription_plan === 'eight_months' ||
    currentBakery?.subscription_plan === 'one_year';

  const handlePress = () => {
    haptic.selection();
    if (onPress) {
      onPress();
    } else {
      openProfileModal();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isTrial ? '#F97316' : isPaid ? '#06B6D4' : colors.borderSubtle,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.innerContent}>
        {isPaid ? (
          <Crown size={17} color="#06B6D4" strokeWidth={2.4} />
        ) : isTrial ? (
          <User size={17} color="#F97316" strokeWidth={2.4} />
        ) : (
          <User size={17} color={colors.primary} strokeWidth={2.2} />
        )}
      </View>

      {/* Status Dot */}
      {status.isActive && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isTrial ? '#F97316' : '#10B981',
              borderColor: colors.surface,
            },
          ]}
        />
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
  statusDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
});
