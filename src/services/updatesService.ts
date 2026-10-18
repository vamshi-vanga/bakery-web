import * as Updates from 'expo-updates';

export interface UpdateCheckResult {
  isAvailable: boolean;
  isDevMode: boolean;
  message?: string;
  manifest?: any;
  error?: string;
}

/**
 * Check if a new Over-The-Air (OTA) update has been published.
 */
export async function checkForOTAUpdate(): Promise<UpdateCheckResult> {
  // In development mode (Expo Go or Metro dev server), Updates API is disabled
  if (!Updates.isEnabled) {
    return {
      isAvailable: false,
      isDevMode: true,
      message: 'OTA updates are active on installed APK release builds.',
    };
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      return {
        isAvailable: true,
        isDevMode: false,
        manifest: update.manifest,
        message: 'A new update is available for download.',
      };
    } else {
      return {
        isAvailable: false,
        isDevMode: false,
        message: 'You are on the latest bakery version.',
      };
    }
  } catch (err: any) {
    return {
      isAvailable: false,
      isDevMode: false,
      error: err.message ?? 'Failed to check for updates.',
    };
  }
}

/**
 * Download the published bundle and restart the app immediately.
 */
export async function fetchAndApplyOTAUpdate(): Promise<void> {
  if (!Updates.isEnabled) {
    throw new Error('Updates are disabled in development mode.');
  }

  // Download the bundle in the background
  await Updates.fetchUpdateAsync();

  // Instantly reload JavaScript bundle into the new code
  await Updates.reloadAsync();
}

/**
 * Get current running update metadata for the settings screen.
 */
export function getUpdateMetadata() {
  return {
    isEnabled: Updates.isEnabled,
    channel: Updates.channel ?? 'production',
    runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '1.0.0',
    updateId: Updates.updateId ?? 'bundled-base',
    createdAt: Updates.createdAt ? Updates.createdAt.toLocaleString() : 'Pre-packaged',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
