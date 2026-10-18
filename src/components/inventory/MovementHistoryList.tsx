import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import {
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
  Edit,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/ui/Card';
import { InventoryMovementRecord } from '@/services/inventory';
import { MovementType } from '@/types/database';

interface Props {
  movements: InventoryMovementRecord[];
}

export function MovementHistoryList({ movements }: Props) {
  const { colors, typography, borderRadius, spacing } = useTheme();

  const getMovementMeta = (type: MovementType, delta: number) => {
    switch (type) {
      case 'sale':
        return {
          label: 'SALE',
          color: colors.info,
          bgColor: colors.infoLight,
          icon: <ArrowDownRight size={14} color={colors.info} />,
          formattedDelta: `${delta}`,
        };
      case 'restock':
        return {
          label: 'RESTOCK',
          color: colors.successText,
          bgColor: colors.successLight,
          icon: <ArrowUpRight size={14} color={colors.success} />,
          formattedDelta: `+${delta}`,
        };
      case 'waste':
        return {
          label: 'WASTE',
          color: colors.dangerText,
          bgColor: colors.dangerLight,
          icon: <Trash2 size={14} color={colors.danger} />,
          formattedDelta: `${delta}`,
        };
      case 'void_restoration':
        return {
          label: 'VOID RESTORE',
          color: colors.accent,
          bgColor: colors.primaryLight,
          icon: <RotateCcw size={14} color={colors.accent} />,
          formattedDelta: `+${delta}`,
        };
      case 'correction':
      default:
        return {
          label: 'CORRECTION',
          color: colors.textMuted,
          bgColor: colors.surfaceSubtle,
          icon: <Edit size={14} color={colors.textMuted} />,
          formattedDelta: delta > 0 ? `+${delta}` : `${delta}`,
        };
    }
  };

  if (movements.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          No inventory movements recorded yet.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {movements.map((record) => {
        const meta = getMovementMeta(record.movement_type, record.quantity_delta);
        const dateStr = record.created_at
          ? format(new Date(record.created_at), 'dd MMM, hh:mm a')
          : '—';

        return (
          <Card key={record.id} style={{ padding: spacing.md }}>
            <View style={styles.row}>
              <View style={styles.leftCol}>
                <View
                  style={[
                    styles.typeChip,
                    { backgroundColor: meta.bgColor, borderRadius: borderRadius.xs },
                  ]}
                >
                  {meta.icon}
                  <Text
                    style={[
                      typography.captionBold,
                      { color: meta.color, fontSize: 10, marginLeft: 3 },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </View>

                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    {record.menu_items?.name ?? 'Product'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{dateStr}</Text>
                </View>
              </View>

              <Text
                style={[
                  typography.h3,
                  {
                    color: record.quantity_delta > 0 ? colors.successText : colors.danger,
                    fontWeight: '700',
                  },
                ]}
              >
                {meta.formattedDelta}
              </Text>
            </View>

            {record.note && (
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
                ]}
              >
                Note: {record.note}
              </Text>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
