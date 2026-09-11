import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useSarvamText } from '../hooks/useSarvamText';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getAccountProfile, getReadingsByWorker } from '../services/db';
import { Reading, RiskBand } from '../types';

function riskToBadge(band: RiskBand): 'success' | 'warning' | 'danger' | 'neutral' {
  const map = { low: 'success', elevated: 'warning', high: 'danger', invalid: 'neutral' } as const;
  return map[band] ?? 'neutral';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const WorkerHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const t = useSarvamText();
  const [workerName, setWorkerName] = useState('My exposure');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccountProfile().then(async profile => {
      if (!profile) { setLoading(false); return; }
      setWorkerName(profile.name);
      const r = await getReadingsByWorker(profile.worker_id);
      setReadings(r);
      setLoading(false);
    });
  }, []);

  const validReadings = readings.filter(r => r.band_valid);
  const avgTWA = validReadings.length
    ? validReadings.reduce((s, r) => s + r.twa_ppm, 0) / validReadings.length
    : 0;
  const maxTWA = validReadings.length
    ? Math.max(...validReadings.map(r => r.twa_ppm))
    : 0;
  const highRiskCount = readings.filter(r => r.risk_band === 'high').length;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#f5f8ff', '#e8f1fb', '#c8daf4']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.workerName}>{workerName}</Text>
          <Text style={styles.historyLabel}>{t('Exposure history')}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={readings}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              {/* Summary stats */}
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('Summary')} ({readings.length} {t('readings')})</Text>
                <View style={styles.statsRow}>
                  <StatBox label={t('Average TWA')} value={`${avgTWA.toFixed(3)} ppm`} />
                  <StatBox label={t('Peak TWA')} value={`${maxTWA.toFixed(3)} ppm`} alert={maxTWA >= 5} />
                  <StatBox label={t('High-risk days')} value={String(highRiskCount)} alert={highRiskCount > 0} />
                </View>
              </Card>

              {/* Mini trend chart (last 7 valid readings) */}
              {validReadings.length >= 2 && (
                <Card style={styles.chartCard}>
                  <Text style={styles.chartTitle}>{t('TWA trend')} ({t('last')} {Math.min(7, validReadings.length)} {t('readings')})</Text>
                  <MiniBarChart readings={validReadings.slice(0, 7).reverse()} />
                </Card>
              )}

              {readings.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={48} color={theme.colors.text.light} />
                  <Text style={styles.emptyTitle}>{t('No readings yet')}</Text>
                  <Text style={styles.emptyBody}>{t('Scan your wristband to start tracking your exposure.')}</Text>
                </View>
              )}


              {readings.length > 0 && (
                <Text style={styles.timelineLabel}>{t('Reading timeline')}</Text>
              )}
            </>
          )}
          renderItem={({ item }) => <ReadingCard reading={item} />}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

const MiniBarChart: React.FC<{ readings: Reading[] }> = ({ readings }) => {
  const maxVal = Math.max(...readings.map(r => r.twa_ppm), 1);

  return (
    <View style={styles.miniChart}>
      {readings.map((r, i) => {
        const heightPct = r.twa_ppm / maxVal;
        const band = r.risk_band;
        const color = band === 'high'
          ? theme.colors.semantic.danger
          : band === 'elevated'
            ? theme.colors.semantic.warning
            : theme.colors.semantic.success;

        return (
          <View key={r.id} style={styles.miniBarCol}>
            <View style={styles.miniBarBg}>
              <View style={[styles.miniBarFill, { height: `${heightPct * 100}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.miniBarLabel}>{i + 1}</Text>
          </View>
        );
      })}
    </View>
  );
};


// ─── Reading Card ─────────────────────────────────────────────────────────────

const ReadingCard: React.FC<{ reading: Reading }> = ({ reading }) => {
  const t = useSarvamText();
  return <View style={styles.readingCard}>
    <View style={styles.readingDateCol}>
      <Text style={styles.readingDate}>{formatDate(reading.captured_at)}</Text>
      <Text style={styles.readingTime}>{formatTime(reading.captured_at)}</Text>
    </View>

    <View style={styles.readingInfo}>
      {reading.band_valid ? (
        <>
          <View style={styles.readingMetrics}>
            <Text style={styles.readingMetricVal}>{reading.twa_ppm.toFixed(3)}</Text>
            <Text style={styles.readingMetricUnit}> {t('ppm TWA')}</Text>
          </View>
          <Text style={styles.readingIndexText}>{t('Index')}: {reading.h2s_index.toFixed(1)}</Text>
        </>
      ) : (
        <Text style={styles.invalidText}>{t('Band invalid — no reading')}</Text>
      )}
    </View>

    <Badge
      label={reading.risk_band.toUpperCase()}
      variant={riskToBadge(reading.risk_band)}
    />
  </View>;
};

// ─── Stat Box ─────────────────────────────────────────────────────────────────

const StatBox: React.FC<{ label: string; value: string; alert?: boolean }> = ({ label, value, alert }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, alert && { color: theme.colors.semantic.danger }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 54,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerName: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  historyLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  listContent: { padding: theme.spacing.xl, paddingBottom: 100 },
  summaryCard: { marginHorizontal: 0, marginBottom: theme.spacing.md },
  summaryTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  chartCard: { marginHorizontal: 0, marginBottom: theme.spacing.xl },
  chartTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: theme.spacing.sm,
  },
  miniBarCol: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  miniBarBg: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.semantic.neutral,
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  miniBarFill: { width: '100%', borderRadius: 3 },
  miniBarLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 9,
    color: theme.colors.text.light,
  },
  timelineLabel: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  emptyBody: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  readingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  readingDateCol: { width: 72, gap: 2 },
  readingDate: {
    fontFamily: theme.typography.family.medium,
    fontSize: 11,
    color: theme.colors.text.primary,
  },
  readingTime: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  readingInfo: { flex: 1, gap: 2 },
  readingMetrics: { flexDirection: 'row', alignItems: 'baseline' },
  readingMetricVal: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  readingMetricUnit: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  readingIndexText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  invalidText: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.semantic.danger,
    fontStyle: 'italic',
  },
});
