import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Store,
  User,
  Mail,
  DollarSign,
  Globe,
  LogOut,
  Receipt,
  ChevronRight,
  Sparkles,
  DownloadCloud,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Palette as PaletteIcon,
  Check,
  Crown,
  CreditCard,
  AlertTriangle,
  Trash2,
  Lock,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, ColorPresets, ThemeColorKey } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { haptic } from '@/utils/haptics';
import {
  checkForOTAUpdate,
  fetchAndApplyOTAUpdate,
  getUpdateMetadata,
} from '@/services/updatesService';
import { getSubscriptionStatus } from '@/services/subscriptionService';
import { SubscriptionPaywall } from '@/components/subscription/SubscriptionPaywall';
import { HeaderProfileButton } from '@/components/profile/HeaderProfileButton';

export default function SettingsScreen() {
  const { colors, spacing, typography, borderRadius, themeMode, themeColor, setThemeMode, setThemeColor } = useTheme();
  const router = useRouter();
  const { user, currentBakery, currentMembership, signOut, deleteAccount } = useAuthStore();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Delete account confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subStatus = getSubscriptionStatus(currentBakery);
  const updateMeta = getUpdateMetadata();

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMessage(null);
    try {
      const res = await checkForOTAUpdate();
      if (res.isAvailable) {
        setHasNewUpdate(true);
        setUpdateMessage('A new version was published! Tap below to install.');
      } else {
        setHasNewUpdate(false);
        setUpdateMessage(res.message ?? 'App is running the latest update.');
      }
    } catch (e: any) {
      setUpdateMessage(e.message ?? 'Could not check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    setDownloadingUpdate(true);
    try {
      await fetchAndApplyOTAUpdate();
    } catch (e: any) {
      Alert.alert('Update Failed', e.message ?? 'Failed to apply update.');
      setDownloadingUpdate(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password to confirm deletion.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError(null);

    try {
      const res = await deleteAccount(deletePassword.trim());
      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete account.');
        haptic.error();
        setDeletingAccount(false);
        return;
      }

      haptic.success();
      setShowDeleteModal(false);
      setDeletePassword('');

      Alert.alert(
        'Account Deleted',
        'Your account and all associated bakery data have been permanently removed.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/');
            },
          },
        ]
      );
    } catch (err: any) {
      setDeleteError(err.message || 'An unexpected error occurred.');
      haptic.error();
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.responsiveWrapper}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[typography.h2, { color: colors.text }]}>Settings & Profile</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                Manage bakery profile, appearance, and OTA updates
              </Text>
            </View>
            <HeaderProfileButton />
          </View>

          {/* Theme & Appearance (Light / Dark / Auto) */}
          <Card style={{ marginTop: spacing.xl }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Sun size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  Appearance & Mode
                </Text>
              </View>
              <Badge
                label={themeMode === 'auto' ? 'Auto System' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                variant="primary"
              />
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Seamless instant theme switching. Adapts all colors smoothly without refreshing.
            </Text>

            <View style={[styles.themeSelectorRow, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.lg }]}>
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setThemeMode('light');
                }}
                style={[
                  styles.themeOptionBtn,
                  themeMode === 'light' && [
                    styles.themeOptionBtnActive,
                    { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: borderRadius.md },
                  ],
                ]}
                activeOpacity={0.8}
              >
                <Sun size={18} color={themeMode === 'light' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    typography.captionBold,
                    { color: themeMode === 'light' ? colors.primary : colors.textMuted, marginLeft: 6 },
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setThemeMode('dark');
                }}
                style={[
                  styles.themeOptionBtn,
                  themeMode === 'dark' && [
                    styles.themeOptionBtnActive,
                    { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: borderRadius.md },
                  ],
                ]}
                activeOpacity={0.8}
              >
                <Moon size={18} color={themeMode === 'dark' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    typography.captionBold,
                    { color: themeMode === 'dark' ? colors.primary : colors.textMuted, marginLeft: 6 },
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setThemeMode('auto');
                }}
                style={[
                  styles.themeOptionBtn,
                  themeMode === 'auto' && [
                    styles.themeOptionBtnActive,
                    { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: borderRadius.md },
                  ],
                ]}
                activeOpacity={0.8}
              >
                <Monitor size={18} color={themeMode === 'auto' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    typography.captionBold,
                    { color: themeMode === 'auto' ? colors.primary : colors.textMuted, marginLeft: 6 },
                  ]}
                >
                  Auto
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Brand & Accent Color Palette Section */}
            <View style={styles.cardHeaderSmall}>
              <View style={styles.row}>
                <PaletteIcon size={18} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, fontSize: 16, marginLeft: 8 }]}>
                  Brand & Accent Color
                </Text>
              </View>
              <Badge
                label={ColorPresets[themeColor]?.name ?? 'Custom'}
                variant="primary"
              />
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Choose your bakery brand color for buttons, tabs, invoices, and POS indicators.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorSwatchesContainer}
            >
              {(Object.keys(ColorPresets) as ThemeColorKey[]).map((key) => {
                const preset = ColorPresets[key];
                const isSelected = themeColor === key;
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.75}
                    onPress={() => {
                      haptic.selection();
                      setThemeColor(key);
                    }}
                    style={[
                      styles.colorSwatchCard,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: isSelected ? preset.swatch : colors.borderSubtle,
                        borderRadius: borderRadius.lg,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      isSelected && {
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: preset.swatch },
                      ]}
                    >
                      {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text
                      style={[
                        typography.captionBold,
                        {
                          color: isSelected ? colors.text : colors.textMuted,
                          fontSize: 12,
                          marginTop: 6,
                        },
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>

          {/* Over-The-Air (OTA) Updates Card */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Sparkles size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  Over-The-Air (OTA) Updates
                </Text>
              </View>
              <Badge label="Instant" variant="primary" />
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              Push and install instant app updates directly to this device without re-installing the APK binary.
            </Text>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Installed App Version</Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                1.0.0 (Runtime: {updateMeta.runtimeVersion})
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Update Channel</Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {updateMeta.channel}
              </Text>
            </View>

            {updateMessage && (
              <View
                style={[
                  styles.updateMessageBox,
                  {
                    backgroundColor: hasNewUpdate ? colors.primaryLight : colors.surfaceSubtle,
                    borderRadius: borderRadius.sm,
                    borderColor: hasNewUpdate ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: hasNewUpdate ? colors.primary : colors.textMuted },
                  ]}
                >
                  {updateMessage}
                </Text>
              </View>
            )}

            {hasNewUpdate ? (
              <Button
                title="Download & Install Update"
                variant="primary"
                size="lg"
                loading={downloadingUpdate}
                onPress={handleApplyUpdate}
                icon={<DownloadCloud size={18} color="#FFFFFF" />}
                style={{ marginTop: spacing.md }}
              />
            ) : (
              <Button
                title="Check for Updates"
                variant="outline"
                size="md"
                loading={checkingUpdate}
                onPress={handleCheckUpdate}
                icon={<RefreshCw size={18} color={colors.primary} />}
                style={{ marginTop: spacing.md }}
              />
            )}
          </Card>

          {/* Subscription & Plan Card */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Crown size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  Subscription & Plan
                </Text>
              </View>
              <Badge
                label={
                  subStatus.isActive
                    ? 'Active'
                    : subStatus.isPendingApproval
                    ? 'Pending Approval'
                    : subStatus.isExpired
                    ? 'Expired'
                    : 'Inactive'
                }
                variant={
                  subStatus.isActive
                    ? 'primary'
                    : subStatus.isPendingApproval
                    ? 'warning'
                    : 'danger'
                }
              />
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Current Plan</Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {subStatus.planName}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Remaining Days</Text>
              <Text
                style={[
                  typography.bodyBold,
                  {
                    color: subStatus.isActive
                      ? colors.primary
                      : subStatus.isPendingApproval
                      ? '#D97706'
                      : colors.danger,
                  },
                ]}
              >
                {subStatus.isActive
                  ? subStatus.planId === 'trial'
                    ? `${subStatus.hoursRemaining} hours left (2-Day Trial)`
                    : `${subStatus.daysRemaining} days remaining`
                  : subStatus.isPendingApproval
                  ? 'Awaiting Admin Approval'
                  : 'Expired / Inactive'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Valid Until</Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {subStatus.formattedExpiry}
              </Text>
            </View>

            <Button
              title={
                subStatus.isActive && subStatus.planId !== 'trial'
                  ? 'View Plan Details'
                  : subStatus.isActive && subStatus.planId === 'trial'
                  ? 'Upgrade to 8-Month or 1-Year Plan'
                  : 'Renew Subscription'
              }
              variant="outline"
              size="md"
              onPress={() => setShowPaywallModal(true)}
              icon={<CreditCard size={18} color={colors.primary} />}
              style={{ marginTop: spacing.md }}
            />
          </Card>

          {/* Bakery Information */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Store size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  Bakery Profile
                </Text>
              </View>
              {currentMembership && (
                <Badge
                  label={currentMembership.role}
                  variant={currentMembership.role === 'owner' ? 'primary' : 'neutral'}
                />
              )}
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Bakery Name</Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {currentBakery?.name ?? '—'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Phone</Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {currentBakery?.phone ?? 'Not set'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Address</Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {currentBakery?.address ?? 'Not set'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.row}>
                <DollarSign size={16} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
                  Currency
                </Text>
              </View>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {currentBakery?.currency ?? 'INR'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.row}>
                <Globe size={16} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
                  Timezone
                </Text>
              </View>
              <Text style={[typography.body, { color: colors.text }]}>
                {currentBakery?.timezone ?? 'Asia/Kolkata'}
              </Text>
            </View>
          </Card>

          {/* Account Details */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.row}>
              <User size={20} color={colors.primary} />
              <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                User Account
              </Text>
            </View>

            <View style={[styles.infoRow, { marginTop: spacing.md }]}>
              <View style={styles.row}>
                <Mail size={16} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
                  Email
                </Text>
              </View>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                {user?.email ?? '—'}
              </Text>
            </View>
          </Card>

          {/* Quick Access: Order History & Receipts */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              haptic.selection();
              router.navigate('/(main)/orders');
            }}
            style={{ marginTop: spacing.lg }}
          >
            <Card style={styles.historyCard}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md },
                  ]}
                >
                  <Receipt size={22} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    Order History & Receipts
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    View invoices, void transactions & WhatsApp receipts
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textLight} />
            </Card>
          </TouchableOpacity>

          {/* Danger Zone: Permanent Account Deletion */}
          <Card
            style={{
              marginTop: spacing.xl,
              borderColor: colors.danger,
              borderWidth: 1.5,
              backgroundColor: colors.surface,
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <AlertTriangle size={20} color={colors.danger} />
                <Text style={[typography.h3, { color: colors.danger, marginLeft: 8 }]}>
                  Danger Zone
                </Text>
              </View>
              <Badge label="Irreversible" variant="danger" />
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Permanently delete your user account, bakery store data, inventory catalog, customer orders, and receipt logs. You must verify your current password to confirm deletion.
            </Text>

            <Button
              title="Delete Account"
              variant="danger"
              size="md"
              onPress={() => {
                haptic.warning();
                setDeleteError(null);
                setDeletePassword('');
                setShowDeleteModal(true);
              }}
              icon={<Trash2 size={16} color="#FFFFFF" />}
            />
          </Card>

          {/* Sign Out Button */}
          <Button
            title="Sign Out"
            variant="outline"
            size="lg"
            onPress={() => signOut()}
            icon={<LogOut size={18} color={colors.primary} />}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </ScrollView>

      {/* Plan Upgrade / Subscription Modal */}
      <Modal
        visible={showPaywallModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywallModal(false)}
      >
        <SubscriptionPaywall
          isDismissible
          onDismiss={() => setShowPaywallModal(false)}
          title="Upgrade or Renew Plan"
          subtitle="Choose the best plan for your bakery. All features activate immediately."
        />
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!deletingAccount) {
            setShowDeleteModal(false);
            setDeletePassword('');
            setDeleteError(null);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.deleteModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderRadius: borderRadius.xl,
              },
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <View
                style={[
                  styles.dangerIconCircle,
                  { backgroundColor: colors.dangerLight },
                ]}
              >
                <AlertTriangle size={28} color={colors.danger} />
              </View>
              <Text style={[typography.h2, { color: colors.text, marginTop: 12 }]}>
                Delete Account?
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, textAlign: 'center', marginTop: 6 },
                ]}
              >
                This action is permanent and cannot be undone. All your bakery data, catalog items,
                invoices, and active subscription will be permanently erased.
              </Text>
            </View>

            {/* User email reminder */}
            <View
              style={[
                styles.accountBadgeBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  borderRadius: borderRadius.sm,
                },
              ]}
            >
              <Mail size={14} color={colors.textMuted} />
              <Text style={[typography.captionBold, { color: colors.text, marginLeft: 6 }]}>
                {user?.email}
              </Text>
            </View>

            {/* Password Input */}
            <View style={{ marginTop: spacing.md, width: '100%' }}>
              <Input
                label="Confirm Your Password"
                placeholder="Enter current password"
                secureTextEntry
                value={deletePassword}
                onChangeText={(text) => {
                  setDeletePassword(text);
                  if (deleteError) setDeleteError(null);
                }}
                autoCapitalize="none"
                error={deleteError ?? undefined}
                leftIcon={<Lock size={16} color={colors.textMuted} />}
              />
            </View>

            {/* Modal Action Buttons */}
            <View style={styles.deleteModalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                disabled={deletingAccount}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={deletingAccount ? 'Deleting...' : 'Delete Permanently'}
                variant="danger"
                size="md"
                loading={deletingAccount}
                disabled={deletingAccount || deletePassword.trim().length === 0}
                onPress={handleDeleteAccount}
                icon={<Trash2 size={16} color="#FFFFFF" />}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateMessageBox: {
    padding: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    padding: 4,
    gap: 6,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardDivider: {
    height: 1,
    marginVertical: 18,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorSwatchesContainer: {
    paddingVertical: 4,
    gap: 10,
  },
  colorSwatchCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  deleteModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
});
