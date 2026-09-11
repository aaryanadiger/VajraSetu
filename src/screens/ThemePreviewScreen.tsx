import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../theme';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const ThemePreviewScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AppHeader />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Typography</Text>
          <Text style={styles.heading}>Heading 1 (Exposure Num)</Text>
          <Text style={styles.subheading}>Heading 2 (Section Title)</Text>
          <Text style={styles.body}>Body Text (Regular 15)</Text>
          <Text style={styles.bodyLight}>Body Light (Text Secondary)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colors & Badges</Text>
          <View style={styles.row}>
            <Badge label="VALID" variant="success" />
            <Badge label="ELEVATED" variant="warning" />
            <Badge label="HIGH RISK" variant="danger" />
            <Badge label="INVALID" variant="neutral" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Components</Text>
          <Card>
            <Text style={styles.cardTitle}>Sample Card</Text>
            <Text style={styles.body}>This is a card using the extracted shadow and radius tokens.</Text>
            
            <View style={styles.buttonRow}>
              <Button label="Primary Button" style={styles.flex1} />
              <Button label="Outline" variant="outline" style={styles.flex1} />
            </View>
          </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.screen,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  heading: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.display,
    color: theme.colors.text.primary,
    letterSpacing: -2,
  },
  subheading: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xxxl,
    color: theme.colors.text.primary,
    letterSpacing: -1,
  },
  body: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
  },
  bodyLight: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  flex1: {
    flex: 1,
  },
});
