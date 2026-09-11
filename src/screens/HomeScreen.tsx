import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ExposureGauge } from '../components/ExposureGauge';
import { getAllReadingsToday, getSettings } from '../services/db';
import { Reading, AppSettings, RiskBand } from '../types';
import { useAuth } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';

// Demo/today's summary from most recent reading
function getLatestReading(readings: Reading[]): Reading | null {
  if (readings.length === 0) return null;
  return readings.reduce((a, b) =>
    new Date(a.captured_at) > new Date(b.captured_at) ? a : b
  );
}

function riskToBadge(band: RiskBand): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (band) {
    case 'low': return 'success';
    case 'elevated': return 'warning';
    case 'high': return 'danger';
    case 'invalid': return 'neutral';
    default: return 'neutral';
  }
}

export const HomeScreen: React.FC = () => {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([getAllReadingsToday(), getSettings()]);
    setReadings(r);
    setSettings(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const latest = getLatestReading(readings);
  const twaValue = latest?.band_valid ? latest.cumulative_ppm_hr : 0;
  const riskBand = latest?.risk_band ?? 'low';
  const oel = settings?.oel_twa_ppm ?? 5;
  const maxDisplay = oel * 12; // shift of 8hr × OEL gives max scale

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#f5f8ff', '#e8f1fb', '#c8daf4']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <AppHeader onAvatarPress={logout} />

        {/* ── Exposure Section ── */}
        <View style={styles.exposureSection}>
          <Text style={styles.sectionTitle}>Today's Exposure</Text>
          <ExposureGauge
            value={twaValue}
            max={maxDisplay}
            thresholdValue={oel * 8}
            thresholdLabel={`Threshold: ${(oel * 8).toFixed(0)} ppm·hr`}
          />
        </View>

        {/* ── Main Card ── */}
        <Card>
          {/* Shift indicator */}
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={22} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>Current Shift</Text>
          </View>
          <View style={styles.shiftPills}>
            {['Shift A: 06:00–14:00', 'Shift B: 14:00–22:00', 'Shift C: 22:00–06:00'].map((s, i) => {
              const active = i === getCurrentShiftIndex();
              return (
                <View
                  key={i}
                  style={[styles.shiftPill, active && styles.shiftPillActive]}
                >
                  <Text style={[styles.shiftPillText, active && styles.shiftPillTextActive]}>{s}</Text>
                </View>
              );
            })}
          </View>

          {/* Band status */}
          <View style={styles.bandRow}>
            <View style={styles.bandLeft}>
              <View style={styles.cardRow}>
                <Ionicons name="watch-outline" size={22} color={theme.colors.text.primary} />
                <Text style={styles.cardTitle}>Band Status</Text>
              </View>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: theme.colors.semantic[riskToBadge(riskBand)] },
                  ]}
                />
                <Text style={styles.statusText}>
                  {latest?.band_valid ? 'VALID' : latest ? 'INVALID' : 'NOT SCANNED'}
                </Text>
              </View>
            </View>

            {latest && (
              <View style={styles.bandRight}>
                <Text style={styles.expiryLabel}>Risk Band</Text>
                <Badge
                  label={riskBand.toUpperCase()}
                  variant={riskToBadge(riskBand)}
                />
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionGrid}>
            <ActionButton icon="document-text-outline" label="Wristband Manual" />
            <ActionButton icon="shield-outline" label="Safety Guidelines" />
            <ActionButton
              icon="people-outline"
              label="Worker Roster"
              onPress={() => navigation.navigate('Roster')}
            />
            <ActionButton
              icon="bar-chart-outline"
              label="Dashboard"
              onPress={() => navigation.navigate('Dashboard')}
            />
          </View>
        </Card>

        {/* Today's scans summary */}
        {readings.length > 0 && (
          <Card style={styles.summaryCard}>
            <View style={styles.cardRow}>
              <Ionicons name="today-outline" size={22} color={theme.colors.text.primary} />
              <Text style={styles.cardTitle}>Today's Scans</Text>
            </View>
            <View style={styles.summaryStats}>
              <StatChip label="Total Scans" value={readings.length} />
              <StatChip label="Valid Bands" value={readings.filter(r => r.band_valid).length} color={theme.colors.semantic.success} />
              <StatChip
                label="High Risk"
                value={readings.filter(r => r.risk_band === 'high').length}
                color={theme.colors.semantic.danger}
              />
            </View>
          </Card>
        )}

        <View style={{ height: theme.spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
};

function getCurrentShiftIndex(): number {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 0;
  if (hour >= 14 && hour < 22) return 1;
  return 2;
}

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}
const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={onPress}>
    <Ionicons name={icon} size={32} color={theme.colors.text.primary} />
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

interface StatChipProps { label: string; value: number; color?: string }
const StatChip: React.FC<StatChipProps> = ({ label, value, color }) => (
  <View style={styles.statChip}>
    <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: theme.spacing.xxl },
  exposureSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xxxl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
    marginBottom: theme.spacing.xl,
    lineHeight: theme.typography.size.xxxl * 1.15,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  shiftPills: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  shiftPill: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.dropdown,
    backgroundColor: '#e8f1fb',
  },
  shiftPillActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  shiftPillText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.secondary,
  },
  shiftPillTextActive: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.family.medium,
  },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  bandLeft: { flex: 1 },
  bandRight: { alignItems: 'flex-end', gap: theme.spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingLeft: 2 },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  expiryLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.btn,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  summaryCard: { marginTop: 0 },
  summaryStats: { flexDirection: 'row', gap: theme.spacing.md },
  statChip: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.xl,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});
