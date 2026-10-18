import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  secureTextEntry,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { colors, borderRadius, spacing, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[typography.captionBold, { color: colors.text, marginBottom: spacing.xs }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.danger
              : isFocused
              ? colors.primary
              : colors.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          placeholderTextColor={colors.textLight}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          style={[
            styles.textInput,
            typography.body,
            { color: colors.text },
            style,
          ]}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIconButton}
            activeOpacity={0.7}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={colors.textMuted} />
            ) : (
              <Eye size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
  },
  leftIconContainer: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
  },
  rightIconButton: {
    padding: 6,
    marginLeft: 6,
  },
});
