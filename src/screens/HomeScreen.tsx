import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../navigation/RootNavigator';
import { useSarvamText } from '../hooks/useSarvamText';
import { theme } from '../theme';
import { getAccountProfile, getAllReadingsToday, getSettings } from '../services/db';
import { AccountProfile, AppSettings, Reading, RiskBand } from '../types';
import { AppLanguage, LANGUAGE_OPTIONS, isSarvamConfigured, translateUi } from '../services/translation';

type HomeSheet = 'manual' | 'safety' | 'shift' | 'wristband';

function riskMeta(band: RiskBand) {
  if (band === 'high') return { color: '#D92D20', icon: 'alert-circle' as const, label: 'HIGH' };
  if (band === 'elevated') return { color: '#B54708', icon: 'warning' as const, label: 'ELEVATED' };
  if (band === 'invalid') return { color: '#475467', icon: 'close-circle' as const, label: 'RESCAN' };
  return { color: '#027A48', icon: 'checkmark-circle' as const, label: 'VALID' };
}

function greeting(language: AppLanguage) {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const values: Record<AppLanguage, Record<string, string>> = {
    'en-IN': { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
    'bho-IN': { morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' },
    'hi-IN': { morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' },
    'mr-IN': { morning: 'शुभ सकाळ', afternoon: 'नमस्कार', evening: 'शुभ संध्याकाळ' },
    'kn-IN': { morning: 'ಶುಭೋದಯ', afternoon: 'ನಮಸ್ಕಾರ', evening: 'ಶುಭ ಸಂಜೆ' },
  };
  return values[language][period];
}

function initials(name?: string) {
  return (name ?? 'Worker').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { language, setLanguage } = useLanguage();
  const sarvamText = useSarvamText();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [guide, setGuide] = useState<HomeSheet | null>(null);

  const tx = (key: Parameters<typeof translateUi>[0], fallback: string) => {
    const local = translateUi(key, language, fallback);
    return local === fallback ? sarvamText(fallback) : local;
  };
  const load = useCallback(async () => {
    const [today, appSettings, account] = await Promise.all([getAllReadingsToday(), getSettings(), getAccountProfile()]);
    setReadings(today);
    setSettings(appSettings);
    setProfile(account);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const latest = readings[0];
  const band: RiskBand = latest?.band_valid ? latest.risk_band : latest ? 'invalid' : 'low';
  const status = riskMeta(band);
  const statusLabel = sarvamText(status.label);
  const oel = settings?.oel_twa_ppm ?? 10;
  const exposure = latest?.band_valid ? latest.cumulative_ppm_hr : 0;
  const progress = latest?.band_valid ? Math.min(1, latest.twa_ppm / oel) : 0;
  const openScan = () => navigation.navigate('Scan', { screen: 'CaptureMain' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HomeVectorAccent />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1677FF" />}
      >
        <View style={styles.header}>
          <View>
            <View style={styles.brandLockup}>
              <Image source={require('../../assets/logo.png')} style={styles.logoMark} resizeMode="contain" />
              <Text style={styles.wordmark}>Vajra सेतु</Text>
            </View>
            <Text style={styles.greeting}>{greeting(language)}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconControl} onPress={() => setLanguageOpen(true)} accessibilityRole="button" accessibilityLabel="Choose language">
              <Ionicons name="language-outline" size={22} color="#344054" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountBadge} onPress={() => navigation.navigate('Settings')} accessibilityRole="button" accessibilityLabel={tx('account', 'Account')}>
              <Text style={styles.accountInitials}>{initials(profile?.name)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.screenTitle}>{tx('safetyCheck', 'Your safety check')}</Text>

        <View style={styles.exposureSurface}>
          <View style={styles.surfaceHeader}>
            <Text style={styles.surfaceLabel}>{tx('latestExposure', 'Latest recorded exposure')}</Text>
            {latest && <View style={[styles.statusPill, { backgroundColor: `${status.color}14` }]}><Ionicons name={status.icon} size={14} color={status.color} /><Text style={[styles.statusPillText, { color: status.color }]}>{statusLabel}</Text></View>}
          </View>

          {loading ? <ActivityIndicator color="#1677FF" style={styles.loader} /> : (
            <>
              <View style={styles.valueLine}>
                <Text style={styles.exposureValue}>{exposure.toFixed(1)}</Text>
                <Text style={styles.exposureUnit}>ppm·hr</Text>
              </View>
              <SegmentedMeter fraction={progress} color={status.color} />
              <View style={styles.meterLabels}>
                <Text style={styles.meterLabel}>0</Text>
              <Text style={styles.meterLimit}>{tx('referenceLimit', 'India TWA limit')}: {oel} ppm</Text>
                <Text style={styles.meterLabel}>{oel}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.utilityPanel}>
          <UtilityRow icon="time-outline" title={sarvamText('Shift duration')} value={sarvamText('8 hours')} onPress={() => setGuide('shift')} />
          <UtilityRow icon="hardware-chip-outline" title={sarvamText('Wristband status')} value={latest ? (latest.band_valid ? statusLabel : sarvamText('REPLACE')) : sarvamText('Not scanned')} valueColor={latest ? status.color : undefined} onPress={() => setGuide('wristband')} last />
        </View>

        <TouchableOpacity style={styles.primaryAction} onPress={openScan} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={tx('scanWristband', 'Scan wristband')}>
          <ScanActionVector />
          <View style={styles.primaryIcon}><Ionicons name="scan" size={22} color="#fff" /></View>
          <View style={styles.primaryCopy}>
            <Text style={styles.primaryTitle}>{tx('scanWristband', 'Scan wristband')}</Text>
            <Text style={styles.primaryHint}>{tx('takesTenSeconds', 'Takes about 10 seconds')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <QuickAction icon="document-text-outline" label={sarvamText('Wristband manual')} onPress={() => setGuide('manual')} />
          <QuickAction icon="shield-checkmark-outline" label={sarvamText('Safety guidelines')} onPress={() => setGuide('safety')} />
        </View>

        <Text style={styles.footerNote}>{tx('scanAfterShift', 'Scan your wristband after your shift or when your supervisor asks.')}</Text>
        <View style={{ height: 92 }} />
      </ScrollView>

      <Modal visible={languageOpen} transparent animationType="slide" onRequestClose={() => setLanguageOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageOpen(false)}>
          <Pressable style={styles.languageSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{tx('chooseLanguage', 'Choose language')}</Text>
            <Text style={styles.sheetNote}>{isSarvamConfigured() ? tx('sarvamReady', 'Sarvam AI translation available') : tx('languageOffline', 'Language is available offline')}</Text>
            {LANGUAGE_OPTIONS.map(option => (
              <TouchableOpacity key={option.code} style={[styles.languageOption, option.code === language && styles.languageOptionActive]} onPress={() => { setLanguage(option.code); setLanguageOpen(false); }} accessibilityRole="radio" accessibilityState={{ selected: option.code === language }}>
                <View><Text style={styles.languageNative}>{option.nativeLabel}</Text><Text style={styles.languageEnglish}>{option.label}</Text></View>
                {option.code === language && <Ionicons name="checkmark" size={21} color="#1677FF" />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      <GuideModal guide={guide} latest={latest} language={language} onScan={() => { setGuide(null); setTimeout(openScan, 170); }} onClose={() => setGuide(null)} />
    </SafeAreaView>
  );
};

/** Quiet linework that gives the home surface depth without competing with data. */
const HomeVectorAccent = () => (
  <View style={styles.homeVectorAccent} pointerEvents="none">
    <Svg width="190" height="210" viewBox="0 0 190 210">
      <Defs>
        <SvgLinearGradient id="homeGlow" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5EA6FF" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#5EA6FF" stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx="150" cy="42" r="72" fill="url(#homeGlow)" />
      <Path d="M35 132 C78 91 128 96 188 48" fill="none" stroke="#1677FF" strokeOpacity="0.08" strokeWidth="1.5" />
      <Path d="M54 161 C101 119 143 127 193 82" fill="none" stroke="#1677FF" strokeOpacity="0.05" strokeWidth="1.5" />
      <Circle cx="56" cy="158" r="3" fill="#1677FF" fillOpacity="0.10" />
      <Circle cx="151" cy="89" r="4" fill="#1677FF" fillOpacity="0.08" />
    </Svg>
  </View>
);

const ScanActionVector = () => (
  <View style={styles.scanActionVector} pointerEvents="none">
    <Svg width="112" height="76" viewBox="0 0 112 76">
      <Path d="M3 70 C35 43 63 50 112 8" fill="none" stroke="#FFFFFF" strokeOpacity="0.13" strokeWidth="1.5" />
      <Path d="M30 77 C58 54 83 55 116 28" fill="none" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1.5" />
      <Circle cx="86" cy="27" r="4" fill="#FFFFFF" fillOpacity="0.12" />
    </Svg>
  </View>
);

const SegmentedMeter: React.FC<{ fraction: number; color: string }> = ({ fraction, color }) => {
  const filled = Math.max(0, Math.round(fraction * 24));
  return <View style={styles.meter}>{Array.from({ length: 24 }, (_, index) => <View key={index} style={[styles.segment, index < filled && { backgroundColor: color }, index === 12 && styles.thresholdSegment]} />)}</View>;
};

const UtilityRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; value: string; valueColor?: string; last?: boolean; onPress: () => void }> = ({ icon, title, value, valueColor, last, onPress }) => (
  <TouchableOpacity style={[styles.utilityRow, last && styles.utilityRowLast]} onPress={onPress} activeOpacity={0.72} accessibilityRole="button" accessibilityLabel={`${title}: ${value}`}>
    <View style={styles.utilityIcon}><Ionicons name={icon} size={20} color="#344054" /></View>
    <Text style={styles.utilityTitle}>{title}</Text>
    <Text style={[styles.utilityValue, valueColor && { color: valueColor }]}>{value}</Text>
    <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
  </TouchableOpacity>
);

const QuickAction: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
    <Ionicons name={icon} size={23} color="#1677FF" />
    <Text style={styles.quickActionText}>{label}</Text>
  </TouchableOpacity>
);

const GUIDE_CONTENT = {
  manual: {
    title: 'Wristband manual', icon: 'document-text-outline' as const,
    items: ['Keep the patch clean, dry, and visible.', 'Place the full patch inside the camera frame after your shift.', 'Use even light and hold the phone steady.', 'If the band is invalid, replace it and tell your supervisor.'],
  },
  safety: {
    title: 'Indian factory H₂S safety guidance', icon: 'shield-checkmark-outline' as const,
    items: ['Know the H₂S hazards and the safety measures for your work area.', 'Follow your factory’s safe work instructions, training, supervision, ventilation, and PPE requirements.', 'If an alarm or warning appears, stop work, move to fresh air, and inform your supervisor.', 'Do not enter or attempt rescue in a gas-affected area unless trained, authorised, and using the required protective equipment.', 'Reference: India Factories Act Schedule II lists H₂S at 10 ppm for 8-hour TWA and 15 ppm for 15-minute STEL. Use your site gas detector and emergency plan for immediate hazards.'],
  },
};

const GuideModal: React.FC<{
  guide: HomeSheet | null;
  latest?: Reading;
  language: AppLanguage;
  onScan: () => void;
  onClose: () => void;
}> = ({ guide, latest, language, onScan, onClose }) => {
  const t = useSarvamText();
  const [activeGuide, setActiveGuide] = useState<HomeSheet | null>(guide);
  const [mounted, setMounted] = useState(Boolean(guide));
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(36)).current;

  useEffect(() => {
    if (guide) {
      setActiveGuide(guide);
      setMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(36);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 170, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 36, duration: 150, useNativeDriver: true }),
    ]).start(() => setMounted(false));
  }, [guide, mounted, backdropOpacity, sheetTranslateY]);

  if (!mounted || !activeGuide) return null;
  const content = activeGuide === 'manual' || activeGuide === 'safety' ? GUIDE_CONTENT[activeGuide] : null;
  const wristbandMeta = latest?.band_valid ? riskMeta(latest.risk_band) : riskMeta('invalid');

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.guideBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Close')} />
        <Animated.View style={[styles.guideSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <Pressable onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            {content ? (
              <>
                <SheetHeader icon={content.icon} title={t(content.title)} onClose={onClose} closeLabel={t('Close')} />
                {content.items.map(item => <View key={item} style={styles.guideItem}><View style={styles.guideDot} /><Text style={styles.guideText}>{t(item)}</Text></View>)}
              </>
            ) : activeGuide === 'shift' ? (
              <>
                <SheetHeader icon="time-outline" title={t('Shift information')} onClose={onClose} closeLabel={t('Close')} />
                <Text style={styles.detailIntro}>{t('The app uses one clear reference period for every scan.')}</Text>
                <View style={styles.detailPanel}>
                  <SheetDetail icon="hourglass-outline" label={t('Reference shift')} value={t('8 hours')} />
                  <SheetDetail icon="analytics-outline" label={t('Used for')} value={t('Exposure estimate')} last />
                </View>
                <View style={styles.infoCallout}><Ionicons name="information-circle-outline" size={18} color="#1677FF" /><Text style={styles.infoCalloutText}>{t('This does not change your assigned work hours. Follow your supervisor and site schedule.')}</Text></View>
              </>
            ) : (
              <>
                <SheetHeader icon="hardware-chip-outline" title={t(latest ? (latest.band_valid ? 'Wristband status' : 'Replace wristband') : 'Wristband not scanned')} onClose={onClose} closeLabel={t('Close')} />
                <View style={[styles.largeStatus, { backgroundColor: `${wristbandMeta.color}12` }]}>
                  <Ionicons name={wristbandMeta.icon} size={24} color={wristbandMeta.color} />
                  <Text style={[styles.largeStatusText, { color: wristbandMeta.color }]}>{t(latest ? (latest.band_valid ? wristbandMeta.label : 'EXPIRED') : 'NOT SCANNED')}</Text>
                </View>
                <View style={styles.detailPanel}>
                  <SheetDetail icon="checkmark-circle-outline" label={t('FeSO₄ expiry indicator')} value={t(latest ? (latest.band_valid ? 'Valid' : 'Expired') : 'Not scanned')} />
                  <SheetDetail icon="water-outline" label={t('CuSO₄ H₂S indicator')} value={t(latest?.band_valid ? latest.risk_band.toUpperCase() : 'Not evaluated')} />
                  {latest && <SheetDetail icon="calendar-outline" label={t('Last scan')} value={new Date(latest.captured_at).toLocaleString(language, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} last />}
                </View>
                <Text style={styles.detailFootnote}>{t(latest?.band_valid ? 'The expiry indicator passed. Continue following site alarms and safety procedures.' : latest ? 'Replace the expired band before use, then scan the new band.' : 'Scan the band after your shift or when your supervisor asks.')}</Text>
                <TouchableOpacity style={styles.sheetAction} onPress={onScan} activeOpacity={0.84} accessibilityRole="button">
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.sheetActionText}>{t(latest ? 'Scan another band' : 'Scan wristband')}</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const SheetHeader: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; closeLabel: string; onClose: () => void }> = ({ icon, title, closeLabel, onClose }) => (
  <View style={styles.guideHeader}>
    <View style={styles.guideIcon}><Ionicons name={icon} size={20} color="#1677FF" /></View>
    <Text style={styles.guideTitle}>{title}</Text>
    <TouchableOpacity style={styles.sheetClose} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel}><Ionicons name="close" size={22} color="#667085" /></TouchableOpacity>
  </View>
);

const SheetDetail: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }> = ({ icon, label, value, last }) => (
  <View style={[styles.sheetDetail, last && styles.sheetDetailLast]}>
    <Ionicons name={icon} size={18} color="#667085" />
    <Text style={styles.sheetDetailLabel}>{label}</Text>
    <Text style={styles.sheetDetailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F9' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, zIndex: 1 },
  homeVectorAccent: { position: 'absolute', top: -38, right: -28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 38, height: 38 },
  wordmark: { fontFamily: theme.typography.family.logo, fontSize: 29, color: '#101828', letterSpacing: -0.5 },
  greeting: { marginTop: 5, fontFamily: theme.typography.family.main, fontSize: 13, color: '#667085' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconControl: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center' },
  accountBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1677FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D0E5FF' },
  accountInitials: { fontFamily: theme.typography.family.bold, fontSize: 13, color: '#fff', letterSpacing: 0.3 },
  screenTitle: { fontFamily: theme.typography.family.semiBold, fontSize: 20, color: '#101828', marginBottom: 12 },
  exposureSurface: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#EAECF0', shadowColor: '#101828', shadowOpacity: 0.035, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 1 },
  surfaceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  surfaceLabel: { fontFamily: theme.typography.family.medium, fontSize: 14, color: '#475467' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusPillText: { fontFamily: theme.typography.family.bold, fontSize: 10, letterSpacing: 0.4 },
  loader: { height: 108, justifyContent: 'center' },
  valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 24, marginBottom: 18 },
  exposureValue: { fontFamily: theme.typography.family.bold, fontSize: 52, lineHeight: 56, color: '#101828', letterSpacing: -2 },
  exposureUnit: { fontFamily: theme.typography.family.main, fontSize: 19, color: '#344054' },
  meter: { flexDirection: 'row', gap: 3, height: 20, alignItems: 'stretch' },
  segment: { flex: 1, borderRadius: 2, backgroundColor: '#E4E7EC' },
  thresholdSegment: { borderRightWidth: 2, borderRightColor: '#98A2B3', borderRadius: 0 },
  meterLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  meterLabel: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#98A2B3' },
  meterLimit: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#667085' },
  utilityPanel: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: '#EAECF0', overflow: 'hidden' },
  utilityRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  utilityRowLast: { borderBottomWidth: 0 },
  utilityIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  utilityTitle: { flex: 1, fontFamily: theme.typography.family.medium, fontSize: 15, color: '#344054' },
  utilityValue: { fontFamily: theme.typography.family.semiBold, fontSize: 14, color: '#101828' },
  primaryAction: { minHeight: 76, borderRadius: 20, backgroundColor: '#1677FF', marginTop: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13, overflow: 'hidden' },
  scanActionVector: { position: 'absolute', right: 0, top: 0, bottom: 0 },
  primaryIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ffffff2B', alignItems: 'center', justifyContent: 'center' },
  primaryCopy: { flex: 1 },
  primaryTitle: { fontFamily: theme.typography.family.semiBold, fontSize: 17, color: '#fff' },
  primaryHint: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#D9EAFF', marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickAction: { flex: 1, minHeight: 82, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAECF0', borderRadius: 18, padding: 14, justifyContent: 'space-between' },
  quickActionText: { fontFamily: theme.typography.family.medium, fontSize: 13, color: '#344054', marginTop: 10 },
  guideBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#10182866' },
  guideSheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34, borderTopWidth: 1, borderColor: '#fff' },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  guideIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  guideTitle: { flex: 1, fontFamily: theme.typography.family.semiBold, fontSize: 18, color: '#101828' },
  sheetClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  guideItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 5 },
  guideDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1677FF', marginTop: 6 },
  guideText: { flex: 1, fontFamily: theme.typography.family.main, fontSize: 13, lineHeight: 18, color: '#475467' },
  detailIntro: { fontFamily: theme.typography.family.main, fontSize: 15, lineHeight: 22, color: '#667085', marginBottom: 16 },
  detailPanel: { borderWidth: 1, borderColor: '#EAECF0', borderRadius: 18, paddingHorizontal: 14, overflow: 'hidden', backgroundColor: '#FCFCFD' },
  sheetDetail: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EAECF0' },
  sheetDetailLast: { borderBottomWidth: 0 },
  sheetDetailLabel: { flex: 1, fontFamily: theme.typography.family.main, fontSize: 13, color: '#667085' },
  sheetDetailValue: { maxWidth: '43%', fontFamily: theme.typography.family.semiBold, fontSize: 13, color: '#101828', textAlign: 'right' },
  infoCallout: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, marginTop: 14 },
  infoCalloutText: { flex: 1, fontFamily: theme.typography.family.main, fontSize: 13, lineHeight: 19, color: '#344054' },
  largeStatus: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 },
  largeStatusText: { fontFamily: theme.typography.family.bold, fontSize: 13, letterSpacing: 0.5 },
  detailFootnote: { fontFamily: theme.typography.family.main, fontSize: 13, lineHeight: 19, color: '#667085', marginTop: 14 },
  sheetAction: { minHeight: 52, borderRadius: 16, backgroundColor: '#1677FF', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  sheetActionText: { fontFamily: theme.typography.family.semiBold, fontSize: 15, color: '#fff' },
  footerNote: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#667085', lineHeight: 18, marginTop: 20, textAlign: 'center', paddingHorizontal: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#10182866' },
  languageSheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 },
  sheetHandle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#D0D5DD', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontFamily: theme.typography.family.semiBold, fontSize: 20, color: '#101828' },
  sheetNote: { fontFamily: theme.typography.family.main, fontSize: 13, color: '#667085', marginTop: 5, marginBottom: 16 },
  languageOption: { minHeight: 62, paddingHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EAECF0', borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  languageOptionActive: { borderColor: '#1677FF', backgroundColor: '#F0F7FF' },
  languageNative: { fontFamily: theme.typography.family.semiBold, fontSize: 16, color: '#101828' },
  languageEnglish: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#667085', marginTop: 1 },
});
