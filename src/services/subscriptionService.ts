import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Bakery, SubscriptionPlan, SubscriptionStatus } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  titleKey: string;
  durationLabel: string;
  originalPrice?: number;
  originalPriceLabel?: string;
  price: number;
  priceLabel: string;
  discountPercent?: number;
  savingsLabel?: string;
  billingPeriod: string;
  equivalentMonthly?: string;
  badge?: string;
  popular?: boolean;
  bestValue?: boolean;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  requiresApproval: boolean;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: 'trial',
    name: '2-Day Free Trial',
    titleKey: '2-DAY TRIAL',
    durationLabel: '2 Days (48 Hours Access)',
    price: 0,
    priceLabel: '₹0',
    billingPeriod: 'for 48 Hours',
    equivalentMonthly: 'Instant Evaluation Access',
    badge: 'Free Trial',
    accentColor: '#F97316', // Vibrant Orange
    accentBg: '#1A181C',
    accentBorder: '#EA580C',
    requiresApproval: false,
    description: 'Instant 48-hour access with full counter POS billing. Zero credit card or payment required.',
    features: [
      'Instant activation — start billing right away',
      'Continuous 48-hour counter POS billing',
      'Fast order creation & customer bill printing',
      'Unlimited products, categories & modifiers',
      'WhatsApp digital customer receipt delivery',
      'SQLite offline-first local database storage',
    ],
  },
  {
    id: 'eight_months',
    name: '8-Month Plan',
    titleKey: '8-MONTH PLAN',
    durationLabel: '8 Months Duration',
    originalPrice: 1256,
    originalPriceLabel: '₹1,256',
    price: 829,
    priceLabel: '₹829',
    discountPercent: 34,
    savingsLabel: 'Save ₹427 (34% Discount)',
    billingPeriod: 'for 8 Months',
    equivalentMonthly: '₹103 / month',
    popular: true,
    badge: 'Most Popular',
    accentColor: '#F43F5E', // Rose / Ruby
    accentBg: '#1D1620',
    accentBorder: '#E11D48',
    requiresApproval: true,
    description: 'Full 8 months uninterrupted access. Submit a request to activate for your bakery.',
    features: [
      'Full 8 months continuous uninterrupted access',
      'Massive price drop: ₹1,256 slashed to ₹829',
      'Save ₹427 on your bakery operations',
      'Unlimited counter POS orders & billing register',
      'Multi-device cashier & staff terminal sync',
      'Continuous real-time Supabase cloud backup',
      'Daily sales analytics, profit & tax reports',
      'Automated WhatsApp customer digital receipts',
      'Priority support & instant OTA app updates',
    ],
  },
  {
    id: 'one_year',
    name: '1-Year Plan',
    titleKey: '1-YEAR PLAN',
    durationLabel: '12 Months (Full Year)',
    originalPrice: 1850,
    originalPriceLabel: '₹1,850',
    price: 920,
    priceLabel: '₹920',
    discountPercent: 50,
    savingsLabel: 'Save ₹930 (50% OFF - Half Price)',
    billingPeriod: 'for 12 Months',
    equivalentMonthly: 'Lowest Rate: ₹76 / month',
    bestValue: true,
    badge: 'Best Value (12 Months)',
    accentColor: '#06B6D4', // Aqua / Cyan
    accentBg: '#131C24',
    accentBorder: '#0891B2',
    requiresApproval: true,
    description: 'Full 365 days access at the lowest monthly rate (₹76/mo). Submit a request to activate.',
    features: [
      'Full 12 months (365 days) continuous access',
      'Massive 50% discount: ₹1,850 slashed to ₹920',
      'Lowest rate across all plans: Only ₹76 / month',
      'Unlimited counter POS orders & billing register',
      'Multi-device cashier & staff terminal sync',
      'Continuous real-time Supabase cloud backup',
      'Daily sales analytics, profit & tax reports',
      'Automated WhatsApp customer digital receipts',
      'Priority support & instant OTA app updates',
    ],
  },
];

export interface PlanFeatureComparison {
  id: string;
  title: string;
  trial: boolean;
  eight_months: boolean;
  one_year: boolean;
}

export const COMPARISON_FEATURES: PlanFeatureComparison[] = [
  {
    id: 'billing',
    title: 'POS Fast Billing & Invoices',
    trial: true,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'offline',
    title: 'SQLite Offline Local Database',
    trial: true,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'products',
    title: 'Unlimited Products & Categories',
    trial: true,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Customer Digital Receipts',
    trial: true,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'cloud_backup',
    title: 'Real-time Cloud Backup & Sync',
    trial: false,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'multi_device',
    title: 'Multi-Device Staff & Cashier Terminals',
    trial: false,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'inventory_logs',
    title: 'Inventory Movement & Restock Logs',
    trial: false,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'analytics',
    title: 'Daily Sales, Revenue & Profit Reports',
    trial: false,
    eight_months: true,
    one_year: true,
  },
  {
    id: 'priority_support',
    title: 'Priority Support & OTA Updates',
    trial: false,
    eight_months: true,
    one_year: true,
  },
];

