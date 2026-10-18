import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck, Mail, Lock, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { haptic } from '@/utils/haptics';

export default function ResetPasswordScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    params.email ? `Check ${params.email} for your 6-digit recovery code.` : null
  );
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 8);
    setOtpCode(cleaned);
    setErrorMessage(null);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      haptic.error();
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (otpCode.trim().length < 6) {
      haptic.error();
      setErrorMessage('Please enter the 6-digit recovery code.');
      return;
    }

    if (newPassword.length < 6) {
      haptic.error();
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      haptic.error();
      setErrorMessage('Passwords do not match.');
      return;
    }

    haptic.medium();
    setLoading(true);
    setErrorMessage(null);

    try {
      // Step 1: Verify the recovery OTP token
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'recovery',
      });

      if (otpError) {
        haptic.error();
        setErrorMessage(otpError.message);
        return;
      }

      // Step 2: Update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        haptic.error();
        setErrorMessage(updateError.message);
        return;
      }

      haptic.success();
      setIsSuccess(true);
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;

    haptic.selection();
    setResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        haptic.error();
        setErrorMessage(error.message);
      } else {
        haptic.success();
        setInfoMessage(`A fresh recovery code was sent to ${email.trim()}`);
        setResendCooldown(60);
      }
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to resend recovery code.');
    } finally {
      setResending(false);
    }
  };

  const handleGoToLogin = async () => {
    haptic.light();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.replace({
      pathname: '/(auth)/login',
      params: {
        email: email.trim(),
        message: 'Password reset successfully! Please sign in with your new password.',
      },
    });
  };

  const handleContinueToApp = () => {
    haptic.success();
    router.replace('/(main)');
  };

  // Render individual digit box
  const renderDigitBox = (index: number) => {
    const digit = otpCode[index] || '';
    const isCurrent = index === otpCode.length;
    const isFilled = Boolean(digit);

    return (
      <View
        key={index}
        style={[
          styles.digitBox,
          {
            borderColor: isCurrent
              ? colors.primary
              : isFilled
              ? colors.border
              : colors.borderSubtle,
            backgroundColor: isCurrent
              ? colors.primaryLight
              : isFilled
              ? colors.surfaceElevated
              : colors.surface,
            borderRadius: borderRadius.sm,
          },
        ]}
      >
        <Text
          style={[
            styles.digitText,
            {
              color: isFilled ? colors.text : colors.textMuted,
            },
          ]}
        >
          {digit}
        </Text>
      </View>
    );
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
                  backgroundColor: isSuccess ? colors.successLight : colors.primaryLight,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              {isSuccess ? (
                <CheckCircle2 size={40} color={colors.success} />
              ) : (
                <ShieldCheck size={40} color={colors.primary} />
              )}
            </View>
            <Text style={[typography.h1, { color: colors.text, marginTop: spacing.md }]}>
              {isSuccess ? 'Password Reset!' : 'Set New Password'}
            </Text>
            <Text
              style={[
                typography.subtitle,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              {isSuccess
                ? 'Your new credentials are saved. You are ready to go!'
                : 'Enter your 6-digit recovery code and choose a new password.'}
            </Text>
          </View>

          {isSuccess ? (
            /* Success Card */
            <Card style={styles.card}>
              <View style={styles.successContent}>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
                  ]}
                >
                  Your account password has been safely updated. You can proceed directly into the POS or sign in fresh.
                </Text>

                <Button
                  title="Continue to POS"
                  onPress={handleContinueToApp}
                  size="lg"
                  style={{ width: '100%', marginBottom: spacing.md }}
                />

                <Button
                  title="Sign In Again"
                  variant="outline"
                  onPress={handleGoToLogin}
                  size="lg"
                  style={{ width: '100%' }}
                />
              </View>
            </Card>
          ) : (
            /* Reset Form Card */
            <Card style={styles.card}>
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
                  <Text style={[typography.caption, { color: colors.infoText, textAlign: 'center' }]}>
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
                  <Text style={[typography.caption, { color: colors.dangerText, textAlign: 'center' }]}>
                    {errorMessage}
                  </Text>
                </View>
              )}

              {/* Email Address */}
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

              {/* 6-digit Code */}
              <Text style={[typography.captionBold, { color: colors.text, marginBottom: spacing.xs }]}>
                6-Digit Recovery Code
              </Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => inputRef.current?.focus()}
                style={styles.boxesContainer}
              >
                <View style={styles.boxesRow}>
                  {[0, 1, 2, 3, 4, 5].map(renderDigitBox)}
                </View>
              </TouchableOpacity>

              {/* Hidden text input capturing OTP */}
              <TextInput
                ref={inputRef}
                value={otpCode}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.hiddenInput}
                caretHidden
              />

              {/* New Password */}
              <Input
                label="New Password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={colors.textMuted} />}
              />

              {/* Confirm Password */}
              <Input
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={colors.textMuted} />}
              />

              <Button
                title={loading ? 'Updating Password...' : 'Reset & Update Password'}
                onPress={handleResetPassword}
                loading={loading}
                disabled={otpCode.length < 6 || !newPassword || loading}
                size="lg"
                style={{ marginTop: spacing.sm }}
              />

              {/* Resend Action */}
              <View style={styles.resendContainer}>
                {resendCooldown > 0 ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Resend code in <Text style={{ fontWeight: 'bold' }}>{resendCooldown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending}
                    style={styles.resendButton}
                  >
                    <RefreshCw size={14} color={colors.primary} />
                    <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 6 }]}>
                      {resending ? 'Sending...' : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Back to Login */}
              <View style={styles.footerRow}>
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
    marginBottom: 16,
  },
  logoBadge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  alertBox: {
    padding: 12,
    borderWidth: 1,
  },
  boxesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  boxesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  digitBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 20,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#33333333',
    paddingTop: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
