import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
}

export function RevenueMetricCard({ title, value, subtitle, icon, iconBgColor }: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.captionBold, { color: colors.textMuted }]}>{title}</Text>
          <Text
            style={[
              typography.h1,
              { color: colors.text, fontSize: 26, marginTop: 4, letterSpacing: -0.5 },
            ]}
          >
            {value}
          </Text>
          {subtitle && (
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {subtitle}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: iconBgColor ?? colors.primaryLight,
              borderRadius: borderRadius.md,
              padding: spacing.sm,
            },
          ]}
        >
          {icon}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
