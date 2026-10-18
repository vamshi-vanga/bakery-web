import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  isConnected: boolean;
  isReconnecting: boolean;
}

export function ConnectionStatusBadge({ isConnected, isReconnecting }: Props) {
  const { colors, typography, borderRadius } = useTheme();

  let dotColor: string = colors.success;
  let bgColor: string = colors.successLight;
  let label = 'Live Updates';

  if (isReconnecting) {
    dotColor = colors.accent;
    bgColor = colors.primaryLight;
    label = 'Reconnecting...';
  } else if (!isConnected) {
    dotColor = colors.textMuted;
    bgColor = colors.surfaceSubtle;
    label = 'Sync Paused';
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderRadius: borderRadius.full,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[typography.captionBold, { color: dotColor, fontSize: 11, marginLeft: 5 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
