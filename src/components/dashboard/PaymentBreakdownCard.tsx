import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Banknote, QrCode, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';

interface Props {
  currency: string;
  totalRevenue: number;
  cashRevenue: number;
  upiRevenue: number;
  cardRevenue: number;
}

export function PaymentBreakdownCard({
  currency,
  totalRevenue,
  cashRevenue,
  upiRevenue,
  cardRevenue,
}: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();

  const total = totalRevenue > 0 ? totalRevenue : 1;
  const cashPct = Math.round((cashRevenue / total) * 100);
  const upiPct = Math.round((upiRevenue / total) * 100);
  const cardPct = Math.max(0, 100 - cashPct - upiPct);

  return (
    <Card style={{ padding: spacing.lg }}>
      <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
        Payment Methods Breakdown
      </Text>

      {/* Multi-segment distribution bar */}
      <View
        style={[
          styles.distributionBar,
          {
            backgroundColor: colors.surfaceSubtle,
            borderRadius: borderRadius.full,
          },
        ]}
      >
        {totalRevenue > 0 ? (
          <>
            {cashPct > 0 && (
              <View
                style={[
                  styles.segment,
                  { width: `${cashPct}%`, backgroundColor: colors.primary },
                ]}
              />
            )}
            {upiPct > 0 && (
              <View
                style={[
                  styles.segment,
                  { width: `${upiPct}%`, backgroundColor: colors.accent },
                ]}
              />
            )}
            {cardPct > 0 && (
              <View
                style={[
                  styles.segment,
                  { width: `${cardPct}%`, backgroundColor: colors.info },
                ]}
              />
            )}
          </>
        ) : (
          <View style={[styles.segment, { width: '100%', backgroundColor: colors.border }]} />
        )}
      </View>

      {/* Breakdown Items */}
      <View style={{ marginTop: spacing.md }}>
        {/* Cash */}
        <View style={styles.itemRow}>
          <View style={styles.labelCol}>
            <View style={[styles.colorChip, { backgroundColor: colors.primary }]} />
            <Banknote size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
            <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>Cash</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>
              {currency} {cashRevenue.toFixed(2)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
              {totalRevenue > 0 ? `${cashPct}%` : '0%'}
            </Text>
          </View>
        </View>

        {/* UPI */}
        <View style={styles.itemRow}>
          <View style={styles.labelCol}>
            <View style={[styles.colorChip, { backgroundColor: colors.accent }]} />
            <QrCode size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
            <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>UPI QR</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>
              {currency} {upiRevenue.toFixed(2)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
              {totalRevenue > 0 ? `${upiPct}%` : '0%'}
            </Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.itemRow}>
          <View style={styles.labelCol}>
            <View style={[styles.colorChip, { backgroundColor: colors.info }]} />
            <CreditCard size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
            <Text style={[typography.bodyBold, { color: colors.text, marginLeft: 6 }]}>Card</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>
              {currency} {cardRevenue.toFixed(2)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
              {totalRevenue > 0 ? `${cardPct}%` : '0%'}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  distributionBar: {
    height: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 4,
  },
  segment: {
    height: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorChip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  amountCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
