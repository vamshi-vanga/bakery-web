import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { ShoppingBag, Cake, Boxes, BarChart3, Settings, Receipt } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { useAuthStore } from '@/stores/authStore';
import { isSubscriptionActive } from '@/services/subscriptionService';
import { SubscriptionPaywall } from '@/components/subscription/SubscriptionPaywall';

export default function MainLayout() {
  const { colors, typography, borderRadius } = useTheme();
  const currentBakery = useAuthStore((s) => s.currentBakery);

  // Full-screen paywall: locks all POS screens until a plan or trial is picked
  if (currentBakery && !isSubscriptionActive(currentBakery)) {
    return <SubscriptionPaywall />;
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
