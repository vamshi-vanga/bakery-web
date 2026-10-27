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
import { ShieldCheck, Mail, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function VerifyOtpScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    params.email ? `We sent an 8-digit verification code to ${params.email}` : null
  );

  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus the input on screen mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const isVerifyingRef = useRef(false);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify ?? otpCode).trim();
    if (!email.trim()) {
      setErrorMessage('Please provide your email address.');
      return;
    }

    if (code.length < 6) {
      setErrorMessage('Please enter your complete 8-digit verification code.');
      return;
    }

    // Guard against duplicate concurrent requests (which consumes the single-use OTP twice)
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    setVerifying(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'signup',
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        setIsSuccess(true);
        setInfoMessage('Email verified successfully! Opening your bakery...');
        // RootNavigator in _layout.tsx will detect the active session and route to /(auth)/setup
      }
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to verify code.');
    } finally {
      setVerifying(false);
      isVerifyingRef.current = false;
    }
  };

  const handleOtpChange = (text: string) => {
    // Only accept numeric digits up to 8
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 8);
    setOtpCode(cleaned);
    setErrorMessage(null);

    // Auto-verify when all 8 digits are typed
    if (cleaned.length === 8 && !isVerifyingRef.current) {
      handleVerify(cleaned);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return;

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
        setInfoMessage(`A fresh verification code has been dispatched to ${email.trim()}`);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to resend code.');
    } finally {
      setResending(false);
    }
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
        {/* Header Icon */}
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
            {isSuccess ? 'Verified!' : 'Email Verification'}
          </Text>
          <Text
            style={[
              typography.subtitle,
              { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            {isSuccess
              ? 'Your account is ready. Entering setup...'
              : 'Enter the 8-digit OTP code sent to your email'}
          </Text>
        </View>

        <Card style={styles.card}>
          {/* Email input if missing or needs editing */}
          <Input
            label="Email Address"
            placeholder="e.g. baker@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Mail size={20} color={colors.textMuted} />}
          />

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

          {/* Interactive Code Display */}
          <Text style={[typography.captionBold, { color: colors.text, marginBottom: spacing.xs }]}>
            Verification Code
          </Text>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.boxesContainer}
          >
            {renderDigitBoxes()}
          </TouchableOpacity>

          {/* Hidden Numeric Input that captures keypresses */}
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
            title={verifying ? 'Verifying...' : 'Verify & Continue'}
            onPress={() => handleVerify()}
            loading={verifying}
            disabled={otpCode.length < 6 || verifying}
            size="lg"
            style={{ marginTop: spacing.lg }}
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

          {/* Back Navigation */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/signup')}
              style={styles.backRow}
            >
              <ArrowLeft size={16} color={colors.textMuted} />
              <Text style={[typography.body, { color: colors.textMuted, marginLeft: 6 }]}>
                Back to Sign Up
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
    marginBottom: 20,
  },
  logoBadge: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
  },
  alertBox: {
    padding: 12,
    borderWidth: 1,
  },
  boxesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  boxesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  separator: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorText: {
    fontSize: 18,
    fontWeight: '700',
  },
  digitBox: {
    width: 32,
    height: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 18,
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
    marginTop: 18,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333333',
    paddingTop: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
