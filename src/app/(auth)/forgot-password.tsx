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
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { haptic } from '@/utils/haptics';

export default function ForgotPasswordScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendReset = async () => {
    if (!email.trim()) {
      haptic.error();
      setErrorMessage('Please enter your email address.');
      return;
    }

    haptic.medium();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        haptic.error();
        setErrorMessage(error.message);
        return;
      }

      haptic.success();
      setSuccessMessage(`A 6-digit recovery code has been sent to ${email.trim()}`);

      // Auto-navigate to reset password screen after a brief delay
      setTimeout(() => {
        router.push({
          pathname: '/(auth)/reset-password',
          params: { email: email.trim() },
        });
      }, 1200);
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to send recovery email.');
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
            <View
              style={[
                styles.logoBadge,
                {
                  backgroundColor: successMessage ? colors.successLight : colors.primaryLight,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              {successMessage ? (
                <CheckCircle2 size={36} color={colors.success} />
              ) : (
                <KeyRound size={36} color={colors.primary} />
              )}
            </View>
            <Text style={[typography.h1, { color: colors.text, marginTop: spacing.md }]}>
              {successMessage ? 'Check Your Email' : 'Reset Password'}
            </Text>
            <Text
              style={[
                typography.subtitle,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              {successMessage
                ? 'We sent a 6-digit code to reset your account password.'
                : 'Enter your registered email and we will send a 6-digit recovery code.'}
            </Text>
          </View>

          {/* Form Card */}
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
              Account Recovery
            </Text>

            {successMessage && (
              <View
                style={[
                  styles.banner,
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
                  styles.banner,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.md,
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

            <Button
              title={loading ? 'Sending Code...' : 'Send Recovery Code'}
              onPress={handleSendReset}
              loading={loading}
              size="lg"
              style={{ marginTop: spacing.sm }}
            />

            <View style={[styles.footerRow, { marginTop: spacing.lg }]}>
              <Text style={[typography.body, { color: colors.textMuted }]}>
                Already have a reset code?{' '}
              </Text>
              <Link
                href={{
                  pathname: '/(auth)/reset-password',
                  params: { email: email.trim() },
                }}
                asChild
              >
                <TouchableOpacity onPress={() => haptic.selection()}>
                  <Text style={[typography.bodyBold, { color: colors.primary }]}>
                    Enter Code
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={[styles.footerRow, { marginTop: spacing.md }]}>
              <TouchableOpacity
                onPress={() => {
                  haptic.light();
                  router.replace('/(auth)/login');
                }}
                style={styles.backRow}
              >
                <ArrowLeft size={16} color={colors.textMuted} />
                <Text style={[typography.body, { color: colors.textMuted, marginLeft: 6 }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
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
  logoBadge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
});
