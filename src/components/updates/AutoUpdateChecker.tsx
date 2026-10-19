import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  BackHandler,
  Image,
} from 'react-native';
import { DownloadCloud, LogOut } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { haptic } from '@/utils/haptics';
import { checkForOTAUpdate, fetchAndApplyOTAUpdate } from '@/services/updatesService';

export function AutoUpdateChecker() {
  const { colors, typography, borderRadius, spacing } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);

  const runUpdateCheck = async (force: boolean = false) => {
    // Only check once every 60 seconds to avoid spamming the update server
    const now = Date.now();
    if (!force && now - lastCheckTimeRef.current < 60000) {
      return;
    }

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      const res = await checkForOTAUpdate();
      if (res.isAvailable) {
        haptic.selection();
        setModalVisible(true);
      }
    } catch (err: any) {
      console.log('OTA auto-check background notice:', err?.message);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Check immediately after app mount
    const timer = setTimeout(() => {
      runUpdateCheck();
    }, 1500); // 1.5s delay to let app UI initialize smoothly

    // 2. Also check when app returns to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runUpdateCheck();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  // Handle Android hardware back button: close app when update modal is active
  useEffect(() => {
    if (!modalVisible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });

    return () => {
      backHandler.remove();
    };
  }, [modalVisible]);

  const handleApplyUpdate = async () => {
    haptic.selection();
    setDownloading(true);
    setErrorMessage(null);

    try {
      // 1. Download in background
      await fetchAndApplyOTAUpdate();
      setDownloadSuccess(true);
      haptic.success();
      // fetchAndApplyOTAUpdate automatically reloads the JS bundle on success
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to apply update. Please try again.');
      setDownloading(false);
    }
  };

  const handleCancelAndExit = () => {
    haptic.medium();
    // Closes the application automatically
    BackHandler.exitApp();
  };

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={modalVisible}
      onRequestClose={handleCancelAndExit}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.xl,
              borderColor: colors.borderSubtle,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 12,
            },
          ]}
        >
          {/* App Logo */}
          <Image
            source={require('../../../assets/images/app-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          {/* Title & Status */}
          <Text style={[typography.h2, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
            {downloadSuccess
              ? 'Restarting App...'
              : downloading
              ? 'Updating in Background...'
              : 'App Update Available'}
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: colors.textMuted,
                textAlign: 'center',
                marginTop: spacing.xs,
                lineHeight: 20,
                fontSize: 13.5,
              },
            ]}
          >
            {downloadSuccess
              ? 'Update complete! Restarting to load the newest version.'
              : downloading
              ? 'Downloading latest features and improvements. The app will restart automatically once finished.'
              : 'A new version of BakeFlow POS is ready. Tap Update to automatically download in the background and restart, or Cancel to close the app.'}
          </Text>

          {/* Error Message if any */}
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: '#FEE2E2', borderRadius: borderRadius.sm, marginTop: spacing.sm },
              ]}
            >
              <Text style={[typography.caption, { color: '#B91C1C' }]}>{errorMessage}</Text>
            </View>
          )}

          {/* Two Buttons: Update & Cancel */}
          <View style={{ marginTop: spacing.lg, width: '100%', gap: spacing.sm }}>
            {downloading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[typography.captionBold, { color: colors.primary, marginLeft: 8 }]}>
                  Applying update in background...
                </Text>
              </View>
            ) : (
              <>
                <Button
                  title="Update"
                  variant="primary"
                  size="lg"
                  onPress={handleApplyUpdate}
                  icon={<DownloadCloud size={18} color="#FFFFFF" />}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={handleCancelAndExit}
                  icon={<LogOut size={16} color={colors.textMuted} />}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 18,
    marginBottom: 4,
  },
  errorBox: {
    padding: 10,
    width: '100%',
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
