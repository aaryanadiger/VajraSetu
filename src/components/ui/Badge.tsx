import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info', style }) => {
  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.semantic[variant] }, style]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.inverse,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
});
