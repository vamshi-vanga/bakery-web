import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Boxes, AlertTriangle, XCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { InventoryOverviewStats } from '@/services/inventory';

interface Props {
  stats: InventoryOverviewStats;
}

export function InventorySummaryCards({ stats }: Props) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={styles.container}>
      {/* Total Tracked */}
      <View style={{ flex: 1, marginRight: spacing.xs }}>
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <Boxes size={18} color={colors.primary} />
            <Text style={[typography.captionBold, { color: colors.textMuted, marginLeft: 4 }]}>
              TRACKED
            </Text>
          </View>
          <Text style={[typography.h2, { color: colors.text, marginTop: 4 }]}>
            {stats.totalTracked}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Products</Text>
        </Card>
      </View>

      {/* Low Stock Alerts */}
      <View style={{ flex: 1, marginHorizontal: spacing.xs }}>
        <Card style={[styles.card, { borderColor: stats.lowStockCount > 0 ? colors.accent : colors.borderSubtle }]}>
          <View style={styles.headerRow}>
            <AlertTriangle size={18} color={colors.accent} />
            <Text style={[typography.captionBold, { color: colors.accent, marginLeft: 4 }]}>
              LOW STOCK
            </Text>
          </View>
          <Text
            style={[
              typography.h2,
              { color: stats.lowStockCount > 0 ? colors.accent : colors.text, marginTop: 4 },
            ]}
          >
            {stats.lowStockCount}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Need restock</Text>
        </Card>
      </View>

      {/* Out of Stock */}
      <View style={{ flex: 1, marginLeft: spacing.xs }}>
        <Card style={[styles.card, { borderColor: stats.outOfStockCount > 0 ? colors.danger : colors.borderSubtle }]}>
          <View style={styles.headerRow}>
            <XCircle size={18} color={colors.danger} />
            <Text style={[typography.captionBold, { color: colors.danger, marginLeft: 4 }]}>
              OUT
            </Text>
          </View>
          <Text
            style={[
              typography.h2,
              { color: stats.outOfStockCount > 0 ? colors.danger : colors.text, marginTop: 4 },
            ]}
          >
            {stats.outOfStockCount}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Empty stock</Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  card: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
