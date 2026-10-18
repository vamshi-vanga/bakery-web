import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { TopProductItem } from '@/services/reporting';

interface Props {
  currency: string;
  products: TopProductItem[];
}

export function TopProductsList({ currency, products }: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();

  return (
    <Card style={{ padding: spacing.lg }}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Trophy size={20} color={colors.primary} />
          <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
            Top Selling Products
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textMuted }]}>By Revenue</Text>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            No sales recorded in this time range.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: spacing.sm }}>
          {products.map((item, index) => {
            const rank = index + 1;
            let rankBg: string = colors.surfaceSubtle;
            let rankText: string = colors.textMuted;

            if (rank === 1) {
              rankBg = colors.primaryLight;
              rankText = colors.primary;
            } else if (rank === 2) {
              rankBg = colors.accentLight;
              rankText = colors.accent;
            }

            return (
              <View
                key={item.item_name}
                style={[
                  styles.productRow,
                  {
                    borderBottomColor: colors.borderSubtle,
                    borderBottomWidth: index === products.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.leftCol}>
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: rankBg, borderRadius: borderRadius.sm },
                    ]}
                  >
                    <Text style={[typography.captionBold, { color: rankText, fontSize: 11 }]}>
                      #{rank}
                    </Text>
                  </View>

                  <View style={{ marginLeft: 10 }}>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>
                      {item.item_name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {item.quantity_sold} sold
                    </Text>
                  </View>
                </View>

                <Text style={[typography.bodyBold, { color: colors.primary }]}>
                  {currency} {item.total_revenue.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
