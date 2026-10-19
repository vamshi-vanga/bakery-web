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
import { Link, useLocalSearchParams } from 'expo-router';
import { Mail, Lock, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { haptic } from '@/utils/haptics';

export default function LoginScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const params = useLocalSearchParams<{ email?: string; message?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(params.message ?? null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      haptic.error();
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    haptic.medium();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        haptic.error();
        setErrorMessage(error.message);
        return;
      }

      haptic.success();
      // Root layout will observe auth state and route automatically
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'An unexpected error occurred.');
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
        {/* Brand Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/app-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={[typography.h1, { color: colors.text, marginTop: spacing.sm }]}>
            BakeFlow POS
          </Text>
          <Text style={[typography.subtitle, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Smart Bakery POS & Management
          </Text>
        </View>

        {/* Form Card */}
        <Card style={{ marginTop: spacing.xl }}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Sign In
          </Text>

          {successMessage && (
            <View
              style={[
                styles.successBanner,
                {
                  backgroundColor: colors.successLight,
                  borderColor: colors.success,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <CheckCircle2 size={18} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[typography.captionBold, { color: colors.successText, flex: 1 }]}>
                {successMessage}
              </Text>
            </View>
          )}

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
            label="Email Address"
            placeholder="baker@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Mail size={20} color={colors.textMuted} />}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.textMuted} />}
          />

          <View style={styles.forgotPasswordContainer}>
            <Link
              href={{
                pathname: '/(auth)/forgot-password',
                params: { email: email.trim() },
              }}
              asChild
            >
              <TouchableOpacity
                onPress={() => haptic.selection()}
                activeOpacity={0.7}
                style={styles.forgotPasswordBtn}
              >
                <Text style={[typography.captionBold, { color: colors.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />

          <View style={[styles.footerRow, { marginTop: spacing.lg }]}>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              {"Don't have an account? "}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity onPress={() => haptic.selection()}>
                <Text style={[typography.bodyBold, { color: colors.primary }]}>
                  Create One
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
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
  brandLogo: {
    width: 76,
    height: 76,
    borderRadius: 18,
    marginBottom: 4,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  forgotPasswordBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
