import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, ChevronRight, X } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { getSubscriptionStatus } from '@/services/subscriptionService';
import { haptic } from '@/utils/haptics';

interface SubscriptionExpiryBannerProps {
  onRenew: () => void;
  onDismissSession?: () => void;
}

export function SubscriptionExpiryBanner({
  onRenew,
  onDismissSession,
}: SubscriptionExpiryBannerProps) {
  const currentBakery = useAuthStore((s) => s.currentBakery);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !currentBakery) return null;

  const status = getSubscriptionStatus(currentBakery);

  // Only display for active paid plans (8-month and 1-year) within 7 days of expiry
  if (!status.isActive || !status.isExpiringSoon || status.planId === 'trial') {
    return null;
  }

  const daysText =
    status.daysRemaining === 0
      ? 'Expires Today'
      : status.daysRemaining === 1
      ? 'Expires Tomorrow'
      : `${status.daysRemaining} Days Left`;

  const handleRenewPress = () => {
    haptic.selection();
    onRenew();
  };

  const handleDismissPress = () => {
    haptic.light();
    setDismissed(true);
    if (onDismissSession) onDismissSession();
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <AlertTriangle size={18} color="#F59E0B" strokeWidth={2.4} />
        </View>

        <TouchableOpacity
          style={styles.textColumn}
          activeOpacity={0.8}
          onPress={handleRenewPress}
        >
          <View style={styles.titleRow}>
            <Text style={styles.badgeText}>{daysText.toUpperCase()}</Text>
            <Text style={styles.titleText}>Subscription Expiring Soon</Text>
          </View>
          <Text style={styles.subtitleText} numberOfLines={1}>
            Your {status.planName} expires on {status.formattedExpiry}. Tap to renew.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.renewButton}
          activeOpacity={0.8}
          onPress={handleRenewPress}
        >
          <Text style={styles.renewButtonText}>Renew</Text>
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={handleDismissPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={15} color="#A3A3A3" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1508',
    borderBottomWidth: 1.5,
    borderBottomColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FDFDFD',
  },
  subtitleText: {
    fontSize: 11.5,
    color: '#D4D4D8',
    marginTop: 1,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  renewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
});
