import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Store, Phone, MapPin, DollarSign, Globe, LogOut } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function SetupBakeryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const { fetchBakeryProfile, signOut } = useAuthStore();

  const [bakeryName, setBakeryName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSetup = async () => {
    if (!bakeryName.trim()) {
      setErrorMessage('Bakery name is required.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.rpc('setup_bakery', {
        p_bakery_name: bakeryName.trim(),
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
        p_currency: currency.trim() || 'INR',
        p_timezone: timezone.trim() || 'Asia/Kolkata',
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Reload bakery profile in auth store
      await fetchBakeryProfile();

      // Navigate to the main application
      router.replace('/(main)');
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to setup bakery.');
    } finally {
      setLoading(false);
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
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: colors.primaryLight,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Store size={36} color={colors.primary} />
          </View>
          <Text style={[typography.h1, { color: colors.text, marginTop: spacing.md }]}>
            Setup Your Bakery
          </Text>
          <Text
            style={[
              typography.subtitle,
              { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            {"Let's configure your store profile and financial preferences."}
          </Text>
        </View>

        {/* Card */}
        <Card style={{ marginTop: spacing.xl }}>
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

          <Input
            label="Bakery Name *"
            placeholder="e.g. Golden Crust Bakery"
            value={bakeryName}
            onChangeText={setBakeryName}
            leftIcon={<Store size={20} color={colors.textMuted} />}
          />

          <Input
            label="Phone Number"
            placeholder="e.g. +91 9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<Phone size={20} color={colors.textMuted} />}
            helperText="Printed on receipts and used for WhatsApp notifications"
          />

          <Input
            label="Store Address"
            placeholder="e.g. 12 Baker Street, Market Area"
            value={address}
            onChangeText={setAddress}
            leftIcon={<MapPin size={20} color={colors.textMuted} />}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Input
                label="Currency"
                placeholder="INR"
                value={currency}
                onChangeText={setCurrency}
                autoCapitalize="characters"
                leftIcon={<DollarSign size={20} color={colors.textMuted} />}
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Input
                label="Timezone"
                placeholder="Asia/Kolkata"
                value={timezone}
                onChangeText={setTimezone}
                leftIcon={<Globe size={20} color={colors.textMuted} />}
              />
            </View>
          </View>

          <Button
            title="Launch My Bakery"
            onPress={handleSetup}
            loading={loading}
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
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    padding: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
