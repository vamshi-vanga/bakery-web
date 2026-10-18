import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { colors, borderRadius, typography } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'success':
        return { bg: colors.successLight, text: colors.successText };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.dangerText };
      case 'warning':
        return { bg: colors.primaryLight, text: colors.accent };
      default:
        return { bg: colors.surfaceSubtle, text: colors.textMuted };
    }
  };

  const currentColors = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentColors.bg,
          borderRadius: borderRadius.full,
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.captionBold,
          {
            color: currentColors.text,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
