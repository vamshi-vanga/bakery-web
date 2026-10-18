import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColorKey } from '@/theme/colors';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type { ThemeColorKey };

const THEME_STORAGE_KEY = 'bakery_theme_mode';
const COLOR_STORAGE_KEY = 'bakery_theme_color';

interface ThemeState {
  themeMode: ThemeMode;
  themeColor: ThemeColorKey;
  isHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setThemeColor: (color: ThemeColorKey) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'auto',
  themeColor: 'purple',
  isHydrated: false,

  setThemeMode: async (mode: ThemeMode) => {
    // 1. Synchronously update state so the UI transitions instantly with zero flicker
    set({ themeMode: mode });

    // 2. Persist to storage
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme mode to storage:', e);
    }
  },

  setThemeColor: async (color: ThemeColorKey) => {
    // 1. Synchronously update state so all buttons, tabs, accents re-render instantly
    set({ themeColor: color });

    // 2. Persist to storage
    try {
      await AsyncStorage.setItem(COLOR_STORAGE_KEY, color);
    } catch (e) {
      console.warn('Failed to save theme color to storage:', e);
    }
  },

  initializeTheme: async () => {
    try {
      const [storedMode, storedColor] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(COLOR_STORAGE_KEY),
      ]);

      const validMode = (storedMode === 'light' || storedMode === 'dark' || storedMode === 'auto')
        ? storedMode
        : 'auto';

      const validColors: ThemeColorKey[] = ['purple', 'blue', 'green', 'red', 'amber', 'pink', 'teal'];
      const validColor = (storedColor && validColors.includes(storedColor as ThemeColorKey))
        ? (storedColor as ThemeColorKey)
        : 'purple';

      set({
        themeMode: validMode,
        themeColor: validColor,
        isHydrated: true,
      });
    } catch (e) {
      console.warn('Failed to load theme settings from storage:', e);
      set({ isHydrated: true });
    }
  },
}));

// Kick off theme hydration immediately on module load
useThemeStore.getState().initializeTheme();

