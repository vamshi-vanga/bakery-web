'use client';

import React, { createContext, useContext, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Palette = 'amber' | 'caramel' | 'emerald' | 'rose' | 'indigo' | 'violet';

export interface ThemeConfig {
  primary: string;
  light: string;
  border: string;
  ring: string;
  hover: string;
  gradient: string;
}

const PALETTES: Record<Palette, { dark: ThemeConfig; light: ThemeConfig }> = {
  amber: {
    dark: {
      primary: '#F59E0B',
      light: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.25)',
      ring: 'rgba(245, 158, 11, 0.4)',
      hover: 'rgba(245, 158, 11, 0.2)',
      gradient: 'from-amber-500 to-orange-600',
    },
    light: {
      primary: '#D97706',
      light: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)',
      ring: 'rgba(245, 158, 11, 0.5)',
      hover: 'rgba(245, 158, 11, 0.25)',
      gradient: 'from-amber-600 to-orange-700',
    },
  },
  caramel: {
    dark: {
      primary: '#C68B59',
      light: 'rgba(198, 139, 89, 0.15)',
      border: 'rgba(198, 139, 89, 0.3)',
      ring: 'rgba(198, 139, 89, 0.4)',
      hover: 'rgba(198, 139, 89, 0.25)',
      gradient: 'from-[#C68B59] to-[#8B4513]',
    },
    light: {
      primary: '#A06B39',
      light: 'rgba(198, 139, 89, 0.15)',
      border: 'rgba(198, 139, 89, 0.3)',
      ring: 'rgba(198, 139, 89, 0.5)',
      hover: 'rgba(198, 139, 89, 0.25)',
      gradient: 'from-[#A06B39] to-[#6B4423]',
    },
  },
  emerald: {
    dark: {
      primary: '#10B981',
      light: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.25)',
      ring: 'rgba(16, 185, 129, 0.4)',
      hover: 'rgba(16, 185, 129, 0.2)',
      gradient: 'from-emerald-500 to-teal-600',
    },
    light: {
      primary: '#059669',
      light: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
      ring: 'rgba(16, 185, 129, 0.5)',
      hover: 'rgba(16, 185, 129, 0.25)',
      gradient: 'from-emerald-600 to-teal-700',
    },
  },
  rose: {
    dark: {
      primary: '#F43F5E',
      light: 'rgba(244, 63, 94, 0.12)',
      border: 'rgba(244, 63, 94, 0.25)',
      ring: 'rgba(244, 63, 94, 0.4)',
      hover: 'rgba(244, 63, 94, 0.2)',
      gradient: 'from-rose-500 to-pink-600',
    },
    light: {
      primary: '#E11D48',
      light: 'rgba(244, 63, 94, 0.15)',
      border: 'rgba(244, 63, 94, 0.3)',
      ring: 'rgba(244, 63, 94, 0.5)',
      hover: 'rgba(244, 63, 94, 0.25)',
      gradient: 'from-rose-600 to-pink-700',
    },
  },
  indigo: {
    dark: {
      primary: '#6366F1',
      light: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.25)',
      ring: 'rgba(99, 102, 241, 0.4)',
      hover: 'rgba(99, 102, 241, 0.2)',
      gradient: 'from-indigo-500 to-purple-600',
    },
    light: {
      primary: '#4F46E5',
      light: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.3)',
      ring: 'rgba(99, 102, 241, 0.5)',
      hover: 'rgba(99, 102, 241, 0.25)',
      gradient: 'from-indigo-600 to-purple-700',
    },
  },
  violet: {
    dark: {
      primary: '#8B5CF6',
      light: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.25)',
      ring: 'rgba(139, 92, 246, 0.4)',
      hover: 'rgba(139, 92, 246, 0.2)',
      gradient: 'from-violet-500 to-purple-600',
    },
    light: {
      primary: '#7C3AED',
      light: 'rgba(139, 92, 246, 0.15)',
      border: 'rgba(139, 92, 246, 0.3)',
      ring: 'rgba(139, 92, 246, 0.5)',
      hover: 'rgba(139, 92, 246, 0.25)',
      gradient: 'from-violet-600 to-purple-700',
    },
  },
};

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleMode: () => {},
  setMode: () => {},
  palette: 'amber',
  setPalette: () => {},
  themeConfig: PALETTES.amber.dark,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bakery_admin_theme_mode') as ThemeMode;
        if (saved === 'light' || saved === 'dark') return saved;
      } catch {
        // ignore
      }
    }
    return 'dark';
  });

  const [palette, setPalette] = useState<Palette>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bakery_admin_palette') as Palette;
        if (saved && PALETTES[saved]) return saved;
      } catch {
        // ignore
      }
    }
    return 'amber';
  });

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('bakery_admin_theme_mode', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSetPalette = (p: Palette) => {
    setPalette(p);
    try {
      localStorage.setItem('bakery_admin_palette', p);
    } catch {
      // ignore
    }
  };

  const themeConfig = PALETTES[palette]?.[mode] || PALETTES.amber.dark;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleMode,
        setMode,
        palette,
        setPalette: handleSetPalette,
        themeConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
