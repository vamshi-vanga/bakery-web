import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Store,
  Phone,
  MapPin,
  LogOut,
  Check,
  Sparkles,
  Layers,
  ChefHat,
  Coffee,
  CheckSquare,
  Square,
  PackageCheck,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { haptic } from '@/utils/haptics';
import {
  BakeryScale,
  BAKERY_SCALE_OPTIONS,
  getTelanganaMenuItems,
} from '@/data/telanganaBakeryMenu';

export default function SetupBakeryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const { fetchBakeryProfile, signOut } = useAuthStore();

  const [bakeryName, setBakeryName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency] = useState('INR');
  const [timezone] = useState('Asia/Kolkata');
  const [scale, setScale] = useState<BakeryScale>('medium');
  const [preloadMenu, setPreloadMenu] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSetup = async () => {
    if (!bakeryName.trim()) {
      haptic.error();
      setErrorMessage('Bakery name is required.');
      return;
    }

    haptic.medium();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Setting up your bakery profile...');

    try {
      // 1. Create bakery and owner membership via setup_bakery RPC
      const { data, error } = await supabase.rpc('setup_bakery', {
        p_bakery_name: bakeryName.trim(),
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
        p_currency: currency.trim() || 'INR',
        p_timezone: timezone.trim() || 'Asia/Kolkata',
        p_scale: scale,
      });

      if (error) {
        haptic.error();
        setErrorMessage(error.message);
        return;
      }

      const newBakeryId = (data as any)?.bakery_id;

      // 2. Pre-load Telangana Common Menu if selected
      if (preloadMenu && newBakeryId) {
        setStatusMessage(`Preloading common Telangana menu for ${scale} scale bakery...`);
        const itemsToSeed = getTelanganaMenuItems(scale);

        try {
          await supabase.rpc('preload_bakery_menu', {
            p_bakery_id: newBakeryId,
            p_items: itemsToSeed,
          });
        } catch (seedErr) {
          console.warn('Preload menu warning:', seedErr);
        }
      }

      setStatusMessage('Finalizing setup...');
      // 3. Reload bakery profile in auth store
      await fetchBakeryProfile();

      haptic.success();
      // 4. Navigate to the main application
      router.replace('/(main)');
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to setup bakery.');
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const getScaleIcon = (scaleKey: BakeryScale) => {
    switch (scaleKey) {
      case 'small':
        return <Coffee size={22} color={scale === 'small' ? colors.primary : colors.textMuted} />;
      case 'medium':
        return <Layers size={22} color={scale === 'medium' ? colors.primary : colors.textMuted} />;
      case 'large':
        return <ChefHat size={22} color={scale === 'large' ? colors.primary : colors.textMuted} />;
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/app-logo.png')}
              style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 8 }}
              resizeMode="contain"
            />
            <Text style={[typography.h1, { color: colors.text, marginTop: spacing.xs }]}>
              Setup Your Bakery
            </Text>
            <Text
              style={[
                typography.subtitle,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Choose your bakery scale and configure your store catalog.
            </Text>
          </View>

          {/* Form Card */}
          <Card style={{ marginTop: spacing.lg }}>
            {errorMessage && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.sm,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.dangerText }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {statusMessage && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.infoLight,
                    borderColor: colors.info,
                    borderRadius: borderRadius.sm,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.infoText }]}>
                  {statusMessage}
                </Text>
              </View>
            )}

            <Input
              label="Bakery Name *"
              placeholder="e.g. KS Bakers, Karachi Bakery"
              value={bakeryName}
              onChangeText={setBakeryName}
              leftIcon={<Store size={20} color={colors.textMuted} />}
            />

            {/* Bakery Scale Selection */}
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                <Text style={[typography.bodyBold, { color: colors.text }]}>
                  Bakery Scale *
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Select your store size
                </Text>
              </View>

              <View style={{ gap: spacing.sm }}>
                {BAKERY_SCALE_OPTIONS.map((opt) => {
                  const isSelected = scale === opt.scale;
                  return (
                    <TouchableOpacity
                      key={opt.scale}
                      activeOpacity={0.8}
                      onPress={() => {
                        haptic.selection();
                        setScale(opt.scale);
                      }}
                      style={[
                        styles.scaleCard,
                        {
                          backgroundColor: isSelected ? colors.surfaceElevated : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          borderRadius: borderRadius.md,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                        <View
                          style={[
                            styles.scaleIconBox,
                            {
                              backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                              borderRadius: borderRadius.sm,
                            },
                          ]}
                        >
                          {getScaleIcon(opt.scale)}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                            <Text style={[typography.bodyBold, { color: isSelected ? colors.primary : colors.text, flexShrink: 1 }]}>
                              {opt.title}
                            </Text>
                            <Badge
                              label={opt.badge}
                              variant={isSelected ? 'primary' : 'neutral'}
                            />
                          </View>
                          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                            {opt.description}
                          </Text>
                          <Text style={[typography.captionBold, { color: colors.text, marginTop: 4 }]}>
                            Includes: <Text style={{ fontWeight: 'normal', color: colors.textMuted }}>{opt.popularItems.join(', ')}</Text>
                          </Text>
                        </View>
                      </View>
                      <View style={{ marginLeft: 8, alignSelf: 'center', flexShrink: 0 }}>
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primary : 'transparent',
                            },
                          ]}
                        >
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Preload Telangana Menu Checkbox & Option */}
            <View
              style={[
                styles.preloadBox,
                {
                  backgroundColor: preloadMenu ? colors.surfaceElevated : colors.surfaceSubtle,
                  borderColor: preloadMenu ? colors.primary : colors.borderSubtle,
                  borderRadius: borderRadius.md,
                  borderWidth: preloadMenu ? 1.5 : 1,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  haptic.selection();
                  setPreloadMenu(!preloadMenu);
                }}
                style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}
              >
                <View style={{ marginTop: 2, marginRight: 10 }}>
                  {preloadMenu ? (
                    <CheckSquare size={22} color={colors.primary} />
                  ) : (
                    <Square size={22} color={colors.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Sparkles size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[typography.bodyBold, { color: colors.text }]}>
                      Pre-load Telangana Bakery Menu
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, lineHeight: 18 }]}>
                    Automatically populate your catalog with authentic Telangana bakery items, prices, and categories (Puffs, Milk Breads, Osmania Biscuits, Pastries, Cool Cakes & Burgers) sourced directly from local bakery menus.
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.skipRow, { borderTopColor: colors.borderSubtle }]}>
                <TouchableOpacity
                  onPress={() => {
                    haptic.selection();
                    setPreloadMenu(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      typography.captionBold,
                      {
                        color: !preloadMenu ? colors.primary : colors.textMuted,
                        textDecorationLine: !preloadMenu ? 'underline' : 'none',
                      },
                    ]}
                  >
                    {!preloadMenu ? '✓ Menu Preload Skipped (Blank Catalog)' : 'Skip Menu Preload'}
                  </Text>
                </TouchableOpacity>
                {preloadMenu && (
                  <Badge
                    label={`${getTelanganaMenuItems(scale).length} Items Ready`}
                    variant="primary"
                  />
                )}
              </View>
            </View>

            <Input
              label="Phone Number"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={colors.textMuted} />}
              helperText="Printed on receipts and used for customer notifications"
            />

            <Input
              label="Store Address"
              placeholder="e.g. 12 Market Street, Hyderabad"
              value={address}
              onChangeText={setAddress}
              leftIcon={<MapPin size={20} color={colors.textMuted} />}
            />

            <Button
              title={loading ? 'Configuring Store...' : 'Launch My Bakery'}
              onPress={handleSetup}
              loading={loading}
              icon={<PackageCheck size={18} color="#FFFFFF" />}
              style={{ marginTop: spacing.md }}
            />

            <TouchableOpacity
              onPress={() => signOut()}
              style={[styles.signOutRow, { marginTop: spacing.xl }]}
              activeOpacity={0.7}
            >
              <LogOut size={16} color={colors.textMuted} />
              <Text style={[typography.captionBold, { color: colors.textMuted, marginLeft: 6 }]}>
                Sign out of this account
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  errorBanner: {
    padding: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  scaleCard: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scaleIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  preloadBox: {
    padding: 14,
  },
  skipRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
