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
import {
  ShieldCheck,
  Mail,
  Lock,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { haptic } from '@/utils/haptics';

export default function ResetPasswordScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  // Wizard step: 1 = Enter OTP -> Click Next, 2 = Enter New Password twice
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState(params.email ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    params.email ? `Check ${params.email} for your recovery code.` : null
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

  // Step 1: Verify OTP and proceed to Step 2
  const handleVerifyOtp = async () => {
    if (!email.trim()) {
      haptic.error();
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (otpCode.trim().length < 6) {
      haptic.error();
      setErrorMessage('Please enter the complete 6 or 8-digit recovery code.');
      return;
    }

    haptic.medium();
    setLoading(true);
    setErrorMessage(null);

    try {
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

      haptic.success();
      setInfoMessage('Recovery code verified successfully! Now set your new password.');
      setStep(2);
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to verify recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set New Password
  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      haptic.error();
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      haptic.error();
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    haptic.medium();
    setLoading(true);
    setErrorMessage(null);

    try {
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
      setErrorMessage(err.message ?? 'Failed to update password.');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'bakery://reset-password',
      });

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

  const renderDigitBoxes = () => {
    return (
      <View style={styles.boxesWrapper}>
        <View style={styles.groupContainer}>
          {[0, 1, 2, 3].map(renderDigitBox)}
        </View>
        <View style={styles.separator}>
          <Text style={[styles.separatorText, { color: colors.textMuted }]}>–</Text>
        </View>
        <View style={styles.groupContainer}>
          {[4, 5, 6, 7].map(renderDigitBox)}
        </View>
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
              ) : step === 1 ? (
                <KeyRound size={40} color={colors.primary} />
              ) : (
                <ShieldCheck size={40} color={colors.primary} />
              )}
            </View>

            <Text style={[typography.h1, { color: colors.text, marginTop: spacing.md }]}>
              {isSuccess
                ? 'Password Reset Complete!'
                : step === 1
                ? 'Enter Recovery OTP'
                : 'Create New Password'}
            </Text>

            <Text
              style={[
                typography.subtitle,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              {isSuccess
                ? 'Your password has been successfully updated.'
                : step === 1
                ? 'Enter the verification code sent to your email, then click Next.'
                : 'Enter your new password two times to confirm.'}
            </Text>

            {!isSuccess && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 8 }}>
                <Badge
                  label={step === 1 ? 'Step 1 of 2: Enter OTP' : 'Step 1: Verified ✓'}
                  variant={step === 1 ? 'primary' : 'success'}
                />
                <ArrowRight size={14} color={colors.textMuted} />
                <Badge
                  label="Step 2 of 2: New Password"
                  variant={step === 2 ? 'primary' : 'neutral'}
                />
              </View>
            )}
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
                  Your account password has been safely updated. You can proceed directly into BakeFlow POS or sign in again.
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
          ) : step === 1 ? (
            /* Step 1 Card: Enter OTP & Click Next */
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

              {/* Recovery Code */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                <Text style={[typography.captionBold, { color: colors.text }]}>
                  Recovery Code (OTP) *
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {otpCode.length > 0 ? `${otpCode.length}/8 digits` : '6 or 8 digits'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={1}
                onPress={() => inputRef.current?.focus()}
                style={styles.boxesContainer}
              >
                {renderDigitBoxes()}
              </TouchableOpacity>

              {/* Hidden text input capturing OTP */}
              <TextInput
                ref={inputRef}
                value={otpCode}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={8}
                style={styles.hiddenInput}
                caretHidden
                autoFocus
              />

              <Button
                title={loading ? 'Verifying OTP...' : 'Next'}
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otpCode.length < 6 || loading}
                size="lg"
                icon={<ArrowRight size={18} color="#FFFFFF" />}
                style={{ marginTop: spacing.md }}
              />

              {/* Resend Action */}
              <View style={styles.resendContainer}>
                {resendCooldown > 0 ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Resend OTP in <Text style={{ fontWeight: 'bold' }}>{resendCooldown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending}
                    style={styles.resendButton}
                  >
                    <RefreshCw size={14} color={colors.primary} />
                    <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 6 }]}>
                      {resending ? 'Sending OTP...' : 'Resend OTP Code'}
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
          ) : (
            /* Step 2 Card: Enter New Password Two Times */
            <Card style={styles.card}>
              {infoMessage && (
                <View
                  style={[
                    styles.alertBox,
                    {
                      backgroundColor: colors.successLight,
                      borderColor: colors.success,
                      borderRadius: borderRadius.md,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.successText, textAlign: 'center' }]}>
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

              {/* New Password */}
              <Input
                label="New Password *"
                placeholder="At least 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={colors.textMuted} />}
                helperText="Use a strong password with letters and numbers"
              />

              {/* Confirm Password */}
              <Input
                label="Confirm New Password *"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                leftIcon={<Lock size={20} color={colors.textMuted} />}
                helperText="Must match your new password exactly"
              />

              <Button
                title={loading ? 'Updating Password...' : 'Save New Password'}
                onPress={handleUpdatePassword}
                loading={loading}
                disabled={!newPassword || !confirmPassword || loading}
                size="lg"
                style={{ marginTop: spacing.sm }}
              />

              <TouchableOpacity
                onPress={() => {
                  haptic.light();
                  setStep(1);
                  setErrorMessage(null);
                }}
                style={[styles.backRow, { marginTop: spacing.lg, alignSelf: 'center' }]}
              >
                <ArrowLeft size={16} color={colors.textMuted} />
                <Text style={[typography.captionBold, { color: colors.textMuted, marginLeft: 6 }]}>
                  Back to OTP Verification
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
    marginBottom: 8,
  },
  logoBadge: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginTop: 16,
  },
  alertBox: {
    padding: 12,
    borderWidth: 1,
  },
  boxesContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  boxesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  separator: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  digitBox: {
    width: 38,
    height: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  footerRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
