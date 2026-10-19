import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  Check,
  X,
  Sparkles,
  ShieldCheck,
  LogOut,
  Clock,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { haptic } from '@/utils/haptics';
import {
  SUBSCRIPTION_PLANS,
  PlanConfig,
  activateBakeryPlan,
  resetSubscriptionPlan,
  subscribeToBakeryRealtime,
  getSubscriptionStatus,
} from '@/services/subscriptionService';
import { Bakery, SubscriptionPlan } from '@/types/database';

interface SubscriptionPaywallProps {
  /**
   * If true, allows dismissing via a close button (used when opened from Settings).
   * If false, behaves as a mandatory blocking paywall.
   */
  isDismissible?: boolean;
  onDismiss?: () => void;
  title?: string;
  subtitle?: string;
  isExpired?: boolean;
}

export function SubscriptionPaywall({
  isDismissible = false,
  onDismiss,
  title,
  subtitle,
  isExpired: initialIsExpired,
}: SubscriptionPaywallProps) {
  const { width } = useWindowDimensions();
  const { currentBakery, signOut, fetchBakeryProfile } = useAuthStore();

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan>('eight_months');
  const [activating, setActivating] = useState(false);
  const [activePlanId, setActivePlanId] = useState<SubscriptionPlan | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resettingPlan, setResettingPlan] = useState(false);

  const scrollViewRef = useRef<any>(null);

  const subStatus = getSubscriptionStatus(currentBakery);
  const isPendingApproval = subStatus.isPendingApproval;
  const isExpired = initialIsExpired || subStatus.isExpired;

  // Has this bakery already used up the free trial?
  const hasCompletedTrial =
    currentBakery?.subscription_plan === 'trial' && subStatus.isExpired;

  // Active paid plan (8-month or 1-year) - STRICTLY PROTECTED FROM BEING OVERWRITTEN
  const hasActivePaidPlan =
    subStatus.isActive &&
    !isExpired &&
    (currentBakery?.subscription_plan === 'eight_months' ||
      currentBakery?.subscription_plan === 'one_year');

  // Active 2-day free trial - ALLOWED TO UPGRADE TO 8-MONTH OR 1-YEAR
  const isTrialActive =
    subStatus.isActive &&
    !isExpired &&
    currentBakery?.subscription_plan === 'trial';

  // Handler: When approved by admin in Supabase, automatically minimize/close and go directly to POS!
  const handleApproved = useCallback(
    (approvedBakery: Bakery) => {
      haptic.success();

      // 1. Automatically close and minimize the window immediately
      if (onDismiss) onDismiss();
      useUIStore.getState().closeSubscriptionModal();

      // 2. Direct navigation to POS billing
      try {
        router.replace('/(main)/new-order');
      } catch {}

      // 3. Confirm activation with celebration alert
      Alert.alert(
        'Subscription Approved',
        `Your ${
          approvedBakery.subscription_plan === 'one_year' ? '1-Year' : '8-Month'
        } subscription has been approved by the admin. Welcome to BakeFlow POS.`,
        [{ text: 'Start Billing' }]
      );
    },
    [onDismiss]
  );

  // 1. Real-time Supabase postgres_changes listener
  useEffect(() => {
    if (!currentBakery?.id) return;

    const unsubscribe = subscribeToBakeryRealtime(currentBakery.id, (approvedBakery) => {
      handleApproved(approvedBakery);
    });

    return () => {
      unsubscribe();
    };
  }, [currentBakery?.id, handleApproved]);

  // 2. High-frequency 2-second heartbeat poll: guarantees instant auto-minimizing the moment status becomes active!
  useEffect(() => {
    if (!currentBakery?.id) return;
    if (subStatus.isActive) return;

    const intervalId = setInterval(async () => {
      try {
        const updated = await fetchBakeryProfile();
        if (updated && updated.subscription_status === 'active') {
          clearInterval(intervalId);
          handleApproved(updated);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(intervalId);
  }, [currentBakery?.id, subStatus.isActive, fetchBakeryProfile, handleApproved]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (!currentBakery) {
      Alert.alert('Store Profile Missing', 'Please complete your bakery profile first.');
      return;
    }

    // Guard: Active paid plan (8-month or 1-year) CANNOT be switched or overridden
    if (hasActivePaidPlan) {
      haptic.warning();
      Alert.alert(
        'Subscription Active',
        `Your bakery currently has an active ${subStatus.planName} valid until ${subStatus.formattedExpiry}. You cannot switch or select another plan until your current subscription period completes.`
      );
      return;
    }

    // Guard: Cannot re-select trial if already running
    if (plan.id === 'trial' && isTrialActive) {
      haptic.warning();
      Alert.alert(
        'Trial Already Active',
        `Your 2-day free trial is currently active with ${subStatus.hoursRemaining} hours remaining. To upgrade to long-term access, select the 8-Month or 1-Year plan.`
      );
      setSelectedPlanId('eight_months');
      return;
    }

    // If trial was already used, prompt to pick a paid plan
    if (plan.id === 'trial' && hasCompletedTrial) {
      haptic.warning();
      Alert.alert(
        'Trial Already Used',
        'Your 2-day free trial has expired. Please select the 8-Month or 1-Year plan to continue using BakeFlow POS. All your data is safe.'
      );
      setSelectedPlanId('eight_months');
      return;
    }

    haptic.selection();
    setSelectedPlanId(plan.id);
    setActivePlanId(plan.id);
    setActivating(true);

    try {
      const result = await activateBakeryPlan(currentBakery.id, plan.id);
      if (result.success) {
        haptic.success();

        if (result.status === 'active') {
          // 2-Day Free Trial activated instantly!
          Alert.alert(
            'Trial Activated',
            'Your 2-day free trial is active. You have full access to all POS billing features for the next 2 days.',
            [
              {
                text: 'Start POS Billing',
                onPress: () => {
                  if (onDismiss) onDismiss();
                },
              },
            ]
          );
        } else {
          // Paid plan requested, waiting for admin approval
          Alert.alert(
            'Request Submitted',
            `Please wait for admin approval. Your request for the ${plan.name} has been submitted.\n\nOnce approved by the admin in Supabase, your account will be activated immediately.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  fetchBakeryProfile();
                },
              },
            ]
          );
        }
      } else {
        haptic.error();
        Alert.alert('Activation Failed', result.error ?? 'Could not activate plan. Please try again.');
      }
    } catch (err: any) {
      haptic.error();
      Alert.alert('Activation Error', err.message ?? 'An unexpected error occurred.');
    } finally {
      setActivating(false);
      setActivePlanId(null);
    }
  };

  const handleManualCheckStatus = async () => {
    setCheckingStatus(true);
    haptic.selection();

    try {
      const updated = await fetchBakeryProfile();
      if (updated && updated.subscription_status === 'active') {
        haptic.success();
        Alert.alert('Subscription Active', 'Your subscription is now verified and active.', [
          {
            text: 'Continue to POS',
            onPress: () => {
              if (onDismiss) onDismiss();
            },
          },
        ]);
      } else {
        haptic.warning();
        Alert.alert(
          'Still Awaiting Approval',
          'Your account is waiting for admin approval in Supabase. Please ask the super admin to approve your account or check again shortly.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to check subscription status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResetToChooseDifferentPlan = async () => {
    if (!currentBakery) return;

    Alert.alert(
      'Switch Plan?',
      'Would you like to cancel your current pending request and choose a different plan or start the 2-day free trial?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Another Plan',
          style: 'destructive',
          onPress: async () => {
            setResettingPlan(true);
            try {
              const res = await resetSubscriptionPlan(currentBakery.id);
              if (res.success) {
                haptic.selection();
                setSelectedPlanId('trial');
              } else {
                Alert.alert('Error', res.error ?? 'Failed to reset plan.');
              }
            } finally {
              setResettingPlan(false);
            }
          },
        },
      ]
    );
  };

  // Card width calculation for mobile scroll
  const isTablet = width >= 768;
  const cardWidth = isTablet ? (width - 64) / 3 : Math.min(width - 48, 340);

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.container}>
      {/* Top Bar for dismissible modal */}
      {isDismissible && onDismiss && (
        <View style={styles.dismissRow}>
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerWrapper}>
          {/* =========================================================================
              VIEW 1: PENDING ADMIN APPROVAL SCREEN
             ========================================================================= */}
          {isPendingApproval ? (
            <View style={styles.pendingContainer}>
              <View style={styles.pendingIconCircle}>
                <Clock size={44} color="#F59E0B" strokeWidth={2.4} />
              </View>

              <View style={styles.pendingBadge}>
                <Clock size={13} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.pendingBadgeText}>AWAITING ADMIN APPROVAL</Text>
              </View>

              <Text style={styles.pendingTitle}>Subscription Verification Pending</Text>

              <Text style={styles.pendingSubtitle}>
                You requested the{' '}
                <Text style={{ fontWeight: '700', color: '#F43F5E' }}>{subStatus.planName}</Text>.
                The administrator must verify and accept your account in the Supabase management
                console before granting full app access.
              </Text>

              {/* Status Details Card */}
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bakery Store</Text>
                  <Text style={styles.detailValue}>{currentBakery?.name}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Requested Plan</Text>
                  <Text style={[styles.detailValue, { color: '#F43F5E' }]}>
                    {subStatus.planName}
                  </Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Supabase Status</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>pending_approval</Text>
                  </View>
                </View>
              </View>

              {/* Data Safety Note */}
              <View style={styles.safetyBox}>
                <View style={styles.safetyIconWrapper}>
                  <ShieldCheck size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.safetyTitle}>Your Bakery Data is 100% Safe</Text>
                  <Text style={styles.safetyText}>
                    All your store details, items, inventory, and previous orders are securely
                    stored. This paywall will unlock automatically the second your admin approves
                    in Supabase.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.pendingActionButtons}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B' }]}
                  activeOpacity={0.85}
                  onPress={handleManualCheckStatus}
                  disabled={checkingStatus}
                >
                  <RefreshCw
                    size={18}
                    color="#FFFFFF"
                    style={checkingStatus ? styles.spinIcon : undefined}
                  />
                  <Text style={styles.primaryActionBtnText}>
                    {checkingStatus ? 'Checking Supabase...' : 'Check Approval Status'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  activeOpacity={0.8}
                  onPress={handleResetToChooseDifferentPlan}
                  disabled={resettingPlan}
                >
                  <ArrowLeft size={16} color="#94A3B8" />
                  <Text style={styles.secondaryActionBtnText}>
                    Choose Another Plan or 2-Day Trial
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign Out Link */}
              <TouchableOpacity
                onPress={() => signOut()}
                style={styles.signOutRow}
                activeOpacity={0.7}
              >
                <LogOut size={16} color="#64748B" />
                <Text style={styles.signOutText}>Sign out or switch account</Text>
              </TouchableOpacity>
            </View>
          ) : hasActivePaidPlan ? (
            /* =========================================================================
                VIEW 2: ACTIVE PAID PLAN (HARD-LOCKED FROM CHANGING)
               ========================================================================= */
            <View style={styles.activeDashboardCard}>
              <View style={styles.activeBadgeRow}>
                <View style={styles.activeStatusPill}>
                  <View style={styles.greenPulseDot} />
                  <Text style={styles.activeStatusPillText}>SUBSCRIPTION ACTIVE</Text>
                </View>
                <ShieldCheck size={22} color="#10B981" />
              </View>

              <Text style={styles.activePlanName}>{subStatus.planName}</Text>
              <Text style={styles.activeStoreName}>{currentBakery?.name}</Text>

              <View style={styles.activeStatsGrid}>
                <View style={styles.activeStatBox}>
                  <Clock size={16} color="#38BDF8" />
                  <Text style={styles.activeStatLabel}>Time Remaining</Text>
                  <Text style={styles.activeStatValue}>
                    {subStatus.daysRemaining} Days
                  </Text>
                </View>

                <View style={styles.activeStatBox}>
                  <Sparkles size={16} color="#F59E0B" />
                  <Text style={styles.activeStatLabel}>Valid Until</Text>
                  <Text style={styles.activeStatValue}>{subStatus.formattedExpiry}</Text>
                </View>
              </View>

              <View style={styles.activeDivider} />

              <Text style={styles.activeFeaturesHeading}>Active Inclusions</Text>
              <View style={styles.activeFeatureList}>
                <View style={styles.activeFeatureItem}>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.activeFeatureText}>Continuous POS billing & fast invoices</Text>
                </View>
                <View style={styles.activeFeatureItem}>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.activeFeatureText}>Real-time Supabase cloud backup & offline sync</Text>
                </View>
                <View style={styles.activeFeatureItem}>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.activeFeatureText}>Multi-device cashier & staff terminal access</Text>
                </View>
                <View style={styles.activeFeatureItem}>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.activeFeatureText}>WhatsApp digital customer receipt delivery</Text>
                </View>
                <View style={styles.activeFeatureItem}>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.activeFeatureText}>Daily sales, profit, revenue & tax reports</Text>
                </View>
              </View>

              {/* Active Plan Protection Guarantee Banner */}
              <View style={styles.planProtectionNotice}>
                <ShieldCheck size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planProtectionTitle}>Active Subscription Protected</Text>
                  <Text style={styles.planProtectionText}>
                    Your account is securely active on the {subStatus.planName} until {subStatus.formattedExpiry}. To prevent billing interruptions or accidental overrides, new plan selection will unlock only after your current plan completes.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.continuePosBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (onDismiss) onDismiss();
                  useUIStore.getState().closeSubscriptionModal();
                  try {
                    router.replace('/(main)/new-order');
                  } catch {}
                }}
              >
                <Text style={styles.continuePosBtnText}>Continue to POS Billing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* =========================================================================
                VIEW 3: 3-OPTION PRICING PLAN TABLE
               ========================================================================= */
            <>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.planHeaderTag}>
                  <Sparkles size={14} color="#F59E0B" />
                  <Text style={styles.planHeaderTagText}>BAKEFLOW SUBSCRIPTION</Text>
                </View>

                <Text style={styles.heroTitle}>
                  {title ?? (isExpired ? 'Renew Your Bakery Plan' : 'Select a Subscription Plan')}
                </Text>

                <Text style={styles.heroSubtitle}>
                  {subtitle ??
                    (isExpired
                      ? 'Your subscription period has ended. Choose a plan to unlock POS billing immediately.'
                      : 'Choose the 8-Month or 1-Year plan to maintain uninterrupted POS billing & cloud backup.')}
                </Text>
              </View>

              {/* Expiry & Data Safe Reassurance Banner */}
              {isExpired && (
                <View style={styles.expiredNoticeCard}>
                  <View style={styles.expiredNoticeHeader}>
                    <AlertTriangle size={20} color="#F59E0B" />
                    <Text style={styles.expiredNoticeTitle}>
                      {currentBakery?.subscription_plan === 'trial'
                        ? '2-Day Free Trial Ended'
                        : 'Subscription Expired'}
                    </Text>
                  </View>
                  <Text style={styles.expiredNoticeBody}>
                    Your access to POS billing is temporarily paused. But rest assured:
                  </Text>
                  <View style={styles.safeHighlightBox}>
                    <ShieldCheck size={18} color="#10B981" />
                    <Text style={styles.safeHighlightText}>
                      <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Your data is 100% safe.</Text>{' '}
                      All your menu items, inventory, customer history, and past receipts remain securely preserved.
                    </Text>
                  </View>
                </View>
              )}

              {/* Segmented Tab Switcher for Quick Plan Selection (Mobile) */}
              <View style={styles.tabSelector}>
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.tabItem,
                        isSelected && {
                          backgroundColor: plan.accentBg,
                          borderColor: plan.accentColor,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => {
                        haptic.selection();
                        setSelectedPlanId(plan.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tabItemText,
                          { color: isSelected ? plan.accentColor : '#94A3B8' },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {plan.titleKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Pricing Card(s) Presentation */}
              {isTablet ? (
                /* Tablet: All 3 Cards Side-by-Side */
                <View style={styles.tabletCardsRow}>
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isProcessingThis = activating && activePlanId === plan.id;
                    const isTrial = plan.id === 'trial';
                    const isTrialDisabled = isTrial && (hasCompletedTrial || isTrialActive);

                    return (
                      <View
                        key={plan.id}
                        style={[
                          styles.pricingCard,
                          {
                            width: cardWidth,
                            borderColor: isSelected ? plan.accentColor : '#1E2433',
                            borderWidth: isSelected ? 2 : 1,
                          },
                          plan.popular && styles.popularCardElevation,
                        ]}
                      >
                        {/* Top Badge */}
                        {plan.badge && (
                          <View
                            style={[
                              styles.cardBadge,
                              { backgroundColor: plan.accentColor },
                            ]}
                          >
                            <Text style={styles.cardBadgeText}>{plan.badge}</Text>
                          </View>
                        )}

                        {/* Card Content Top */}
                        <View style={styles.cardBody}>
                          {/* Title & Tier */}
                          <Text style={[styles.cardTitle, { color: plan.accentColor }]}>
                            {plan.titleKey}
                          </Text>

                          {/* Slashed Original Price Drop */}
                          {plan.originalPrice && plan.originalPrice > 0 ? (
                            <View style={styles.slashedPriceRow}>
                              <Text style={styles.originalPriceText}>
                                {plan.originalPriceLabel}
                              </Text>
                              {plan.discountPercent && (
                                <View
                                  style={[
                                    styles.discountBadgeChip,
                                    { backgroundColor: plan.accentBorder },
                                  ]}
                                >
                                  <Text style={styles.discountBadgeText}>
                                    {plan.discountPercent}% OFF
                                  </Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            <View style={styles.slashedPricePlaceholder} />
                          )}

                          {/* Price */}
                          <View style={styles.priceRow}>
                            <Text style={styles.priceCurrency}>₹</Text>
                            <Text style={styles.priceAmount}>{plan.price}</Text>
                            <Text style={styles.billingPeriod}>{plan.billingPeriod}</Text>
                          </View>

                          {/* Savings Drop Label */}
                          {plan.savingsLabel && (
                            <Text style={[styles.savingsLabel, { color: plan.accentColor }]}>
                              {plan.savingsLabel}
                            </Text>
                          )}

                          {/* Monthly Equivalent */}
                          {plan.equivalentMonthly && (
                            <Text style={styles.monthlyEquivalent}>
                              {plan.equivalentMonthly}
                            </Text>
                          )}

                          {/* Divider */}
                          <View style={styles.cardDivider} />

                          {/* Plan Features - ALL GREEN CHECKS, ZERO REDS! */}
                          <View style={styles.featureList}>
                            {plan.features.map((featureText, idx) => (
                              <View key={idx} style={styles.featureItemRow}>
                                <View style={styles.checkIconWrap}>
                                  <Check size={12} color="#10B981" strokeWidth={3} />
                                </View>
                                <Text style={styles.featureItemText}>{featureText}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* Bottom Wavy Button Banner */}
                        <View
                          style={[
                            styles.cardFooter,
                            {
                              backgroundColor: isTrialDisabled ? '#334155' : plan.accentColor,
                            },
                          ]}
                        >
                          <Svg
                            height={20}
                            width="100%"
                            viewBox="0 0 320 20"
                            preserveAspectRatio="none"
                            style={styles.waveSvg}
                          >
                            <Path
                              d="M0,10 C80,20 160,0 240,15 C280,20 300,12 320,10 L320,20 L0,20 Z"
                              fill={isTrialDisabled ? '#334155' : plan.accentColor}
                            />
                          </Svg>

                          <TouchableOpacity
                            style={styles.ctaButton}
                            activeOpacity={0.85}
                            disabled={isProcessingThis || isTrialDisabled}
                            onPress={() => handleSelectPlan(plan)}
                          >
                            {isProcessingThis ? (
                              <Text style={styles.ctaButtonText}>Processing...</Text>
                            ) : (
                              <>
                                <Text style={styles.ctaButtonText}>
                                  {isTrial
                                    ? hasCompletedTrial
                                      ? 'Trial Already Used'
                                      : isTrialActive
                                      ? 'Trial Currently Active'
                                      : 'Start 2-Day Free Trial'
                                    : `Join ${plan.name}`}
                                </Text>
                                <Text style={styles.ctaButtonSub}>
                                  {isTrial
                                    ? hasCompletedTrial
                                      ? 'Select 8-Month or 1-Year plan'
                                      : isTrialActive
                                      ? `${subStatus.hoursRemaining} Hours remaining`
                                      : 'Instant Access • No Card Required'
                                    : `${plan.priceLabel} • Click to request admin approval`}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* Phone: Active Selected Card Directly Synced with Tab */
                (() => {
                  const plan =
                    SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];
                  const isProcessingThis = activating && activePlanId === plan.id;
                  const isTrial = plan.id === 'trial';
                  const isTrialDisabled = isTrial && (hasCompletedTrial || isTrialActive);

                  return (
                    <View
                      style={[
                        styles.pricingCard,
                        {
                          width: '100%',
                          maxWidth: 440,
                          borderColor: plan.accentColor,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      {/* Top Badge */}
                      {plan.badge && (
                        <View
                          style={[
                            styles.cardBadge,
                            { backgroundColor: plan.accentColor },
                          ]}
                        >
                          <Text style={styles.cardBadgeText}>{plan.badge}</Text>
                        </View>
                      )}

                      {/* Card Content Top */}
                      <View style={styles.cardBody}>
                        {/* Title & Tier */}
                        <Text style={[styles.cardTitle, { color: plan.accentColor }]}>
                          {plan.titleKey}
                        </Text>

                        {/* Slashed Original Price Drop */}
                        {plan.originalPrice && plan.originalPrice > 0 ? (
                          <View style={styles.slashedPriceRow}>
                            <Text style={styles.originalPriceText}>
                              {plan.originalPriceLabel}
                            </Text>
                            {plan.discountPercent && (
                              <View
                                style={[
                                  styles.discountBadgeChip,
                                  { backgroundColor: plan.accentBorder },
                                ]}
                              >
                                <Text style={styles.discountBadgeText}>
                                  {plan.discountPercent}% OFF
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.slashedPricePlaceholder} />
                        )}

                        {/* Price */}
                        <View style={styles.priceRow}>
                          <Text style={styles.priceCurrency}>₹</Text>
                          <Text style={styles.priceAmount}>{plan.price}</Text>
                          <Text style={styles.billingPeriod}>{plan.billingPeriod}</Text>
                        </View>

                        {/* Savings Drop Label */}
                        {plan.savingsLabel && (
                          <Text style={[styles.savingsLabel, { color: plan.accentColor }]}>
                            {plan.savingsLabel}
                          </Text>
                        )}

                        {/* Monthly Equivalent */}
                        {plan.equivalentMonthly && (
                          <Text style={styles.monthlyEquivalent}>
                            {plan.equivalentMonthly}
                          </Text>
                        )}

                        {/* Divider */}
                        <View style={styles.cardDivider} />

                        {/* Plan Features - ALL GREEN CHECKS, ZERO REDS! */}
                        <View style={styles.featureList}>
                          {plan.features.map((featureText, idx) => (
                            <View key={idx} style={styles.featureItemRow}>
                              <View style={styles.checkIconWrap}>
                                <Check size={12} color="#10B981" strokeWidth={3} />
                              </View>
                              <Text style={styles.featureItemText}>{featureText}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Bottom Wavy Button Banner */}
                      <View
                        style={[
                          styles.cardFooter,
                          {
                            backgroundColor: isTrialDisabled ? '#334155' : plan.accentColor,
                          },
                        ]}
                      >
                        {/* Wavy SVG Top Border */}
                        <Svg
                          height={20}
                          width="100%"
                          viewBox="0 0 320 20"
                          preserveAspectRatio="none"
                          style={styles.waveSvg}
                        >
                          <Path
                            d="M0,10 C80,20 160,0 240,15 C280,20 300,12 320,10 L320,20 L0,20 Z"
                            fill={isTrialDisabled ? '#334155' : plan.accentColor}
                          />
                        </Svg>

                        <TouchableOpacity
                          style={styles.ctaButton}
                          activeOpacity={0.85}
                          disabled={isProcessingThis || isTrialDisabled}
                          onPress={() => handleSelectPlan(plan)}
                        >
                          {isProcessingThis ? (
                            <Text style={styles.ctaButtonText}>Processing...</Text>
                          ) : (
                            <>
                              <Text style={styles.ctaButtonText}>
                                {isTrial
                                  ? hasCompletedTrial
                                    ? 'Trial Already Used'
                                    : isTrialActive
                                    ? 'Trial Currently Active'
                                    : 'Start 2-Day Free Trial'
                                  : `Join ${plan.name}`}
                              </Text>
                              <Text style={styles.ctaButtonSub}>
                                {isTrial
                                  ? hasCompletedTrial
                                    ? 'Select 8-Month or 1-Year plan'
                                    : isTrialActive
                                    ? `${subStatus.hoursRemaining} Hours remaining`
                                    : 'Instant Access • No Card Required'
                                  : `${plan.priceLabel} • Click to request admin approval`}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })()
              )}

              {/* Data Safety & Guarantee Section */}
              <View style={styles.guaranteeBox}>
                <View style={styles.guaranteeHeader}>
                  <ShieldCheck size={22} color="#10B981" />
                  <Text style={styles.guaranteeTitle}>100% Data Safety Guarantee</Text>
                </View>
                <Text style={styles.guaranteeText}>
                  Your bakery data is encrypted and backed up continuously. If your trial or plan
                  expires, your store data, menu items, invoices, and customer logs remain 100% safe
                  and secure. You will never lose any records.
                </Text>
              </View>

              {/* Sign Out Option */}
              {!isDismissible && (
                <TouchableOpacity
                  onPress={() => signOut()}
                  style={styles.signOutRow}
                  activeOpacity={0.7}
                >
                  <LogOut size={16} color="#64748B" />
                  <Text style={styles.signOutText}>Sign out or switch account</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14', // Deep dark theme matching the template
  },
  dismissRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 1024,
    alignItems: 'center',
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  appLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  planHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  planHeaderTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 520,
    lineHeight: 20,
  },

  /* Expired Notice Card */
  expiredNoticeCard: {
    width: '100%',
    backgroundColor: '#1C150E',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  expiredNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  expiredNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  expiredNoticeBody: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  safeHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  safeHighlightText: {
    fontSize: 12.5,
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 18,
  },

  /* Tab Selector */
  tabSelector: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#131824',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabPriceSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },

  /* Pricing Cards Deck */
  tabletCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  cardsScrollContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 16,
    paddingHorizontal: 4,
  },
  pricingCard: {
    backgroundColor: '#121623', // Dark charcoal/navy card surface
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  popularCardElevation: {
    borderColor: '#F43F5E',
  },
  cardBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
    zIndex: 10,
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 20,
    paddingBottom: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardDuration: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  slashedPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    minHeight: 22,
  },
  slashedPricePlaceholder: {
    minHeight: 22,
    marginTop: 10,
  },
  originalPriceText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  discountBadgeChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savingsLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  priceCurrency: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  billingPeriod: {
    fontSize: 13,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginBottom: 6,
    marginLeft: 6,
    fontWeight: '600',
  },
  monthlyEquivalent: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1E2536',
    marginVertical: 16,
  },

  /* Feature Checklist */
  featureList: {
    gap: 12,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureItemText: {
    fontSize: 12.5,
    color: '#F1F5F9',
    fontWeight: '500',
    flex: 1,
  },
  featureItemTextDisabled: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },

  /* Bottom Wavy Button Banner */
  cardFooter: {
    width: '100%',
    paddingBottom: 16,
    position: 'relative',
  },
  waveSvg: {
    position: 'absolute',
    top: -19,
    left: 0,
    right: 0,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  ctaButtonSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Guarantee Section */
  guaranteeBox: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#121724',
    borderWidth: 1,
    borderColor: '#1E2538',
    borderRadius: 16,
    padding: 18,
    marginTop: 28,
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  guaranteeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guaranteeText: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 19,
  },

  /* Sign Out */
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
    padding: 8,
  },
  signOutText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  /* =========================================================================
     Pending Approval View Styles
     ========================================================================= */
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    width: '100%',
    maxWidth: 480,
  },
  pendingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#121724',
    borderWidth: 1,
    borderColor: '#1E2538',
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#1E2538',
    marginVertical: 12,
  },
  statusPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  safetyBox: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0F1A1C',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    gap: 12,
  },
  safetyIconWrapper: {
    marginTop: 2,
  },
  safetyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#10B981',
  },
  safetyText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginTop: 2,
  },
  pendingActionButtons: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#131824',
    gap: 6,
  },
  secondaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  spinIcon: {
    transform: [{ rotate: '45deg' }],
  },

  /* Active Subscription Dashboard View */
  activeDashboardCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#121724',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 20,
    padding: 22,
    marginTop: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  activePlanName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  activeStoreName: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 3,
  },
  activeStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  activeStatBox: {
    flex: 1,
    backgroundColor: '#0F131D',
    borderWidth: 1,
    borderColor: '#1E2538',
    borderRadius: 12,
    padding: 12,
  },
  activeStatLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  activeStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeDivider: {
    height: 1,
    backgroundColor: '#1E2538',
    marginVertical: 18,
  },
  activeFeaturesHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  activeFeatureList: {
    gap: 10,
  },
  activeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeFeatureText: {
    fontSize: 12.5,
    color: '#E2E8F0',
    fontWeight: '500',
    flex: 1,
  },
  continuePosBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  continuePosBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  planProtectionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F1A1C',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    gap: 10,
  },
  planProtectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#10B981',
  },
  planProtectionText: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 2,
  },
});
