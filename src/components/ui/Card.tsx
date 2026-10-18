import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'subtle';
}

export function Card({ children, style, variant = 'elevated' }: CardProps) {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  const getStyle = (): ViewStyle => {
    let backgroundColor: string = colors.surface;
    let borderColor: string = colors.borderSubtle;
    let borderWidth = 0;
    let shadowStyle = {};

    switch (variant) {
      case 'elevated':
        backgroundColor = colors.surface;
        borderColor = colors.borderSubtle;
        borderWidth = 1;
        shadowStyle = shadows.sm;
        break;
      case 'outlined':
        backgroundColor = colors.surface;
        borderColor = colors.border;
        borderWidth = 1;
        break;
      case 'subtle':
        backgroundColor = colors.surfaceSubtle;
        break;
    }

    return {
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      ...shadowStyle,
    };
  };

  return <View style={[styles.card, getStyle(), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
