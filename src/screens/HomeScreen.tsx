/**
 * HomeScreen — PRD §3
 * - Header: greeting + current risk band badge
 * - Primary: Exposure graph (cumulative TWA area chart, 7/30 day toggle, TWA/Index toggle)
 * - Tap point → bottom sheet with shift detail
 * - Secondary: "Scan now" CTA
 * - Empty state when no readings exist
 * All animations via react-native-reanimated; strings via i18next.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Pressable, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ExposureLineChart } from '../components/ExposureLineChart';
import { getReadingsForGraph, getSettings, getProfile } from '../services/db';
import { Reading, AppSettings, RiskBand, WorkerProfile } from '../types';

type ViewMode = 'twa' | 'index';
type DayRange = 7 | 30;

function getGreeting(name: string, t: (k: string) => string): string {
  const h = new Date().getHours();
  const key =
    h >= 5 && h < 12 ? 'home.greeting_morning' :
    h >= 12 && h < 17 ? 'home.greeting_afternoon' :
    h >= 17 && h < 21 ? 'home.greeting_evening' :
    'home.greeting_night';
  return `${t(key)}, ${name.split(' ')[0]}`;
}

function riskToBadge(band: RiskBand): 'success' | 'warning' | 'danger' | 'neutral' {
  return { low: 'success', elevated: 'warning', high: 'danger', invalid: 'neutral' }[band] as any ?? 'neutral';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dayRange, setDayRange] = useState<DayRange>(7);
  const [viewMode, setViewMode] = useState<ViewMode>('twa');
  const [selectedReading, setSelectedReading] = useState<Reading | null>(null);
  const [flashOnScan, setFlashOnScan] = useState(false);
  const [guide, setGuide] = useState<'manual' | 'safety' | null>(null);
  const sheetY = useSharedValue(0);

  const load = useCallback(async () => {
    const [r, s, p] = await Promise.all([
      getReadingsForGraph(30),
      getSettings(),
      getProfile(),
    ]);
    setReadings(r);
    setSettings(s);
    setProfile(p);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = readings.filter(r => {
    const cutoff = Date.now() - dayRange * 24 * 3600 * 1000;
    return new Date(r.captured_at).getTime() >= cutoff;
  });

  const latest = readings.length > 0
    ? readings.reduce((a, b) => new Date(a.captured_at) > new Date(b.captured_at) ? a : b)
    : null;
  const riskBand: RiskBand = latest?.band_valid ? (latest.risk_band as RiskBand) : 'low';
  const oel = settings?.oel_twa_ppm ?? 5;
  const todayExposure = latest?.cumulative_ppm_hr ?? 0;

  const openScan = () => navigation.navigate('Scan', {
    screen: 'CaptureMain',
    params: { initialTorch: flashOnScan },
  });

  // Bottom sheet
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(selectedReading ? 0 : 500, theme.motion.spring) }],
    opacity: withTiming(selectedReading ? 1 : 0, { duration: theme.motion.fade.duration }),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={theme.colors.gradient.background as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>{t('common.appName')}</Text>
            <Text style={styles.greetingText}>
              {getGreeting(profile?.full_name || 'Worker', t)}
            </Text>
          </View>
          {latest && (
            <Animated.View entering={FadeIn.delay(200).duration(260)}>
              <Badge
                label={t(`riskBand.${riskBand}` as any)}
                variant={riskToBadge(riskBand)}
              />
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(320)}>
          <Card style={styles.exposureCard}>
            <Text style={styles.exposureLabel}>Today’s Exposure</Text>
            <View style={styles.exposureValueRow}>
              <Text style={styles.exposureValue}>{todayExposure.toFixed(1)}</Text>
              <Text style={styles.exposureUnit}>ppm·hr</Text>
            </View>
            <View style={styles.exposureTrack}>
              <View style={[styles.exposureFill, { width: `${Math.min(100, (todayExposure / (oel * 8)) * 100)}%` }]} />
            </View>
            <View style={styles.exposureScale}>
              <Text style={styles.exposureScaleText}>0</Text>
              <Text style={styles.exposureScaleText}>Threshold: {(oel * 8).toFixed(0)} ppm·hr</Text>
            </View>
          </Card>
        </Animated.View>

        {/* ── Graph card ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(340)}>
          <Card style={styles.graphCard}>
            {/* Graph header row */}
            <View style={styles.graphHeader}>
              <Text style={styles.graphTitle}>{t('home.graphTitle')}</Text>
              <Text style={styles.graphUnit}>ppm·hr</Text>
            </View>

            {/* Day range toggle */}
            <View style={styles.toggleRow}>
              <TogglePill
                label={t('home.last7Days')}
                active={dayRange === 7}
                onPress={() => setDayRange(7)}
              />
              <TogglePill
                label={t('home.last30Days')}
                active={dayRange === 30}
                onPress={() => setDayRange(30)}
              />
              <View style={styles.toggleSep} />
              <TogglePill
                label={t('home.twaView')}
                active={viewMode === 'twa'}
                onPress={() => setViewMode('twa')}
              />
              <TogglePill
                label={t('home.indexView')}
                active={viewMode === 'index'}
                onPress={() => setViewMode('index')}
              />
            </View>

            {/* Chart or empty state */}
            {filtered.length === 0 ? (
              <EmptyGraphState t={t} onScan={openScan} />
            ) : (
              <ExposureLineChart
                readings={filtered}
                oel={oel}
                viewMode={viewMode}
                onPressPoint={(r) => setSelectedReading(r)}
              />
            )}
          </Card>
        </Animated.View>

        {/* ── Latest stats strip ── */}
        {latest?.band_valid && (
          <Animated.View entering={FadeInDown.delay(160).duration(300)}>
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <StatPill label="TWA" value={`${latest.twa_ppm.toFixed(2)} ppm`} />
                <StatPill
                  label="Cumulative"
                  value={`${latest.cumulative_ppm_hr.toFixed(1)} ppm·hr`}
                />
                <StatPill label="H₂S Index" value={latest.h2s_index.toFixed(1)} />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* ── Scan CTA ── */}
        <Animated.View entering={FadeInDown.delay(220).duration(300)}>
          <TouchableOpacity style={styles.scanCTA} onPress={openScan} activeOpacity={0.85}>
            <Ionicons name="scan" size={26} color={theme.colors.primary} />
            <Text style={styles.scanCTAText}>{t('common.scanNow')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.flashRow}>
          <Text style={styles.flashLabel}>Flash for scan</Text>
          <TouchableOpacity
            style={[styles.flashToggle, flashOnScan && styles.flashToggleActive]}
            onPress={() => setFlashOnScan(value => !value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: flashOnScan }}
            accessibilityLabel="Use flash when opening scanner"
          >
            <Ionicons name={flashOnScan ? 'flash' : 'flash-off'} size={17} color={flashOnScan ? '#fff' : theme.colors.text.secondary} />
            <Text style={[styles.flashToggleText, flashOnScan && styles.flashToggleTextActive]}>{flashOnScan ? 'On' : 'Off'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <QuickAction icon="document-text-outline" label="Wristband Manual" onPress={() => setGuide('manual')} />
          <QuickAction icon="book-outline" label="Safety Guidelines" onPress={() => setGuide('safety')} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom sheet: shift detail ── */}
      {selectedReading && (
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setSelectedReading(null)}
        >
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <Pressable onPress={() => {/* prevent backdrop close on inner press */}}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('home.shiftDetail')}</Text>

              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>{formatDate(selectedReading.captured_at)}</Text>
                <Text style={styles.sheetSub}>{formatTime(selectedReading.captured_at)}</Text>
              </View>

              <View style={styles.sheetMetrics}>
                <SheetMetric label="TWA" value={`${selectedReading.twa_ppm.toFixed(3)} ppm`} />
                <SheetMetric label="Cumul." value={`${selectedReading.cumulative_ppm_hr.toFixed(1)} ppm·hr`} />
                <SheetMetric label="H₂S Index" value={selectedReading.h2s_index.toFixed(1)} />
                <SheetMetric label="ΔE" value={selectedReading.sensing_delta_e.toFixed(2)} />
              </View>

              <View style={styles.sheetBadgeRow}>
                <Badge
                  label={t(`riskBand.${selectedReading.risk_band}` as any)}
                  variant={riskToBadge(selectedReading.risk_band as RiskBand)}
                />
                <Text style={styles.sheetCalib}>
                  cal: {selectedReading.calibration_curve_version}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setSelectedReading(null)}
              >
                <Text style={styles.sheetCloseText}>{t('home.closeSheet')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      <Modal visible={guide !== null} transparent animationType="slide" onRequestClose={() => setGuide(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setGuide(null)}>
          <Pressable style={styles.guideModal} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <View style={styles.guideHeader}>
              <Ionicons name={guide === 'manual' ? 'document-text-outline' : 'shield-checkmark-outline'} size={24} color={theme.colors.primary} />
              <Text style={styles.guideTitle}>{guide === 'manual' ? 'Wristband Manual' : 'H₂S Safety Guidelines'}</Text>
            </View>
            {guide === 'manual' ? <ManualContent /> : <SafetyContent />}
            <TouchableOpacity style={styles.guideClose} onPress={() => setGuide(null)}><Text style={styles.guideCloseText}>Done</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const TogglePill: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label, active, onPress,
}) => (
  <TouchableOpacity
    style={[styles.pill, active && styles.pillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const StatPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statPill}>
    <Text style={styles.statPillVal}>{value}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

const QuickAction: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={30} color={theme.colors.text.primary} />
    <Text style={styles.quickActionText}>{label}</Text>
  </TouchableOpacity>
);

const ManualContent = () => (
  <View style={styles.guideContent}>
    <Text style={styles.guideText}>1. Check that the band is clean, dry, valid, and within its stated expiry date.</Text>
    <Text style={styles.guideText}>2. Place the full colour area inside the scanner frame in even light. Keep your hand steady until capture completes.</Text>
    <Text style={styles.guideText}>3. Review the result and rescan if the app reports an invalid band. Do not reuse a damaged wristband.</Text>
  </View>
);

const SafetyContent = () => (
  <View style={styles.guideContent}>
    <Text style={styles.guideNotice}>This wristband supports awareness; it does not replace a calibrated gas monitor, site procedures, or emergency response equipment.</Text>
    <Text style={styles.guideText}>• Leave the area immediately if an alarm sounds, you smell a rotten-egg odour, or you feel unwell. Warn others and report to supervision.</Text>
    <Text style={styles.guideText}>• Hydrogen sulfide can quickly reduce your sense of smell. Never rely on odour to decide that an area is safe.</Text>
    <Text style={styles.guideText}>• Follow your site’s confined-space, ventilation, monitoring, respiratory-protection, and rescue procedures. Never enter to rescue someone without proper training and equipment.</Text>
    <Text style={styles.guideSource}>Safety content is aligned to OSHA hydrogen sulfide guidance; site rules always take priority.</Text>
  </View>
);

const SheetMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.sheetMetric}>
    <Text style={styles.sheetMetricVal}>{value}</Text>
    <Text style={styles.sheetMetricLabel}>{label}</Text>
  </View>
);

