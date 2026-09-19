import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ label, variant = 'primary', icon, style, ...rest }) => {
  const containerStyle: ViewStyle[] = [styles.button];
  const labelStyle: TextStyle[] = [styles.label];

  if (variant === 'primary') {
    containerStyle.push(styles.primary);
    labelStyle.push(styles.primaryLabel);
  } else if (variant === 'secondary') {
    containerStyle.push(styles.secondary);
  } else if (variant === 'outline') {
    containerStyle.push(styles.outline);
    labelStyle.push(styles.outlineLabel);
  }

  return (
    <TouchableOpacity style={[containerStyle, style]} activeOpacity={0.8} {...rest}>
      {icon}
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 16,
    gap: theme.spacing.md,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.shadows.button.shadowColor,
    shadowOffset: theme.shadows.button.shadowOffset,
    shadowOpacity: theme.shadows.button.shadowOpacity,
    shadowRadius: theme.shadows.button.shadowRadius,
    elevation: theme.shadows.button.elevation,
  },
  secondary: {
    backgroundColor: theme.colors.accentWarmLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  label: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  outlineLabel: {
    color: theme.colors.primary,
  },
  primaryLabel: {
    color: theme.colors.text.inverse,
    fontFamily: theme.typography.family.semiBold,
  },
});