/**
 * Check if the bakery currently has an active, non-expired subscription.
 */
export function isSubscriptionActive(bakery: Bakery | null): boolean {
  if (!bakery) return false;
  if (!bakery.subscription_plan) return false;
  if (bakery.subscription_status !== 'active') return false;
  if (!bakery.subscription_end) return false;

  const expiry = new Date(bakery.subscription_end).getTime();
  return expiry > Date.now();
}

/**
 * Calculate human-readable remaining time, pending approval status, and expiry status.
 */
export function getSubscriptionStatus(bakery: Bakery | null): {
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isPendingApproval: boolean;
  status: SubscriptionStatus;
  planName: string;
  planId: SubscriptionPlan | null;
  daysRemaining: number;
  hoursRemaining: number;
  formattedExpiry: string;
} {
  if (!bakery || !bakery.subscription_plan) {
    return {
      isActive: false,
      isExpired: false,
      isExpiringSoon: false,
      isPendingApproval: false,
      status: 'none',
      planName: 'None',
      planId: null,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedExpiry: 'Not subscribed',
    };
  }

  const isPendingApproval = bakery.subscription_status === 'pending_approval';
  const planObj = SUBSCRIPTION_PLANS.find((p) => p.id === bakery.subscription_plan);
  const planName = planObj?.name ?? bakery.subscription_plan;
  const planId = bakery.subscription_plan;

  if (isPendingApproval) {
    return {
      isActive: false,
      isExpired: false,
      isExpiringSoon: false,
      isPendingApproval: true,
      status: 'pending_approval',
      planName,
      planId,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedExpiry: 'Awaiting admin approval in Supabase',
    };
  }

  if (!bakery.subscription_end) {
    return {
      isActive: false,
      isExpired: false,
      isExpiringSoon: false,
      isPendingApproval: false,
      status: bakery.subscription_status ?? 'none',
      planName,
      planId,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedExpiry: 'Inactive',
    };
  }

  const expiryTime = new Date(bakery.subscription_end).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;
  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;
  const isActive = !isExpired && bakery.subscription_status === 'active';

  // 1 week (7 days) warning for active paid plans (8-month and 1-year)
  const isExpiringSoon = isActive && planId !== 'trial' && daysRemaining <= 7 && daysRemaining >= 0;

  const formattedExpiry = new Date(bakery.subscription_end).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    isActive,
    isExpired,
    isExpiringSoon,
    isPendingApproval: false,
    status: isExpired ? 'expired' : (bakery.subscription_status ?? 'none'),
    planName,
    planId,
    daysRemaining,
    hoursRemaining,
    formattedExpiry,
  };
}

/**
 * Daily warning checker for paid plans (8-month and 1-year).
 * Alerts once per day during the final 7 days before expiry.
 */
export async function checkAndTriggerDailyExpiryWarning(
  bakery: Bakery | null,
  onRenewPress?: () => void
): Promise<boolean> {
  if (!bakery) return false;
  const status = getSubscriptionStatus(bakery);

  // Only trigger for active paid plans (8-month and 1-year) expiring within 7 days
  if (!status.isActive || !status.isExpiringSoon || bakery.subscription_plan === 'trial') {
    return false;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `@bakeflow_last_expiry_warning_${bakery.id}`;
    const lastWarningDate = await AsyncStorage.getItem(storageKey);

    if (lastWarningDate === todayStr) {
      // Already alerted today
      return false;
    }

    // Record today's date so it only shows once per day
    await AsyncStorage.setItem(storageKey, todayStr);

    const daysText =
      status.daysRemaining === 0
        ? 'less than 24 hours'
        : status.daysRemaining === 1
        ? '1 day'
        : `${status.daysRemaining} days`;

    Alert.alert(
      'Subscription Expiring Soon',
      `Your BakeFlow ${status.planName} will expire in ${daysText} (on ${status.formattedExpiry}).\n\nYour bakery data remains 100% safe & protected. Please renew your subscription to prevent any interruption to your POS billing.`,
      [
        {
          text: 'Remind Me Tomorrow',
          style: 'cancel',
        },
        {
          text: 'Renew Plan Now',
          style: 'default',
          onPress: () => {
            if (onRenewPress) onRenewPress();
          },
        },
      ]
    );

    return true;
  } catch (err) {
    console.warn('Failed to check daily expiry warning:', err);
    return false;
  }
}

/**
 * Handle plan selection:
 * - Free 2-Day Trial: Activates immediately for exactly 48 hours.
 * - Paid Plans (8-month, 1-year): Sets status to 'pending_approval' requiring admin approval in Supabase.
 */
