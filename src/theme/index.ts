import { useColorScheme } from 'react-native';
import { ThemeColors, Palette, ColorPresets, getThemeColors, ThemeColorKey } from './colors';
import { Spacing, BorderRadius, Shadows } from './spacing';
import { Typography } from './typography';
import { useThemeStore, ThemeMode } from '@/stores/themeStore';

export { Palette, ThemeColors, ColorPresets, Spacing, BorderRadius, Shadows, Typography };
export type { ThemeMode, ThemeColorKey };

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.themeMode);
  const themeColor = useThemeStore((s) => s.themeColor);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const setThemeColor = useThemeStore((s) => s.setThemeColor);

  const resolvedScheme = themeMode === 'auto' ? (systemColorScheme ?? 'light') : themeMode;
  const isDark = resolvedScheme === 'dark';
  const colors = getThemeColors(isDark ? 'dark' : 'light', themeColor);

  return {
    isDark,
    themeMode,
    themeColor,
    setThemeMode,
    setThemeColor,
    colors,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
    typography: Typography,
  };
}

