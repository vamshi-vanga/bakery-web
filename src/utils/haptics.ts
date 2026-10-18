import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Safe haptic feedback wrapper with fallback for platforms that do not support it.
 */
export const haptic = {
  /**
   * Crisp light tap - ideal for product selection, stepper increment/decrement
   */
  light: async () => {
    if (Platform.OS === 'web') return;
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
    if (Platform.OS === 'web') return;
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
    if (Platform.OS === 'web') return;
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
    if (Platform.OS === 'web') return;
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
    if (Platform.OS === 'web') return;
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
    if (Platform.OS === 'web') return;
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
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore
    }
  },
};
