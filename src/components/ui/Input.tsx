import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...rest }) => {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={theme.colors.text.light}
        {...rest}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  label: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  input: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.dropdown,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: theme.colors.semantic.danger,
  },
  errorText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.semantic.danger,
  },
});
