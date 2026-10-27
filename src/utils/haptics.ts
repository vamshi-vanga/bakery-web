import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_STORAGE_KEY = '@bakeflow_haptics_enabled';

// In-memory state (defaults to true)
let _isHapticsEnabled = true;

// Preload setting from AsyncStorage
AsyncStorage.getItem(HAPTICS_STORAGE_KEY)
  .then((val) => {
    if (val !== null) {
      _isHapticsEnabled = val === 'true';
    }
  })
  .catch(() => {});

/**
 * Returns current vibration / haptics enabled status.
 */
export const getHapticsEnabled = (): boolean => _isHapticsEnabled;

/**
 * Updates vibration / haptics enabled status and persists to AsyncStorage.
 */
export const setHapticsEnabled = async (enabled: boolean): Promise<void> => {
  _isHapticsEnabled = enabled;
  try {
    await AsyncStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
  } catch (err) {
    console.warn('Failed to save haptics setting:', err);
  }
};

/**
 * Safe haptic feedback wrapper with toggle support and fallback for platforms that do not support it.
 */
export const haptic = {
  /**
   * Crisp light tap - ideal for product selection, stepper increment/decrement
   */
  light: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore if device does not support haptics
    }
  },

  /**
   * Medium impact - ideal for action confirmations, modal opens, category switch
   */
  medium: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }
  },

  /**
   * Heavy impact - ideal for deletes, voids, overrides
   */
  heavy: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Ignore
    }
  },

  /**
   * Selection tick - ideal for tab changes, category pills, mode switch
   */
  selection: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignore
    }
  },

  /**
   * Success notification - order completion, successful cloud sync
   */
  success: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }
  },

  /**
   * Warning notification - clearing cart, low stock alert
   */
  warning: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Ignore
    }
  },

  /**
   * Error notification - failed submission, validation error
   */
  error: async () => {
    if (!_isHapticsEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore
    }
  },
};
