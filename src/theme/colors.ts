export const Palette = {
  // Electric Royal Violet / Purple (Inspired by minimalist admin panel reference)
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C5CFC', // Core reference primary
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  // Coral / Peach Accent
  peach: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#FF7A59',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  // Slate Modern Clean Neutrals
  slate: {
    25: '#FAFBFD',
    50: '#F6F8FC',
    100: '#EEF1F6',
    200: '#E2E6EF',
    300: '#D0D6E2',
    400: '#9EA6B8',
    500: '#6E778B',
    600: '#4D5567',
    700: '#343B4B',
    800: '#212633',
    850: '#1A1E29',
    900: '#141722',
    950: '#0C0E14',
  },
  // Functional Status Colors
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  crimson: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
} as const;

export type ThemeColorKey = 'purple' | 'blue' | 'green' | 'red' | 'amber' | 'pink' | 'teal';

export interface ColorPresetDef {
  key: ThemeColorKey;
  name: string;
  swatch: string;
  light: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryText: string;
  };
  dark: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryText: string;
  };
}

export const ColorPresets: Record<ThemeColorKey, ColorPresetDef> = {
  purple: {
    key: 'purple',
    name: 'Royal Purple',
    swatch: '#7C5CFC',
    light: {
      primary: '#7C5CFC',
      primaryHover: '#6A4AE8',
      primaryLight: '#EDE9FE',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#A78BFA',
      primaryHover: '#8B5CF6',
      primaryLight: 'rgba(167, 139, 250, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
  blue: {
    key: 'blue',
    name: 'Ocean Blue',
    swatch: '#2563EB',
    light: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      primaryLight: '#DBEAFE',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#60A5FA',
      primaryHover: '#3B82F6',
      primaryLight: 'rgba(96, 165, 250, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
  green: {
    key: 'green',
    name: 'Bakery Emerald',
    swatch: '#059669',
    light: {
      primary: '#059669',
      primaryHover: '#047857',
      primaryLight: '#D1FAE5',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#34D399',
      primaryHover: '#10B981',
      primaryLight: 'rgba(52, 211, 153, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
  red: {
    key: 'red',
    name: 'Ruby Berry',
    swatch: '#DC2626',
    light: {
      primary: '#DC2626',
      primaryHover: '#B91C1C',
      primaryLight: '#FEE2E2',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#F87171',
      primaryHover: '#EF4444',
      primaryLight: 'rgba(248, 113, 113, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
  amber: {
    key: 'amber',
    name: 'Artisan Honey',
    swatch: '#D97706',
    light: {
      primary: '#D97706',
      primaryHover: '#B45309',
      primaryLight: '#FEF3C7',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#FBBF24',
      primaryHover: '#F59E0B',
      primaryLight: 'rgba(251, 191, 36, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
  pink: {
    key: 'pink',
    name: 'Rose Velvet',
    swatch: '#DB2777',
    light: {
      primary: '#DB2777',
      primaryHover: '#BE185D',
      primaryLight: '#FCE7F3',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#F472B6',
      primaryHover: '#EC4899',
      primaryLight: 'rgba(244, 114, 182, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
  teal: {
    key: 'teal',
    name: 'Nordic Teal',
    swatch: '#0D9488',
    light: {
      primary: '#0D9488',
      primaryHover: '#0F766E',
      primaryLight: '#CCFBF1',
      primaryText: '#FFFFFF',
    },
    dark: {
      primary: '#2DD4BF',
      primaryHover: '#14B8A6',
      primaryLight: 'rgba(45, 212, 191, 0.16)',
      primaryText: '#FFFFFF',
    },
  },
};

export const ThemeColors = {
  light: {
    background: Palette.slate[50],    // Soft airy canvas (#F6F8FC)
    surface: '#FFFFFF',               // Crisp elevated white card
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: Palette.slate[100],
    border: Palette.slate[200],
    borderSubtle: Palette.slate[100],
    
    text: Palette.slate[900],         // Crisp deep ink
    textMuted: Palette.slate[500],    // Modern muted slate
    textLight: Palette.slate[400],
    
    primary: ColorPresets.purple.light.primary,
    primaryHover: ColorPresets.purple.light.primaryHover,
    primaryLight: ColorPresets.purple.light.primaryLight,
    primaryText: ColorPresets.purple.light.primaryText,
    
    accent: Palette.peach[600],       // Peach/Coral accent
    accentLight: Palette.peach[100],
    
    success: Palette.emerald[500],
    successLight: Palette.emerald[50],
    successText: Palette.emerald[700],
    
    danger: Palette.crimson[500],
    dangerLight: Palette.crimson[50],
    dangerText: Palette.crimson[700],

    info: Palette.blue[500],
    infoLight: Palette.blue[50],
    infoText: Palette.blue[700],
  },
  dark: {
    background: Palette.slate[950],   // Deep midnight obsidian (#0C0E14)
    surface: Palette.slate[900],      // Sleek dark slate card (#141722)
    surfaceElevated: Palette.slate[850],
    surfaceSubtle: Palette.slate[800],
    border: Palette.slate[800],
    borderSubtle: Palette.slate[850],
    
    text: Palette.slate[25],          // Pure high-contrast clean light text
    textMuted: Palette.slate[400],    // Balanced readable muted text
    textLight: Palette.slate[600],
    
    primary: ColorPresets.purple.dark.primary,
    primaryHover: ColorPresets.purple.dark.primaryHover,
    primaryLight: ColorPresets.purple.dark.primaryLight,
    primaryText: ColorPresets.purple.dark.primaryText,
    
    accent: Palette.peach[400],
    accentLight: 'rgba(251, 146, 60, 0.16)',
    
    success: Palette.emerald[500],
    successLight: 'rgba(16, 185, 129, 0.16)',
    successText: Palette.emerald[100],
    
    danger: Palette.crimson[500],
    dangerLight: 'rgba(239, 68, 68, 0.16)',
    dangerText: Palette.crimson[100],

    info: Palette.blue[500],
    infoLight: 'rgba(59, 130, 246, 0.16)',
    infoText: Palette.blue[100],
  },
};

export function getThemeColors(mode: 'light' | 'dark', colorKey: ThemeColorKey = 'purple') {
  const base = mode === 'dark' ? ThemeColors.dark : ThemeColors.light;
  const preset = ColorPresets[colorKey] ?? ColorPresets.purple;
  const overrides = mode === 'dark' ? preset.dark : preset.light;

  return {
    ...base,
    primary: overrides.primary,
    primaryHover: overrides.primaryHover,
    primaryLight: overrides.primaryLight,
    primaryText: overrides.primaryText,
  };
}
