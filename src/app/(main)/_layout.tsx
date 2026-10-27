import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Modal } from 'react-native';
import { Tabs } from 'expo-router';
import { ShoppingBag, Cake, Boxes, BarChart3, Settings, Receipt } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import {
  isSubscriptionActive,
  checkAndTriggerDailyExpiryWarning,
  getSubscriptionStatus,
} from '@/services/subscriptionService';
import { recordSecurityHeartbeat, SecurityStatusResult } from '@/services/securityService';
import { SubscriptionPaywall } from '@/components/subscription/SubscriptionPaywall';
import { SubscriptionExpiryBanner } from '@/components/subscription/SubscriptionExpiryBanner';
import { BakeryProfileModal } from '@/components/profile/BakeryProfileModal';
import { BakeryNotesModal } from '@/components/notes/BakeryNotesModal';

export default function MainLayout() {
  const { colors, typography, borderRadius } = useTheme();
  const currentBakery = useAuthStore((s) => s.currentBakery);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [, setTick] = useState(0);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusResult | null>(null);

  const isSubscriptionModalOpen = useUIStore((s) => s.isSubscriptionModalOpen);
  const closeSubscriptionModal = useUIStore((s) => s.closeSubscriptionModal);
  const openSubscriptionModal = useUIStore((s) => s.openSubscriptionModal);
  const isProfileModalOpen = useUIStore((s) => s.isProfileModalOpen);
  const closeProfileModal = useUIStore((s) => s.closeProfileModal);
  const isNotesModalOpen = useUIStore((s) => s.isNotesModalOpen);
  const closeNotesModal = useUIStore((s) => s.closeNotesModal);

  // Periodic heartbeat: checks subscription status and anti-rollback ledger every 15 seconds
  // Automatically locks the app the moment 48 hours lapse, offline trial expires, or clock is rolled back
  useEffect(() => {
    let isMounted = true;
    const runHeartbeat = async () => {
      if (currentBakery) {
        try {
          const res = await recordSecurityHeartbeat(currentBakery);
          if (isMounted) {
            setSecurityStatus(res);
            setTick((prev) => prev + 1);
          }
        } catch (err) {
          console.warn('Security heartbeat tick error:', err);
        }
      }
    };

    runHeartbeat();
    const timer = setInterval(runHeartbeat, 15000); // every 15 seconds

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [currentBakery]);

  // Daily warning alert trigger: checks if subscription is within 7 days of expiry
  // Displays once per day on app open for paid plans (8-month and 1-year)
  useEffect(() => {
    if (currentBakery) {
      checkAndTriggerDailyExpiryWarning(currentBakery, () => {
        setShowRenewalModal(true);
      });
    }
  }, [currentBakery]);

  // Mandatory blocking paywall: locks all POS screens if trial or plan has expired, inactive, or tampered
  const isSecurityLocked =
    securityStatus &&
    (!securityStatus.isValid || securityStatus.isTampered || securityStatus.isExpired);

  if (currentBakery && (!isSubscriptionActive(currentBakery) || isSecurityLocked)) {
    const status = getSubscriptionStatus(currentBakery);
    return (
      <SubscriptionPaywall
        isExpired={status.isExpired || securityStatus?.isExpired}
        title={securityStatus?.isTampered ? 'Security Alert: Clock Tampering' : undefined}
        subtitle={securityStatus?.reason}
      />
    );
  }

  return (
    <View style={styles.screenWrapper}>
      {/* Sticky top banner when within 7 days of expiry */}
      <SubscriptionExpiryBanner onRenew={() => setShowRenewalModal(true)} />

      <Tabs
        screenListeners={{
          tabPress: () => {
            haptic.selection();
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 72,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 10,
            elevation: 10,
            shadowColor: '#1A1D2E',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
          },
          tabBarLabelStyle: {
            ...typography.captionBold,
            fontSize: 11,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="new-order"
          options={{
            title: 'POS Billing',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <ShoppingBag size={22} color={focused ? colors.primary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Receipt size={22} color={focused ? colors.primary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Cake size={22} color={focused ? colors.primary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Boxes size={22} color={focused ? colors.primary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <BarChart3 size={22} color={focused ? colors.primary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconWrap,
                  focused && {
                    backgroundColor: colors.primaryLight,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Settings size={22} color={focused ? colors.primary : color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Global Bakery & Account Profile Modal */}
      <BakeryProfileModal
        visible={isProfileModalOpen}
        onClose={closeProfileModal}
        onOpenSubscription={() => {
          closeProfileModal();
          openSubscriptionModal();
        }}
      />

      {/* Global Bakery Notes Modal (Google Notes / Keep style) */}
      <BakeryNotesModal
        visible={isNotesModalOpen}
        onClose={closeNotesModal}
      />

      {/* Global Upgrade / Renewal Subscription Modal */}
      <Modal
        visible={showRenewalModal || isSubscriptionModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowRenewalModal(false);
          closeSubscriptionModal();
        }}
      >
        <SubscriptionPaywall
          isDismissible={true}
          onDismiss={() => {
            setShowRenewalModal(false);
            closeSubscriptionModal();
          }}
          title="Upgrade or Renew Plan"
          subtitle="Choose the 8-Month or 1-Year plan to maintain uninterrupted POS billing & cloud backup."
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
