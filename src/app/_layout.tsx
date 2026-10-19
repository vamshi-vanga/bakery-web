import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme';
import { initOfflineDatabase } from '@/services/offlineStorage';
import { AutoUpdateChecker } from '@/components/updates/AutoUpdateChecker';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, currentBakery, isLoading, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors, typography } = useTheme();

  useEffect(() => {
    // Initialize offline SQLite tables
    initOfflineDatabase().catch((e) => console.warn('SQLite init error:', e));
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    // Hide splash screen once initial auth check is done
    SplashScreen.hideAsync();

    const segList = segments as string[];
    const inAuthGroup = segList[0] === '(auth)';
    const isSetupScreen = segList[0] === '(auth)' && segList[1] === 'setup';
    const isPasswordResetScreen =
      segList[0] === '(auth)' &&
      (segList[1] === 'reset-password' || segList[1] === 'forgot-password');
    const inMainGroup = segList[0] === '(main)';

    if (!session) {
      // User is not signed in -> route to login if not already in auth
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // If user is actively on forgot/reset password screen, let them finish their password update
      if (isPasswordResetScreen) {
        return;
      }

      // User is signed in
      if (!currentBakery) {
        // User has no bakery profile -> must complete onboarding setup
        if (!isSetupScreen) {
          router.replace('/(auth)/setup');
        }
      } else {
        // User has a bakery -> must be in main app
        if (!inMainGroup) {
          router.replace('/(main)');
        }
      }
    }
  }, [session, currentBakery, isLoading, isInitialized, segments, router]);

  if (!isInitialized || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Image
          source={require('../../assets/images/app-logo.png')}
          style={{ width: 84, height: 84, borderRadius: 20, marginBottom: 16 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.subtitle, { color: colors.textMuted, marginTop: 12 }]}>
          Loading BakeFlow POS...
        </Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <AutoUpdateChecker />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
