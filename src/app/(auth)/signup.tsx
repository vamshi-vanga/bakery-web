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
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, UserPlus, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function SignupScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.user && !data.session) {
        // Move directly to dedicated OTP verification screen
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email: email.trim() },
        });
      }
      // If auto-confirmed, the root layout will detect the session and navigate to setup
    } catch (err: any) {
      setErrorMessage(err.message ?? 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // First attempt type: 'signup', fallback to 'email'
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'signup',
      });

      if (error) {
        const secondAttempt = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: 'email',
        });
        data = secondAttempt.data;
        error = secondAttempt.error;
      }

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        setInfoMessage('Email verified successfully! Opening bakery setup...');
        // Root layout will reactively route to /(auth)/setup
      }
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to verify code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setInfoMessage('A fresh verification code has been dispatched to your inbox.');
      }
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to resend code.');
    } finally {
      setResending(false);
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
                backgroundColor: colors.primaryLight,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            {step === 'otp' ? (
              <ShieldCheck size={36} color={colors.primary} />
            ) : (
              <UserPlus size={36} color={colors.primary} />
            )}
          </View>
          <Text style={[typography.h1, { color: colors.text, marginTop: spacing.md }]}>
            {step === 'otp' ? 'Verify Email' : 'Create Account'}
          </Text>
          <Text style={[typography.subtitle, { color: colors.textMuted, marginTop: spacing.xs }]}>
            {step === 'otp'
              ? 'Enter the 6-digit code sent to your inbox'
              : 'Join as bakery owner or staff'}
          </Text>
        </View>

        {step === 'form' ? (
          /* Step 1: Registration Form */
          <Card style={styles.formCard}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
              Register
            </Text>

            {errorMessage && (
              <View
                style={[
                  styles.alertBox,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.dangerText }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <Input
              label="Email Address"
              placeholder="e.g. owner@artisanalbakery.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Mail size={20} color={colors.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon={<Lock size={20} color={colors.textMuted} />}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon={<Lock size={20} color={colors.textMuted} />}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              size="lg"
              style={{ marginTop: spacing.md }}
            />

            <View style={styles.footerRow}>
              <Text style={[typography.body, { color: colors.textMuted }]}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={[typography.bodyBold, { color: colors.primary }]}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={[styles.footerRow, { marginTop: spacing.sm }]}>
              <Text style={[typography.body, { color: colors.textMuted }]}>
                Already got a 6-digit code?{' '}
              </Text>
              <Link
                href={{
                  pathname: '/(auth)/verify-otp',
                  params: { email: email.trim() },
                }}
                asChild
              >
                <TouchableOpacity>
                  <Text style={[typography.bodyBold, { color: colors.primary }]}>Enter OTP</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Card>
        ) : (
          /* Step 2: OTP Code Verification */
          <Card style={styles.formCard}>
            <TouchableOpacity
              onPress={() => {
                setStep('form');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={16} color={colors.textMuted} />
              <Text style={[typography.captionBold, { color: colors.textMuted, marginLeft: 4 }]}>
                Change Email
              </Text>
            </TouchableOpacity>

            <Text style={[typography.h3, { color: colors.text, marginTop: 8, marginBottom: 4 }]}>
              Enter Verification Code
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              We sent a 6-digit OTP code to{' '}
              <Text style={{ fontWeight: 'bold', color: colors.text }}>{email.trim()}</Text>
            </Text>

            {infoMessage && (
              <View
                style={[
                  styles.alertBox,
                  {
                    backgroundColor: colors.infoLight,
                    borderColor: colors.info,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.infoText }]}>
                  {infoMessage}
                </Text>
              </View>
            )}

            {errorMessage && (
              <View
                style={[
                  styles.alertBox,
                  {
                    backgroundColor: colors.dangerLight,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.dangerText }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <Input
              label="Verification Code"
              placeholder="e.g. 12345678"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              leftIcon={<ShieldCheck size={20} color={colors.primary} />}
            />

            <Button
              title="Verify Code & Sign In"
              onPress={handleVerifyOtp}
              loading={verifying}
              size="lg"
              style={{ marginTop: spacing.md }}
            />

            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resending}
              style={styles.resendRow}
            >
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 6 }]}>
                {resending ? 'Resending Code...' : "Didn't receive code? Resend"}
              </Text>
            </TouchableOpacity>
          </Card>
        )}
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
    marginBottom: 24,
  },
  logoBadge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
  },
  alertBox: {
    padding: 12,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
});
