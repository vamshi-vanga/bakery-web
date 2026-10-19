import { supabase } from '@/lib/supabase';
import { Bakery, SubscriptionPlan, SubscriptionStatus } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  durationLabel: string;
  price: number;
  priceLabel: string;
  equivalentMonthly?: string;
  badge?: string;
  popular?: boolean;
  bestValue?: boolean;
  requiresApproval: boolean;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: 'trial',
    name: 'Free 2-Day Trial',
    durationLabel: '2 Days Free (48 Hours)',
    price: 0,
    priceLabel: '₹0',
    equivalentMonthly: 'Instant access • No approval needed',
    badge: 'Instant Activation',
    requiresApproval: false,
    description: 'Instant 48-hour free access to test full POS billing and bakery management.',
    features: [
      'Instant access — start billing in seconds',
      'Full 48 hours without interruption',
      'POS billing & instant receipt generation',
      'Inventory, menu items & categories',
      'Automated WhatsApp receipts to customers',
      'Full offline mode with SQLite database',
    ],
  },
  {
    id: 'eight_months',
    name: '8-Month Plan',
    durationLabel: '8 Months',
    price: 829,
    priceLabel: '₹829',
    equivalentMonthly: '₹103 / month',
    popular: true,
    badge: 'Requires Admin Approval',
    requiresApproval: true,
    description: 'Requires admin verification in Supabase. Once approved, you get 8 full months of access.',
    features: [
      'Submitted directly to admin for verification',
      'Unlimited POS orders, billing & void tracking',
      'Real-time cloud sync across staff devices',
      'Daily sales analytics & revenue metrics',
      'WhatsApp receipt delivery & customer logs',
      'Automatic Over-The-Air app updates',
    ],
  },
  {
    id: 'one_year',
    name: '1-Year Plan',
    durationLabel: '12 Months (Full Year)',
    price: 920,
    priceLabel: '₹920',
    equivalentMonthly: 'Just ₹76 / month',
    bestValue: true,
    badge: 'Best Value • Admin Approval',
    requiresApproval: true,
    description: 'Lowest pricing for a full year. Admin accepts your account in Supabase to activate.',
    features: [
      'Submitted directly to admin for verification',
      'Lowest rate (₹76/month vs ₹103/month)',
      'Full 365 days coverage with zero interruption',
      'Priority cloud support & instant OTA patches',
      'Continuous feature additions & updates',
    ],
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
  isPendingApproval: boolean;
  status: SubscriptionStatus;
  planName: string;
  daysRemaining: number;
  formattedExpiry: string;
} {
  if (!bakery || !bakery.subscription_plan) {
    return {
      isActive: false,
      isExpired: false,
      isPendingApproval: false,
      status: 'none',
      planName: 'None',
      daysRemaining: 0,
      formattedExpiry: 'Not subscribed',
    };
  }

  const isPendingApproval = bakery.subscription_status === 'pending_approval';
  const planObj = SUBSCRIPTION_PLANS.find((p) => p.id === bakery.subscription_plan);
  const planName = planObj?.name ?? bakery.subscription_plan;

  if (isPendingApproval) {
    return {
      isActive: false,
      isExpired: false,
      isPendingApproval: true,
      status: 'pending_approval',
      planName,
      daysRemaining: 0,
      formattedExpiry: 'Awaiting admin approval in Supabase',
    };
  }

  if (!bakery.subscription_end) {
    return {
      isActive: false,
      isExpired: false,
      isPendingApproval: false,
      status: bakery.subscription_status ?? 'none',
      planName,
      daysRemaining: 0,
      formattedExpiry: 'Inactive',
    };
  }

  const expiryTime = new Date(bakery.subscription_end).getTime();
  const now = Date.now();
  const diffMs = expiryTime - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;

  const formattedExpiry = new Date(bakery.subscription_end).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    isActive: !isExpired && bakery.subscription_status === 'active',
    isExpired,
    isPendingApproval: false,
    status: isExpired ? 'expired' : (bakery.subscription_status ?? 'none'),
    planName,
    daysRemaining,
    formattedExpiry,
  };
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

    // 1. Attempt atomic RPC call
    const { error: rpcError } = await supabase.rpc('activate_bakery_plan', {
      p_bakery_id: bakeryId,
      p_plan: plan,
    });

    if (rpcError) {
      // 2. Fallback to direct table UPDATE
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
    }

    // 3. Immediately refresh current bakery in local Zustand store
    const authStore = useAuthStore.getState();
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