export async function activateBakeryPlan(
  bakeryId: string,
  plan: SubscriptionPlan
): Promise<{ success: boolean; status: SubscriptionStatus; error?: string }> {
  try {
    const isPaid = plan === 'eight_months' || plan === 'one_year';
    const targetStatus: SubscriptionStatus = isPaid ? 'pending_approval' : 'active';

    const now = new Date();
    let endDate: Date | null = null;

    if (plan === 'trial') {
      endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // exactly 48 hours
    }

    const startIso = isPaid ? null : now.toISOString();
    const endIso = endDate ? endDate.toISOString() : null;

    const authStore = useAuthStore.getState();
    const currentBakery = authStore.currentBakery;

    // Hard Guard: Do not allow changing plan while active paid plan (8-month or 1-year) is running!
    if (
      currentBakery &&
      currentBakery.subscription_status === 'active' &&
      (currentBakery.subscription_plan === 'eight_months' || currentBakery.subscription_plan === 'one_year') &&
      currentBakery.subscription_end &&
      new Date(currentBakery.subscription_end).getTime() > Date.now()
    ) {
      return {
        success: false,
        status: 'active',
        error: `Active plan protected: You already have an active ${
          currentBakery.subscription_plan === 'one_year' ? '1-Year' : '8-Month'
        } plan until ${new Date(currentBakery.subscription_end).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}. You cannot switch plans until this period completes.`,
      };
    }

    // 1. Attempt atomic RPC call
    const { error: rpcError } = await supabase.rpc('activate_bakery_plan', {
      p_bakery_id: bakeryId,
      p_plan: plan,
    });

    if (rpcError) {
      // If RPC blocked because plan is active, return immediately without fallback
      if (rpcError.message.includes('already has an active') || rpcError.message.includes('Active subscription protected')) {
        return { success: false, status: 'active', error: rpcError.message };
      }

      // 2. Fallback to direct table UPDATE (only for non-protected scenarios)
      const { error: updateError } = await supabase
        .from('bakeries')
        .update({
          subscription_plan: plan,
          subscription_status: targetStatus,
          subscription_start: startIso,
          subscription_end: endIso,
          updated_at: now.toISOString(),
        })
        .eq('id', bakeryId);

      if (updateError) {
        return { success: false, status: 'none', error: updateError.message };
      }

      // Record in subscription_requests table if paid
      if (isPaid) {
        const currentUser = authStore.user;
        const amount = plan === 'eight_months' ? 829.0 : 920.0;
        try {
          await (supabase.from('subscription_requests') as any).insert({
            bakery_id: bakeryId,
            bakery_name: currentBakery?.name || 'Bakery',
            owner_id: currentUser?.id,
            owner_email: currentUser?.email,
            owner_phone: currentBakery?.phone,
            plan,
            amount,
            status: 'pending',
          });
        } catch {
          // Non-blocking fallback
        }
      }
    }

    // 3. Immediately refresh current bakery in local Zustand store
    if (authStore.currentBakery) {
      const updatedBakery: Bakery = {
        ...authStore.currentBakery,
        subscription_plan: plan,
        subscription_status: targetStatus,
        subscription_start: startIso,
        subscription_end: endIso,
        updated_at: now.toISOString(),
      };
      if (authStore.currentMembership) {
        authStore.setBakery(updatedBakery, authStore.currentMembership);
      }
    }

    // 4. Background re-fetch to ensure remote consistency
    authStore.fetchBakeryProfile().catch(() => {});

    return { success: true, status: targetStatus };
  } catch (err: any) {
    return { success: false, status: 'none', error: err.message ?? 'Failed to activate plan' };
  }
}

/**
 * Cancel a pending plan request so the user can choose a different plan or the 2-day free trial.
 */
export async function resetSubscriptionPlan(
  bakeryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('bakeries')
      .update({
        subscription_plan: null,
        subscription_status: 'none',
        subscription_start: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bakeryId);

    if (error) {
      return { success: false, error: error.message };
    }

    const authStore = useAuthStore.getState();
    if (authStore.currentBakery) {
      const updatedBakery: Bakery = {
        ...authStore.currentBakery,
        subscription_plan: null,
        subscription_status: 'none',
        subscription_start: null,
        subscription_end: null,
      };
      if (authStore.currentMembership) {
        authStore.setBakery(updatedBakery, authStore.currentMembership);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to real-time changes on the current bakery.
 * As soon as the admin approves the bakery in Supabase, the app unlocks instantly!
 */
export function subscribeToBakeryRealtime(
  bakeryId: string,
  onApproved: (updatedBakery: Bakery) => void
) {
  const channel = supabase
    .channel(`bakery-sub-${bakeryId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bakeries',
        filter: `id=eq.${bakeryId}`,
      },
      (payload) => {
        const newBakery = payload.new as Bakery;
        const authStore = useAuthStore.getState();
        if (authStore.currentBakery && authStore.currentMembership) {
          authStore.setBakery(newBakery, authStore.currentMembership);
        }

        if (newBakery.subscription_status === 'active') {
          onApproved(newBakery);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
