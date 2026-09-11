import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { SegmentedBar } from './SegmentedBar';

interface ExposureGaugeProps {
  value: number;
  unit?: string;
  max?: number;
  thresholdValue?: number;
  thresholdLabel?: string;
}

export const ExposureGauge: React.FC<ExposureGaugeProps> = ({
  value,
  unit = 'ppm·hr',
  max = 100,
  thresholdValue = 50,
  thresholdLabel,
}) => {
  const thresholdFraction = thresholdValue / max;

  return (
    <View style={styles.container}>
      {/* Big number */}
      <View style={styles.valueRow}>
        <Text style={styles.number}>{value.toFixed(1)}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {/* Segmented bar */}
      <View style={styles.barWrapper}>
        <SegmentedBar
          value={value}
          max={max}
          thresholdFraction={thresholdFraction}
        />
        <View style={styles.barLabels}>
          <Text style={styles.barLabel}>0</Text>
          <Text style={styles.barLabel}>{max}</Text>
        </View>
      </View>

      {thresholdLabel && (
        <Text style={styles.thresholdLabel}>{thresholdLabel}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  number: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.display,
    color: theme.colors.text.primary,
    letterSpacing: -2,
    lineHeight: theme.typography.size.display * 1.05,
  },
  unit: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
    marginBottom: 4,
  },
  barWrapper: {
    gap: theme.spacing.sm,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  thresholdLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    letterSpacing: theme.typography.letterSpacing.normal,
    marginTop: theme.spacing.xs,
  },
});
