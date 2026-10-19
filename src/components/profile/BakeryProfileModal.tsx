import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
  LogOut,
  Clock,
  Settings,
  CreditCard,
  Mail,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { getSubscriptionStatus } from '@/services/subscriptionService';
import { Badge } from '@/components/ui/Badge';
import { useUIStore } from '@/stores/uiStore';
import { useRouter } from 'expo-router';

interface BakeryProfileModalProps {
  visible?: boolean;
  onClose?: () => void;
  onOpenSubscription?: () => void;
}

export function BakeryProfileModal({
  visible,
  onClose,
  onOpenSubscription,
}: BakeryProfileModalProps = {}) {
  const { colors, typography, borderRadius, spacing } = useTheme();
  const { user, currentBakery, currentMembership, signOut } = useAuthStore();
  const router = useRouter();

  const isStoreOpen = useUIStore((s) => s.isProfileModalOpen);
  const closeStoreModal = useUIStore((s) => s.closeProfileModal);
  const openSubStore = useUIStore((s) => s.openSubscriptionModal);

  const isVisible = visible !== undefined ? visible : isStoreOpen;
  const handleClose = onClose || closeStoreModal;
  const handleOpenSub = onOpenSubscription || (() => {
    handleClose();
    openSubStore();
  });

  if (!isVisible) return null;

  const subStatus = getSubscriptionStatus(currentBakery);
  const isTrial = currentBakery?.subscription_plan === 'trial';
  const hasActivePaidPlan =
    subStatus.isActive &&
    !subStatus.isExpired &&
    (currentBakery?.subscription_plan === 'eight_months' ||
      currentBakery?.subscription_plan === 'one_year');

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Bakery Manager';

  const getInitials = (name?: string | null) => {
    if (!name) return 'B';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleOpenSettings = () => {
    handleClose();
    router.navigate('/(main)/settings');
  };

  const handleUpgradePress = () => {
    handleOpenSub();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Modal Top Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerTitleWrap}>
            <Text style={[typography.h3, { color: colors.text }]}>Bakery & Profile</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Account overview & subscription
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Bakery Store Hero Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderRadius: borderRadius.xl,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full },
                ]}
              >
                <Text style={[typography.h2, { color: colors.primary }]}>
                  {getInitials(currentBakery?.name)}
                </Text>
              </View>

              <View style={styles.heroInfo}>
                <Text style={[typography.h2, { color: colors.text, fontSize: 19 }]} numberOfLines={1}>
                  {currentBakery?.name ?? 'My Bakery'}
                </Text>
                <View style={styles.roleRow}>
                  <Badge
                    label={currentMembership?.role === 'owner' ? 'Owner / Admin' : 'Staff'}
                    variant={currentMembership?.role === 'owner' ? 'primary' : 'neutral'}
                  />
                  <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
                    POS Register
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Address & Phone Details */}
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <MapPin size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Bakery Address</Text>
                  <Text style={[typography.body, { color: colors.text, fontSize: 13 }]}>
                    {currentBakery?.address || 'No physical address added yet'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Phone size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Store Phone</Text>
                  <Text style={[typography.body, { color: colors.text, fontSize: 13 }]}>
                    {currentBakery?.phone || 'No phone number added'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Mail size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Login Account</Text>
                  <Text style={[typography.body, { color: colors.text, fontSize: 13 }]}>
                    {user?.email ?? '—'} ({userDisplayName})
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Subscription Status Card */}
          <View
            style={[
              styles.subscriptionCard,
              {
                backgroundColor: colors.surface,
                borderColor: isTrial ? '#F97316' : colors.primary,
                borderRadius: borderRadius.xl,
              },
            ]}
          >
            <View style={styles.subCardHeader}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.subIconBadge,
                    {
                      backgroundColor: isTrial
                        ? 'rgba(249, 115, 22, 0.15)'
                        : colors.primaryLight,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  {isTrial ? (
                    <Clock size={20} color="#F97316" />
                  ) : (
                    <CreditCard size={20} color={colors.primary} />
                  )}
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[typography.h3, { color: colors.text, fontSize: 16 }]}>
                    {subStatus.planName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Active Subscription
                  </Text>
                </View>
              </View>

              <Badge
                label={
                  subStatus.isActive
                    ? 'Active'
                    : subStatus.isPendingApproval
                    ? 'Pending Approval'
                    : 'Expired'
                }
                variant={
                  subStatus.isActive
                    ? 'success'
                    : subStatus.isPendingApproval
                    ? 'warning'
                    : 'danger'
                }
              />
            </View>

            {/* Validity / Countdown */}
            <View
              style={[
                styles.validityBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.validityRow}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Time Remaining:</Text>
                <Text
                  style={[
                    typography.bodyBold,
                    {
                      color: isTrial
                        ? '#F97316'
                        : subStatus.isActive
                        ? colors.primary
                        : colors.danger,
                    },
                  ]}
                >
                  {isTrial && subStatus.isActive
                    ? `${subStatus.hoursRemaining} Hours left (2-Day Trial)`
                    : subStatus.isActive
                    ? `${subStatus.daysRemaining} Days remaining`
                    : subStatus.isPendingApproval
                    ? 'Awaiting admin in Supabase'
                    : 'Expired'}
                </Text>
              </View>

              <View style={[styles.validityRow, { marginTop: 6 }]}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Valid Until:</Text>
                <Text style={[typography.captionBold, { color: colors.text }]}>
                  {subStatus.formattedExpiry}
                </Text>
              </View>
            </View>

            {/* Data Safety Note */}
            <View style={styles.dataSafeRow}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 6, flex: 1 }]}>
                100% Data Safety: All bakery orders and inventory remain safe.
              </Text>
            </View>

            {/* Upgrade / View Plan Button */}
            <TouchableOpacity
              style={[
                styles.upgradeBtn,
                {
                  backgroundColor: hasActivePaidPlan
                    ? '#10B981'
                    : isTrial
                    ? '#F97316'
                    : colors.primary,
                  borderRadius: borderRadius.lg,
                },
              ]}
              activeOpacity={0.85}
              onPress={handleUpgradePress}
            >
              {hasActivePaidPlan ? (
                <ShieldCheck size={16} color="#FFFFFF" />
              ) : (
                <Sparkles size={16} color="#FFFFFF" />
              )}
              <Text style={styles.upgradeBtnText}>
                {hasActivePaidPlan
                  ? 'View Plan Details'
                  : isTrial
                  ? 'Upgrade to 8-Month or 1-Year Plan'
                  : 'Renew Subscription'}
              </Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick Action Navigation Buttons */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  borderRadius: borderRadius.lg,
                },
              ]}
              activeOpacity={0.75}
              onPress={handleOpenSettings}
            >
              <View style={styles.row}>
                <View
                  style={[
                    styles.actionIconBadge,
                    { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.md },
                  ]}
                >
                  <Settings size={18} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    Full Bakery Settings
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Theme colors, store details & updates
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  borderRadius: borderRadius.lg,
                  marginTop: 10,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => {
                handleClose();
                signOut();
              }}
            >
              <View style={styles.row}>
                <View
                  style={[
                    styles.actionIconBadge,
                    { backgroundColor: colors.dangerLight, borderRadius: borderRadius.md },
                  ]}
                >
                  <LogOut size={18} color={colors.danger} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[typography.bodyBold, { color: colors.danger }]}>Sign Out</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Switch user or sign out of session
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    padding: 18,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 14,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  subscriptionCard: {
    padding: 18,
    borderWidth: 1.5,
    marginTop: 16,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subIconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityBox: {
    padding: 12,
    marginTop: 14,
  },
  validityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataSafeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
    gap: 6,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
    flex: 1,
    textAlign: 'center',
  },
  quickActionsContainer: {
    marginTop: 18,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
  },
  actionIconBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
