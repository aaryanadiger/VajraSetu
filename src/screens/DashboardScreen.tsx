import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getAllReadingsToday, getWorkers, getSettings } from '../services/db';
import { Reading, Worker, RiskBand, AppSettings } from '../types';

function riskToBadge(band: RiskBand): 'success' | 'warning' | 'danger' | 'neutral' {
  const m = { low: 'success', elevated: 'warning', high: 'danger', invalid: 'neutral' } as const;
  return m[band] ?? 'neutral';
}

export const DashboardScreen: React.FC = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [r, w, s] = await Promise.all([getAllReadingsToday(), getWorkers(), getSettings()]);
    setReadings(r);
    setWorkers(w);
    setSettings(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Derive dashboard metrics
  const validReadings = readings.filter(r => r.band_valid);
  const scannedToday = readings.length;
  const highRisk = readings.filter(r => r.risk_band === 'high');
  const elevated = readings.filter(r => r.risk_band === 'elevated');
  const invalid = readings.filter(r => !r.band_valid);
  const avgTWA = validReadings.length
    ? validReadings.reduce((s, r) => s + r.twa_ppm, 0) / validReadings.length
    : 0;

  const oel = settings?.oel_twa_ppm ?? 5;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#f5f8ff', '#e8f1fb', '#c8daf4']} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <AppHeader />

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Site Dashboard</Text>
          <Text style={styles.pageDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}</Text>
        </View>

        {/* Summary metric grid */}
        <View style={styles.metricGrid}>
          <MetricTile icon="scan-outline" label="Scanned Today" value={scannedToday} color={theme.colors.primary} />
          <MetricTile icon="alert-circle-outline" label="High Risk" value={highRisk.length} color={theme.colors.semantic.danger} alert={highRisk.length > 0} />
          <MetricTile icon="warning-outline" label="Elevated" value={elevated.length} color={theme.colors.semantic.warning} />
          <MetricTile icon="people-outline" label="Total Workers" value={workers.length} color={theme.colors.text.secondary} />
        </View>

        {/* Average TWA card */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="analytics-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>Site Average TWA</Text>
          </View>
          <View style={styles.avgTwaRow}>
            <Text style={styles.avgTwaValue}>{avgTWA.toFixed(3)}</Text>
            <Text style={styles.avgTwaUnit}> ppm</Text>
          </View>
          <View style={styles.oelBar}>
            <View style={[styles.oelFill, {
              width: `${Math.min((avgTWA / oel) * 100, 100)}%`,
              backgroundColor: avgTWA >= oel
                ? theme.colors.semantic.danger
                : avgTWA >= oel * 0.5
                  ? theme.colors.semantic.warning
                  : theme.colors.semantic.success,
            }]} />
          </View>
          <Text style={styles.oelLabel}>OEL threshold: {oel} ppm TWA (configurable in Settings)</Text>
        </Card>

        {/* High-risk workers */}
        {highRisk.length > 0 && (
          <Card>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.semantic.danger} />
              <Text style={[styles.cardTitle, { color: theme.colors.semantic.danger }]}>High-Risk Workers</Text>
            </View>
            {highRisk.map(r => (
              <AlertRow
                key={r.id}
                icon="warning"
                iconColor={theme.colors.semantic.danger}
                primary={`Shift: ${formatShiftId(r.shift_id)}`}
                secondary={`TWA: ${r.twa_ppm.toFixed(3)} ppm · Index: ${r.h2s_index.toFixed(1)}`}
                badge={<Badge label="HIGH RISK" variant="danger" />}
              />
            ))}
          </Card>
        )}

        {/* Invalid bands */}
        {invalid.length > 0 && (
          <Card>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="ban-outline" size={20} color={theme.colors.semantic.warning} />
              <Text style={[styles.cardTitle, { color: theme.colors.semantic.warning }]}>Wristbands to Replace</Text>
            </View>
            {invalid.map(r => (
              <AlertRow
                key={r.id}
                icon="refresh-circle-outline"
                iconColor={theme.colors.semantic.warning}
                primary={`Expiry ΔE: ${r.expiry_delta_e.toFixed(2)}`}
                secondary={`Captured: ${formatTime(r.captured_at)}`}
                badge={<Badge label="REPLACE" variant="neutral" />}
              />
            ))}
          </Card>
        )}

        {/* Sync status stub */}
        <Card style={styles.syncCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.cardTitle}>Sync Status</Text>
          </View>
          <Text style={styles.syncBody}>
            Running in <Text style={{ fontFamily: theme.typography.family.semiBold }}>local-only mode</Text>.
            {' '}All data is stored on this device. Cloud sync is not configured for v1.
          </Text>
          <View style={styles.syncBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.semantic.success} />
            <Text style={styles.syncBadgeText}>Local database healthy</Text>
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  alert?: boolean;
}
const MetricTile: React.FC<MetricTileProps> = ({ icon, label, value, color, alert }) => (
  <View style={[styles.metricTile, alert && styles.metricTileAlert]}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

interface AlertRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  primary: string;
  secondary: string;
  badge: React.ReactNode;
}
const AlertRow: React.FC<AlertRowProps> = ({ icon, iconColor, primary, secondary, badge }) => (
  <View style={styles.alertRow}>
    <Ionicons name={icon} size={20} color={iconColor} />
    <View style={{ flex: 1 }}>
      <Text style={styles.alertPrimary}>{primary}</Text>
      <Text style={styles.alertSecondary}>{secondary}</Text>
    </View>
    {badge}
  </View>
);

function formatShiftId(id: string): string {
  return id.split('-')[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  titleSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  pageTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xxxl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  pageDate: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  metricTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
    ...theme.shadows.card,
  },
  metricTileAlert: { backgroundColor: 'rgba(239,68,68,0.06)' },
  metricValue: {
    fontFamily: theme.typography.family.bold,
    fontSize: 32,
    letterSpacing: -1,
  },
  metricLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  avgTwaRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: theme.spacing.md },
  avgTwaValue: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.display,
    color: theme.colors.text.primary,
    letterSpacing: -2,
  },
  avgTwaUnit: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xl,
    color: theme.colors.text.primary,
  },
  oelBar: {
    height: 8,
    backgroundColor: theme.colors.semantic.neutral,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  oelFill: { height: '100%', borderRadius: 4 },
  oelLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  alertPrimary: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
  },
  alertSecondary: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  syncCard: {},
  syncBody: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  syncBadgeText: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.semantic.success,
  },
});
