import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { colors, borderRadius, typography } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    if (variant === 'danger') {
      haptic.medium();
    } else {
      haptic.light();
    }
    onPress();
  };

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let backgroundColor: string = colors.primary;
    let borderColor: string = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        backgroundColor = pressed ? colors.primaryHover : colors.primary;
        break;
      case 'secondary':
        backgroundColor = pressed ? colors.border : colors.surfaceSubtle;
        break;
      case 'outline':
        backgroundColor = pressed ? colors.surfaceSubtle : 'transparent';
        borderColor = colors.border;
        borderWidth = 1.5;
        break;
      case 'ghost':
        backgroundColor = pressed ? colors.surfaceSubtle : 'transparent';
        break;
      case 'danger':
        backgroundColor = pressed ? colors.dangerText : colors.danger;
        break;
    }

    if (disabled || loading) {
      backgroundColor = variant === 'outline' || variant === 'ghost' ? 'transparent' : colors.border;
      borderColor = colors.border;
    }

    // Generous touch-friendly button sizing (Admin friendly)
    let paddingVertical: number = 14;
    let paddingHorizontal: number = 22;
    let minHeight: number = 52;
    let bRadius: number = borderRadius.lg;

    if (size === 'sm') {
      paddingVertical = 10;
      paddingHorizontal = 16;
      minHeight = 44;
      bRadius = borderRadius.md;
    } else if (size === 'lg') {
      paddingVertical = 16;
      paddingHorizontal = 26;
      minHeight = 60;
      bRadius = borderRadius.xl;
    }

    return {
      backgroundColor,
      borderColor,
      borderWidth,
      paddingVertical,
      paddingHorizontal,
      minHeight,
      borderRadius: bRadius,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      opacity: disabled && variant !== 'outline' ? 0.6 : 1,
      transform: pressed ? [{ scale: 0.985 }] : [{ scale: 1 }],
    };
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textLight;

    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.text;
      case 'outline':
      case 'ghost':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              typography.button,
              {
                color: getTextColor(),
                fontWeight: '600',
                fontSize: size === 'sm' ? 14 : size === 'lg' ? 17 : 15,
                letterSpacing: -0.2,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
});