const EmptyGraphState: React.FC<{ t: (k: string) => string; onScan: () => void }> = ({ t, onScan }) => (
  <View style={styles.emptyState}>
    <Ionicons name="analytics-outline" size={52} color={theme.colors.text.light} />
    <Text style={styles.emptyTitle}>{t('home.noReadings')}</Text>
    <Text style={styles.emptyBody}>{t('home.noReadingsBody')}</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onScan} activeOpacity={0.8}>
      <Text style={styles.emptyBtnText}>{t('home.scanFirst')}</Text>
    </TouchableOpacity>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: 24 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  headerLeft: { gap: 2 },
  logoText: {
    fontFamily: theme.typography.family.logo,
    fontSize: theme.typography.size.xxl,
    color: theme.colors.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  greetingText: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.secondary,
  },

  graphCard: { marginHorizontal: 0, marginBottom: theme.spacing.lg, paddingHorizontal: 12 },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
  },
  graphTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  graphUnit: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    flexWrap: 'wrap',
  },
  toggleSep: { width: 8 },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radii.dropdown,
    backgroundColor: '#edf2fb',
  },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: {
    fontFamily: theme.typography.family.medium,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  pillTextActive: { color: '#fff' },

  statsCard: { marginHorizontal: 0, marginBottom: theme.spacing.lg, paddingVertical: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statPill: { alignItems: 'center', gap: 2 },
  statPillVal: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
  },
  statPillLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 10,
    color: theme.colors.text.secondary,
  },

  scanCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.btn,
    marginBottom: theme.spacing.lg,
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#86c5ff',
    ...theme.shadows.button,
  },
  scanCTAText: {
    flex: 1,
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  flashRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm, marginTop: -4, marginBottom: theme.spacing.xl },
  flashLabel: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.text.secondary },
  flashToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: theme.radii.full, backgroundColor: '#edf2fb' },
  flashToggleActive: { backgroundColor: theme.colors.primary },
  flashToggleText: { fontFamily: theme.typography.family.semiBold, fontSize: 12, color: theme.colors.text.secondary },
  flashToggleTextActive: { color: '#fff' },
  quickActions: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  quickAction: { flex: 1, minHeight: 118, backgroundColor: '#b8ddff', borderRadius: theme.radii.card, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md },
  quickActionText: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.text.primary, textAlign: 'center' },
  exposureCard: { marginHorizontal: 0, marginBottom: theme.spacing.lg, paddingVertical: theme.spacing.xl },
  exposureLabel: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.lg, color: theme.colors.text.primary },
  exposureValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs, marginTop: theme.spacing.md },
  exposureValue: { fontFamily: theme.typography.family.bold, fontSize: 42, color: theme.colors.text.primary },
  exposureUnit: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.lg, color: theme.colors.text.primary },
  exposureTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: theme.colors.semantic.neutral, marginTop: theme.spacing.md },
  exposureFill: { height: '100%', borderRadius: 5, backgroundColor: theme.colors.primary },
  exposureScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs },
  exposureScaleText: { fontFamily: theme.typography.family.main, fontSize: 11, color: theme.colors.text.secondary },

  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.md,
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
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.btn,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  emptyBtnText: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.md,
    color: '#fff',
  },

  // Bottom sheet
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: theme.spacing.xl,
    paddingBottom: 40,
    ...theme.shadows.card,
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.semantic.neutral,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xl,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  sheetLabel: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
  },
  sheetSub: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
  },
  sheetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  sheetMetric: { alignItems: 'center', gap: 2 },
  sheetMetricVal: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  sheetMetricLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  sheetCalib: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.light,
  },
  sheetClose: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.btn,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetCloseText: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.secondary,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  guideModal: { backgroundColor: theme.colors.background.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: theme.spacing.xl, paddingBottom: 40 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  guideTitle: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.xl, color: theme.colors.text.primary },
  guideContent: { gap: theme.spacing.md },
  guideText: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.sm, color: theme.colors.text.primary, lineHeight: 21 },
  guideNotice: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.semantic.danger, lineHeight: 21 },
  guideSource: { fontFamily: theme.typography.family.main, fontSize: 11, color: theme.colors.text.secondary, lineHeight: 16 },
  guideClose: { marginTop: theme.spacing.xl, alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radii.btn, paddingVertical: 13 },
  guideCloseText: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.md, color: '#fff' },
});
