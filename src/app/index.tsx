import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme';

export default function IndexScreen() {
  const { colors } = useTheme();
  const { session, currentBakery, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    if (!session) {
      router.replace('/(auth)/login');
    } else if (!currentBakery) {
      router.replace('/(auth)/setup');
    } else {
      router.replace('/(main)');
    }
  }, [session, currentBakery, isInitialized, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

