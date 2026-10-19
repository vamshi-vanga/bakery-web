import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  Zap,
  Crown,
  Gift,
  X,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { haptic } from '@/utils/haptics';
import {
  SUBSCRIPTION_PLANS,
  PlanConfig,
  activateBakeryPlan,
  resetSubscriptionPlan,
  subscribeToBakeryRealtime,
  getSubscriptionStatus,
} from '@/services/subscriptionService';
import { SubscriptionPlan } from '@/types/database';

interface SubscriptionPaywallProps {
  /**
   * If true, allows dismissing via a close button (used when opened from Settings).
   * If false, behaves as a mandatory blocking paywall.
   */
  isDismissible?: boolean;
  onDismiss?: () => void;
  title?: string;
  subtitle?: string;
}

export function SubscriptionPaywall({
  isDismissible = false,
  onDismiss,
  title,
  subtitle,
}: SubscriptionPaywallProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { currentBakery, signOut, fetchBakeryProfile } = useAuthStore();

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan>('trial');
  const [activating, setActivating] = useState(false);
  const [activePlanId, setActivePlanId] = useState<SubscriptionPlan | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resettingPlan, setResettingPlan] = useState(false);

  const subStatus = getSubscriptionStatus(currentBakery);
  const isPendingApproval = subStatus.isPendingApproval;

  // Real-time listener: automatically unlock app when admin approves in Supabase
  useEffect(() => {
    if (!currentBakery?.id) return;

    const unsubscribe = subscribeToBakeryRealtime(currentBakery.id, (approvedBakery) => {
      haptic.success();
      Alert.alert(
        'Subscription Approved! 🎉',
        `Your ${approvedBakery.subscription_plan === 'one_year' ? '1-Year' : '8-Month'} subscription has been accepted by the admin! Welcome to Golden Baker's POS.`,
        [
          {
            text: 'Get Started',
            onPress: () => {
              if (onDismiss) onDismiss();
            },
          },
        ]
      );
    });

    return () => {
      unsubscribe();
    };
  }, [currentBakery?.id, onDismiss]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (!currentBakery) {
      Alert.alert('Store Profile Missing', 'Please complete your bakery profile first.');
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
            'Trial Activated! 🥐',
            'Your 48-hour free trial is active. You have full unlimited access to all POS and inventory features for the next 2 days.',
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
            'Request Submitted! ⏳',
            `Your request for the ${plan.name} has been sent to the administrator. The admin will verify and activate your account in Supabase.`,
            [{ text: 'View Status' }]
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
        Alert.alert('Subscription Active! 🎉', 'Your subscription is now verified and active!', [
          {
            text: 'Continue',
            onPress: () => {
              if (onDismiss) onDismiss();
            },
          },
        ]);
      } else {
        haptic.warning();
        Alert.alert(
          'Still Awaiting Approval',
          'Your account is still waiting for admin acceptance in Supabase. Please ask the super admin to approve your account or check again shortly.'
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

  const getPlanIcon = (planId: SubscriptionPlan) => {
    switch (planId) {
      case 'trial':
        return <Gift size={22} color={colors.primary} />;
      case 'eight_months':
        return <Zap size={22} color={colors.primary} />;
      case 'one_year':
        return <Crown size={22} color="#D97706" />;
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar for dismissible modal */}
      {isDismissible && onDismiss && (
        <View style={[styles.dismissRow, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.closeButton, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.full }]}
            activeOpacity={0.7}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveWrapper}>
          {/* =========================================================================
              VIEW 1: PENDING ADMIN APPROVAL SCREEN
             ========================================================================= */}
          {isPendingApproval ? (
            <View style={styles.pendingContainer}>
              <View
                style={[
                  styles.statusIconCircle,
                  {
                    backgroundColor: '#FEF3C7',
                    borderColor: '#F59E0B',
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Clock size={40} color="#D97706" strokeWidth={2.2} />
              </View>

              <View style={[styles.pendingBadge, { backgroundColor: '#FEF3C7', borderRadius: borderRadius.full }]}>
                <Text style={[typography.captionBold, { color: '#B45309' }]}>
                  ⏳ Awaiting Admin Approval
                </Text>
              </View>

              <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
                Subscription Pending Approval
              </Text>

              <Text
                style={[
                  typography.subtitle,
                  { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 380 },
                ]}
              >
                You have requested the{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>{subStatus.planName}</Text>.
                Our team will verify your account in Supabase before granting full app access.
              </Text>

              {/* Status Details Card */}
              <View
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    borderRadius: borderRadius.lg,
                    marginTop: spacing.xl,
                  },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Bakery Store</Text>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{currentBakery?.name}</Text>
                </View>

                <View style={[styles.detailDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Selected Plan</Text>
                  <View style={styles.row}>
                    {getPlanIcon(currentBakery?.subscription_plan as SubscriptionPlan)}
                    <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>
                      {subStatus.planName}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Verification Status</Text>
                  <Badge label="Pending in Supabase" variant="warning" />
                </View>
              </View>

              {/* Verification Steps Explanation */}
              <View
                style={[
                  styles.stepsBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: borderRadius.lg,
                    marginTop: spacing.lg,
                  },
                ]}
              >
                <View style={styles.row}>
                  <AlertCircle size={18} color={colors.primary} />
                  <Text style={[typography.captionBold, { color: colors.text, marginLeft: 8 }]}>
                    What happens next?
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6, lineHeight: 18 }]}>
                  • The admin will verify your payment in the Supabase management console.{'\n'}
                  • Once approved, this screen will instantly unlock with zero restart required.{'\n'}
                  • Want to start billing right now? You can switch to the 2-day free trial anytime!
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.md }}>
                <Button
                  title={checkingStatus ? 'Checking Supabase...' : 'Check Approval Status'}
                  variant="primary"
                  size="lg"
                  loading={checkingStatus}
                  onPress={handleManualCheckStatus}
                  icon={<RefreshCw size={18} color="#FFFFFF" />}
                />

                <Button
                  title="Choose a Different Plan / Start 2-Day Trial"
                  variant="outline"
                  size="md"
                  loading={resettingPlan}
                  onPress={handleResetToChooseDifferentPlan}
                  icon={<ArrowLeft size={16} color={colors.primary} />}
                />
              </View>

              {/* Sign Out Link */}
              <TouchableOpacity
                onPress={() => signOut()}
                style={[styles.signOutRow, { marginTop: spacing.xl }]}
                activeOpacity={0.7}
              >
                <LogOut size={16} color={colors.textMuted} />
                <Text style={[typography.captionBold, { color: colors.textMuted, marginLeft: 6 }]}>
                  Sign out or switch account
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* =========================================================================
                VIEW 2: PLAN SELECTION PAYWALL (TRIAL, 8-MONTH, 1-YEAR)
               ========================================================================= */
            <>
              {/* Header */}
              <View style={styles.header}>
                <Image
                  source={require('../../../assets/images/app-logo.png')}
                  style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 8 }}
                  resizeMode="contain"
                />

                <View style={styles.proPill}>
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 6 }]}>
                    {currentBakery?.name ? `${currentBakery.name} Subscription` : 'BakeFlow Plans'}
                  </Text>
                </View>

                <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
                  {title ?? 'Choose Your Bakery Plan'}
                </Text>

                <Text
                  style={[
                    typography.subtitle,
                    { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 380 },
                  ]}
                >
                  {subtitle ??
                    'Select a plan to start POS billing. 2-Day Trial activates instantly; 8-Month and 1-Year plans require admin approval.'}
                </Text>
              </View>

              {/* Plan Cards */}
              <View style={[styles.plansList, { marginTop: spacing.xl, gap: spacing.md }]}>
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isProcessingThis = activating && activePlanId === plan.id;

                  return (
                    <TouchableOpacity
                      key={plan.id}
                      activeOpacity={0.9}
                      onPress={() => setSelectedPlanId(plan.id)}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: colors.surface,
                          borderRadius: borderRadius.xl,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          borderWidth: isSelected ? 2 : 1,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                          shadowOpacity: isSelected ? 0.08 : 0.03,
                          shadowRadius: isSelected ? 8 : 4,
                          elevation: isSelected ? 3 : 1,
                        },
                      ]}
                    >
                      {/* Top Badge (if any) */}
                      {plan.badge && (
                        <View style={styles.badgeContainer}>
                          <Badge
                            label={plan.badge}
                            variant={plan.bestValue ? 'warning' : plan.popular ? 'primary' : 'success'}
                          />
                        </View>
                      )}

                      {/* Card Header */}
                      <View style={styles.cardHeaderRow}>
                        <View
                          style={[
                            styles.planIconWrapper,
                            {
                              backgroundColor: plan.bestValue ? '#FEF3C7' : colors.primaryLight,
                              borderRadius: borderRadius.md,
                            },
                          ]}
                        >
                          {getPlanIcon(plan.id)}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[typography.h3, { color: colors.text }]}>{plan.name}</Text>
                          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                            {plan.durationLabel}
                          </Text>
                        </View>

                        {/* Price Tag */}
                        <View style={styles.priceContainer}>
                          <Text style={[typography.h2, { color: colors.text }]}>{plan.priceLabel}</Text>
                          {plan.equivalentMonthly && (
                            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                              {plan.equivalentMonthly}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Description */}
                      <Text style={[typography.body, { color: colors.textMuted, marginTop: 10, fontSize: 13 }]}>
                        {plan.description}
                      </Text>

                      {/* Feature Checkpoints */}
                      <View style={[styles.featuresList, { marginTop: 12 }]}>
                        {plan.features.map((feature, idx) => (
                          <View key={idx} style={styles.featureRow}>
                            <CheckCircle2
                              size={16}
                              color={isSelected ? colors.primary : colors.textLight}
                              style={{ marginTop: 2 }}
                            />
                            <Text
                              style={[
                                typography.caption,
                                {
                                  color: isSelected ? colors.text : colors.textMuted,
                                  marginLeft: 8,
                                  flex: 1,
                                  fontSize: 12.5,
                                },
                              ]}
                            >
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Action Button */}
                      <Button
                        title={
                          isProcessingThis
                            ? 'Processing...'
                            : plan.price === 0
                            ? 'Start 2-Day Free Trial (Instant Access)'
                            : `Request ${plan.name} (${plan.priceLabel})`
                        }
                        variant={isSelected ? 'primary' : 'outline'}
                        size="md"
                        loading={isProcessingThis}
                        onPress={() => handleSelectPlan(plan)}
                        style={{ marginTop: 14 }}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Guarantee / Security Note */}
              <View
                style={[
                  styles.guaranteeBox,
                  { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.lg, marginTop: spacing.xl },
                ]}
              >
                <ShieldCheck size={20} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 10, flex: 1 }]}>
                  Free trial starts immediately for 48 hours. Paid plans (8-month / 1-year) activate as soon as the administrator accepts your account in Supabase.
                </Text>
              </View>

              {/* Sign Out Option */}
              {!isDismissible && (
                <TouchableOpacity
                  onPress={() => signOut()}
                  style={[styles.signOutRow, { marginTop: spacing.xl }]}
                  activeOpacity={0.7}
                >
                  <LogOut size={16} color={colors.textMuted} />
                  <Text style={[typography.captionBold, { color: colors.textMuted, marginLeft: 6 }]}>
                    Sign out or switch account
                  </Text>
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
  },
  dismissRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  plansList: {
    width: '100%',
  },
  planCard: {
    padding: 16,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 60, // space for badge
  },
  planIconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  featuresList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pending Approval Styles
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusIconCircle: {
    width: 80,
    height: 80,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pendingBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 10,
  },
  detailsCard: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailDivider: {
    height: 1,
    marginVertical: 8,
  },
  stepsBox: {
    width: '100%',
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
