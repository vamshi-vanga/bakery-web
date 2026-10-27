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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Store,
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
  Edit3,
  KeyRound,
  ShieldCheck,
  Coffee,
  Layers,
  ChefHat,
  Save,
  Activity,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { BakeryScale } from '@/types/database';
import { BAKERY_SCALE_OPTIONS } from '@/data/telanganaBakeryMenu';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, ColorPresets, ThemeColorKey } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { haptic, getHapticsEnabled, setHapticsEnabled } from '@/utils/haptics';
import {
  checkForOTAUpdate,
  fetchAndApplyOTAUpdate,
  getUpdateMetadata,
} from '@/services/updatesService';
import { getSubscriptionStatus } from '@/services/subscriptionService';
import { SubscriptionPaywall } from '@/components/subscription/SubscriptionPaywall';
import { HeaderProfileButton } from '@/components/profile/HeaderProfileButton';
import { HeaderNotesButton } from '@/components/notes/HeaderNotesButton';

export default function SettingsScreen() {
  const { colors, spacing, typography, borderRadius, themeMode, themeColor, setThemeMode, setThemeColor } = useTheme();
  const router = useRouter();
  const { user, currentBakery, currentMembership, signOut, deleteAccount, fetchBakeryProfile } = useAuthStore();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Bakery Profile & Scale Edit States
  const [isEditingBakery, setIsEditingBakery] = useState(false);
  const [editBakeryName, setEditBakeryName] = useState(currentBakery?.name ?? '');
  const [editBakeryScale, setEditBakeryScale] = useState<BakeryScale>(currentBakery?.scale ?? 'medium');
  const [editPhone, setEditPhone] = useState(currentBakery?.phone ?? '');
  const [editAddress, setEditAddress] = useState(currentBakery?.address ?? '');
  const [savingBakery, setSavingBakery] = useState(false);

  // Password confirmation modal for saving bakery profile changes
  const [showBakeryPasswordModal, setShowBakeryPasswordModal] = useState(false);
  const [bakeryConfirmPassword, setBakeryConfirmPassword] = useState('');
  const [bakeryPasswordError, setBakeryPasswordError] = useState<string | null>(null);

  // Password Update States
  const [showChangePasswordSection, setShowChangePasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  // Reset Password via OTP States
  const [sendingResetOtp, setSendingResetOtp] = useState(false);

  // Delete account confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Vibrations / Haptic Feedback Toggle State
  const [vibrationsEnabled, setVibrationsEnabled] = useState(getHapticsEnabled());

  const handleToggleVibrations = async (val: boolean) => {
    setVibrationsEnabled(val);
    await setHapticsEnabled(val);
    if (val) {
      haptic.success();
    }
  };

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

  // 1. Open password confirmation modal to authorize bakery details change
  const handleInitiateSaveBakery = () => {
    if (!editBakeryName.trim()) {
      Alert.alert('Validation Error', 'Bakery name cannot be blank.');
      return;
    }
    setBakeryConfirmPassword('');
    setBakeryPasswordError(null);
    setShowBakeryPasswordModal(true);
  };

  // 2. Verify current password and apply bakery details + scale update
  const handleConfirmSaveBakery = async () => {
    if (!bakeryConfirmPassword.trim()) {
      setBakeryPasswordError('Please enter your password to confirm changes.');
      return;
    }
    if (!user?.email || !currentBakery?.id) return;

    setSavingBakery(true);
    setBakeryPasswordError(null);

    try {
      // Step A: Re-authenticate with current password to satisfy security constraint
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: bakeryConfirmPassword.trim(),
      });

      if (authError) {
        setBakeryPasswordError('Incorrect password. Verification failed.');
        haptic.error();
        setSavingBakery(false);
        return;
      }

      // Step B: Update bakery profile via RPC with direct table fallback
      const { error: rpcError } = await supabase.rpc('update_bakery_profile', {
        p_bakery_id: currentBakery.id,
        p_name: editBakeryName.trim(),
        p_scale: editBakeryScale,
        p_phone: editPhone.trim() || null,
        p_address: editAddress.trim() || null,
      });

      if (rpcError) {
        const { error: fallbackError } = await supabase
          .from('bakeries')
          .update({
            name: editBakeryName.trim(),
            scale: editBakeryScale,
            phone: editPhone.trim() || null,
            address: editAddress.trim() || null,
          })
          .eq('id', currentBakery.id);

        if (fallbackError) {
          setBakeryPasswordError(fallbackError.message);
          haptic.error();
          setSavingBakery(false);
          return;
        }
      }

      // Step C: Refresh auth store profile
      await fetchBakeryProfile();
      haptic.success();
      setShowBakeryPasswordModal(false);
      setIsEditingBakery(false);
      setBakeryConfirmPassword('');
      Alert.alert('Profile Updated', 'Bakery details and scale updated successfully.');
    } catch (err: any) {
      setBakeryPasswordError(err.message ?? 'Failed to update bakery profile.');
      haptic.error();
    } finally {
      setSavingBakery(false);
    }
  };

  // 3. Update account password with current password verification
  const handleUpdatePasswordDirect = async () => {
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);

    if (!currentPassword.trim()) {
      setPasswordErrorMessage('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMessage('New passwords do not match.');
      return;
    }
    if (!user?.email) return;

    setUpdatingPassword(true);
    try {
      // Step A: Verify current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword.trim(),
      });

      if (authError) {
        setPasswordErrorMessage('Incorrect current password.');
        haptic.error();
        setUpdatingPassword(false);
        return;
      }

      // Step B: Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordErrorMessage(updateError.message);
        haptic.error();
        setUpdatingPassword(false);
        return;
      }

      haptic.success();
      setPasswordSuccessMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePasswordSection(false);
      Alert.alert('Password Updated', 'Your account password has been changed successfully.');
    } catch (err: any) {
      setPasswordErrorMessage(err.message ?? 'Failed to update password.');
      haptic.error();
    } finally {
      setUpdatingPassword(false);
    }
  };

  // 4. Trigger recovery OTP email and navigate to 2-step Reset Password screen
  const handleTriggerResetPassword = async () => {
    if (!user?.email) return;

    Alert.alert(
      'Reset Password via Email OTP',
      `We will send a password recovery OTP code to ${user.email}. You will enter the OTP, click Next, and enter your new password two times.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Recovery OTP',
          onPress: async () => {
            setSendingResetOtp(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
                redirectTo: 'bakery://reset-password',
              });

              if (error) {
                Alert.alert('Error', error.message);
                return;
              }

              haptic.success();
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email: user.email },
              });
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to send recovery OTP.');
            } finally {
              setSendingResetOtp(false);
            }
          },
        },
      ]
    );
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HeaderNotesButton />
              <HeaderProfileButton />
            </View>
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

          {/* App Vibrations & Haptics Card */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Activity size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  App Vibrations & Haptics
                </Text>
              </View>
              <Switch
                value={vibrationsEnabled}
                onValueChange={handleToggleVibrations}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
              {vibrationsEnabled
                ? 'Tactile vibration feedback is ON for POS item taps, buttons, and notifications.'
                : 'All vibrations and haptic feedback in the app are muted.'}
            </Text>
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

          {/* Bakery Information & Scale Card */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Store size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  Bakery Profile & Scale
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {currentMembership && (
                  <Badge
                    label={currentMembership.role}
                    variant={currentMembership.role === 'owner' ? 'primary' : 'neutral'}
                  />
                )}
                {!isEditingBakery && currentMembership?.role === 'owner' && (
                  <TouchableOpacity
                    onPress={() => {
                      haptic.selection();
                      setEditBakeryName(currentBakery?.name ?? '');
                      setEditBakeryScale(currentBakery?.scale ?? 'medium');
                      setEditPhone(currentBakery?.phone ?? '');
                      setEditAddress(currentBakery?.address ?? '');
                      setIsEditingBakery(true);
                    }}
                    style={[
                      styles.editActionBtn,
                      { backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm },
                    ]}
                  >
                    <Edit3 size={14} color={colors.primary} />
                    <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 4 }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isEditingBakery ? (
              /* Inline Edit Mode */
              <View style={{ marginTop: spacing.xs }}>
                <View
                  style={[
                    styles.securityNoteBanner,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      borderRadius: borderRadius.sm,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <Lock size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                    Security Requirement: You must enter your current password to confirm changes to your bakery name and scale.
                  </Text>
                </View>

                <Input
                  label="Bakery Name *"
                  value={editBakeryName}
                  onChangeText={setEditBakeryName}
                  placeholder="e.g. KS Bakers"
                  leftIcon={<Store size={18} color={colors.textMuted} />}
                />

                {/* Scale Selector */}
                <View style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
                  <Text style={[typography.captionBold, { color: colors.text, marginBottom: spacing.xs }]}>
                    Bakery Scale *
                  </Text>
                  <View style={{ gap: spacing.xs }}>
                    {BAKERY_SCALE_OPTIONS.map((opt) => {
                      const isSelected = editBakeryScale === opt.scale;
                      return (
                        <TouchableOpacity
                          key={opt.scale}
                          activeOpacity={0.8}
                          onPress={() => {
                            haptic.selection();
                            setEditBakeryScale(opt.scale);
                          }}
                          style={[
                            styles.scaleOptionCard,
                            {
                              backgroundColor: isSelected ? colors.surfaceElevated : colors.surfaceSubtle,
                              borderColor: isSelected ? colors.primary : colors.borderSubtle,
                              borderRadius: borderRadius.md,
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {opt.scale === 'small' ? (
                              <Coffee size={18} color={isSelected ? colors.primary : colors.textMuted} />
                            ) : opt.scale === 'medium' ? (
                              <Layers size={18} color={isSelected ? colors.primary : colors.textMuted} />
                            ) : (
                              <ChefHat size={18} color={isSelected ? colors.primary : colors.textMuted} />
                            )}
                            <View style={{ marginLeft: 10, flex: 1 }}>
                              <Text style={[typography.bodyBold, { color: isSelected ? colors.primary : colors.text }]}>
                                {opt.title}
                              </Text>
                              <Text style={[typography.caption, { color: colors.textMuted }]}>
                                {opt.subtitle}
                              </Text>
                            </View>
                            <Badge
                              label={opt.badge}
                              variant={isSelected ? 'primary' : 'neutral'}
                            />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <Input
                  label="Phone Number"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 9876543210"
                  keyboardType="phone-pad"
                />

                <Input
                  label="Store Address"
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address, City"
                />

                <View style={styles.editActionRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="md"
                    onPress={() => {
                      haptic.light();
                      setIsEditingBakery(false);
                      if (currentBakery) {
                        setEditBakeryName(currentBakery.name ?? '');
                        setEditBakeryScale(currentBakery.scale ?? 'medium');
                        setEditPhone(currentBakery.phone ?? '');
                        setEditAddress(currentBakery.address ?? '');
                      }
                    }}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Save Changes"
                    variant="primary"
                    size="md"
                    onPress={handleInitiateSaveBakery}
                    icon={<Lock size={16} color="#FFFFFF" />}
                    style={{ flex: 1.4 }}
                  />
                </View>
              </View>
            ) : (
              /* View Only Mode */
              <View>
                <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Bakery Name</Text>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    {currentBakery?.name ?? '—'}
                  </Text>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Bakery Scale</Text>
                  <Badge
                    label={
                      currentBakery?.scale === 'small'
                        ? 'Small Scale (45 items)'
                        : currentBakery?.scale === 'large'
                        ? 'Large Scale (320+ items)'
                        : 'Medium Scale (80 items)'
                    }
                    variant="primary"
                  />
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
              </View>
            )}
          </Card>

          {/* Account Details & Security Management */}
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <ShieldCheck size={20} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                  Account & Security
                </Text>
              </View>
              <Badge label="Protected" variant="neutral" />
            </View>

            {/* User Email */}
            <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
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

            {/* Change Password Section */}
            <View style={{ marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.row}>
                  <Lock size={16} color={colors.primary} />
                  <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>
                    Account Password
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    haptic.selection();
                    setShowChangePasswordSection(!showChangePasswordSection);
                    setPasswordErrorMessage(null);
                    setPasswordSuccessMessage(null);
                  }}
                  style={[
                    styles.editActionBtn,
                    { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.sm },
                  ]}
                >
                  <Text style={[typography.captionBold, { color: colors.primary }]}>
                    {showChangePasswordSection ? 'Hide' : 'Change Password'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showChangePasswordSection && (
                <View
                  style={[
                    styles.changePasswordBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      borderRadius: borderRadius.md,
                      marginTop: spacing.sm,
                    },
                  ]}
                >
                  {passwordSuccessMessage && (
                    <View
                      style={[
                        styles.msgBanner,
                        {
                          backgroundColor: colors.successLight,
                          borderColor: colors.success,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Text style={[typography.captionBold, { color: colors.successText }]}>
                        {passwordSuccessMessage}
                      </Text>
                    </View>
                  )}

                  {passwordErrorMessage && (
                    <View
                      style={[
                        styles.msgBanner,
                        {
                          backgroundColor: colors.dangerLight,
                          borderColor: colors.danger,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Text style={[typography.captionBold, { color: colors.dangerText }]}>
                        {passwordErrorMessage}
                      </Text>
                    </View>
                  )}

                  <Input
                    label="Current Password *"
                    placeholder="Enter current password"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoCapitalize="none"
                    leftIcon={<Lock size={16} color={colors.textMuted} />}
                  />

                  <Input
                    label="New Password *"
                    placeholder="At least 6 characters"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    leftIcon={<Lock size={16} color={colors.textMuted} />}
                  />

                  <Input
                    label="Confirm New Password *"
                    placeholder="Re-enter new password"
                    secureTextEntry
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    autoCapitalize="none"
                    leftIcon={<Lock size={16} color={colors.textMuted} />}
                  />

                  <Button
                    title="Update Password"
                    variant="primary"
                    size="md"
                    loading={updatingPassword}
                    disabled={updatingPassword}
                    onPress={handleUpdatePasswordDirect}
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              )}
            </View>

            {/* Forgot / Reset Password via OTP (Direct link to 2-step flow) */}
            <View
              style={[
                styles.resetPasswordBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  borderRadius: borderRadius.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <KeyRound size={20} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    Forgot Password?
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    {"If you don't remember your password, request a recovery OTP. Enter the OTP code, click Next, then enter your new password two times."}
                  </Text>
                </View>
              </View>

              <Button
                title={sendingResetOtp ? 'Sending OTP...' : 'Reset Password (Send OTP)'}
                variant="outline"
                size="md"
                loading={sendingResetOtp}
                onPress={handleTriggerResetPassword}
                icon={<KeyRound size={16} color={colors.primary} />}
                style={{ marginTop: spacing.md }}
              />
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

      {/* Bakery Changes Password Confirmation Modal */}
      <Modal
        visible={showBakeryPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!savingBakery) {
            setShowBakeryPasswordModal(false);
            setBakeryConfirmPassword('');
            setBakeryPasswordError(null);
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
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Lock size={28} color={colors.primary} />
              </View>
              <Text style={[typography.h2, { color: colors.text, marginTop: 12 }]}>
                Confirm with Password
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, textAlign: 'center', marginTop: 6 },
                ]}
              >
                Security rule: Enter your account password to authorize changes to your bakery name and scale.
              </Text>
            </View>

            <View style={{ marginTop: spacing.sm, width: '100%' }}>
              <Input
                label="Current Password *"
                placeholder="Enter account password"
                secureTextEntry
                value={bakeryConfirmPassword}
                onChangeText={(text) => {
                  setBakeryConfirmPassword(text);
                  if (bakeryPasswordError) setBakeryPasswordError(null);
                }}
                autoCapitalize="none"
                error={bakeryPasswordError ?? undefined}
                leftIcon={<Lock size={16} color={colors.textMuted} />}
              />
            </View>

            <View style={styles.deleteModalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                disabled={savingBakery}
                onPress={() => {
                  setShowBakeryPasswordModal(false);
                  setBakeryConfirmPassword('');
                  setBakeryPasswordError(null);
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={savingBakery ? 'Verifying...' : 'Verify & Save'}
                variant="primary"
                size="md"
                loading={savingBakery}
                disabled={savingBakery || bakeryConfirmPassword.trim().length === 0}
                onPress={handleConfirmSaveBakery}
                icon={<Save size={16} color="#FFFFFF" />}
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
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  securityNoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  scaleOptionCard: {
    padding: 12,
    borderWidth: 1,
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  changePasswordBox: {
    padding: 14,
    borderWidth: 1,
  },
  resetPasswordBox: {
    padding: 14,
    borderWidth: 1,
  },
  msgBanner: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
});
