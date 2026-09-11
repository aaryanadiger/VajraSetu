import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../navigation/RootNavigator';
import { theme } from '../theme';
import { getAllReadingsToday, getSettings } from '../services/db';
import { AppSettings, Reading, RiskBand } from '../types';
import { AppLanguage, LANGUAGE_OPTIONS, isSarvamConfigured, translateUi } from '../services/translation';

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
    'bho-IN': { morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' },
    'hi-IN': { morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' },
    'mr-IN': { morning: 'शुभ सकाळ', afternoon: 'नमस्कार', evening: 'शुभ संध्याकाळ' },
    'kn-IN': { morning: 'ಶುಭೋದಯ', afternoon: 'ನಮಸ್ಕಾರ', evening: 'ಶುಭ ಸಂಜೆ' },
  };
  return values[language][period];
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { language, setLanguage } = useLanguage();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const tx = (key: Parameters<typeof translateUi>[0], fallback: string) => translateUi(key, language, fallback);
  const load = useCallback(async () => {
    const [today, appSettings] = await Promise.all([getAllReadingsToday(), getSettings()]);
    setReadings(today);
    setSettings(appSettings);
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
  const oel = settings?.oel_twa_ppm ?? 5;
  const exposure = latest?.band_valid ? latest.cumulative_ppm_hr : 0;
  const progress = latest?.band_valid ? Math.min(1, latest.twa_ppm / oel) : 0;
  const selectedLanguage = LANGUAGE_OPTIONS.find(item => item.code === language) ?? LANGUAGE_OPTIONS[0];
  const openScan = () => navigation.navigate('Scan', { screen: 'CaptureMain' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <Text style={styles.greeting}>{greeting(language)}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconControl} onPress={() => setLanguageOpen(true)} accessibilityRole="button" accessibilityLabel="Choose language">
              <Ionicons name="language-outline" size={22} color="#344054" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountBadge} onPress={() => navigation.navigate('Settings')} accessibilityRole="button" accessibilityLabel={tx('account', 'Account')}>
              <Ionicons name="person" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.screenTitle}>{tx('safetyCheck', 'Your safety check')}</Text>

        <View style={styles.exposureSurface}>
          <View style={styles.surfaceHeader}>
            <Text style={styles.surfaceLabel}>{tx('latestExposure', 'Latest recorded exposure')}</Text>
            {latest && <View style={[styles.statusPill, { backgroundColor: `${status.color}14` }]}><Ionicons name={status.icon} size={14} color={status.color} /><Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text></View>}
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
                <Text style={styles.meterLimit}>{tx('referenceLimit', 'Threshold')}: {oel} ppm TWA</Text>
                <Text style={styles.meterLabel}>{oel}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.utilityPanel}>
          <UtilityRow icon="time-outline" title="Shift duration" value="8 hours" last />
          <UtilityRow icon="hardware-chip-outline" title="Wristband status" value={latest?.band_valid ? status.label : 'Not scanned'} valueColor={latest ? status.color : undefined} />
        </View>

        <TouchableOpacity style={styles.primaryAction} onPress={openScan} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={tx('scanWristband', 'Scan wristband')}>
          <View style={styles.primaryIcon}><Ionicons name="scan" size={22} color="#fff" /></View>
          <View style={styles.primaryCopy}>
            <Text style={styles.primaryTitle}>{tx('scanWristband', 'Scan wristband')}</Text>
            <Text style={styles.primaryHint}>{tx('takesTenSeconds', 'Takes about 10 seconds')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <QuickAction icon="document-text-outline" label="Wristband manual" onPress={() => navigation.navigate('History')} />
          <QuickAction icon="shield-checkmark-outline" label="Safety guide" onPress={() => navigation.navigate('History')} />
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
    </SafeAreaView>
  );
};

const SegmentedMeter: React.FC<{ fraction: number; color: string }> = ({ fraction, color }) => {
  const filled = Math.max(0, Math.round(fraction * 24));
  return <View style={styles.meter}>{Array.from({ length: 24 }, (_, index) => <View key={index} style={[styles.segment, index < filled && { backgroundColor: color }, index === 12 && styles.thresholdSegment]} />)}</View>;
};

const UtilityRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; value: string; valueColor?: string; last?: boolean }> = ({ icon, title, value, valueColor, last }) => (
  <View style={[styles.utilityRow, last && styles.utilityRowLast]}>
    <View style={styles.utilityIcon}><Ionicons name={icon} size={20} color="#344054" /></View>
    <Text style={styles.utilityTitle}>{title}</Text>
    <Text style={[styles.utilityValue, valueColor && { color: valueColor }]}>{value}</Text>
    <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
  </View>
);

const QuickAction: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
    <Ionicons name={icon} size={23} color="#1677FF" />
    <Text style={styles.quickActionText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F9' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 38, height: 38 },
  wordmark: { fontFamily: theme.typography.family.logo, fontSize: 29, color: '#101828', letterSpacing: -0.5 },
  greeting: { marginTop: 5, fontFamily: theme.typography.family.main, fontSize: 13, color: '#667085' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconControl: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center' },
  accountBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1677FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D0E5FF' },
  screenTitle: { fontFamily: theme.typography.family.semiBold, fontSize: 20, color: '#101828', marginBottom: 12 },
  exposureSurface: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#EAECF0' },
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
  utilityPanel: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: '#EAECF0' },
  utilityRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  utilityRowLast: { borderBottomWidth: 0 },
  utilityIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  utilityTitle: { flex: 1, fontFamily: theme.typography.family.medium, fontSize: 15, color: '#344054' },
  utilityValue: { fontFamily: theme.typography.family.semiBold, fontSize: 14, color: '#101828' },
  primaryAction: { minHeight: 76, borderRadius: 20, backgroundColor: '#1677FF', marginTop: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  primaryIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ffffff2B', alignItems: 'center', justifyContent: 'center' },
  primaryCopy: { flex: 1 },
  primaryTitle: { fontFamily: theme.typography.family.semiBold, fontSize: 17, color: '#fff' },
  primaryHint: { fontFamily: theme.typography.family.main, fontSize: 12, color: '#D9EAFF', marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickAction: { flex: 1, minHeight: 82, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAECF0', borderRadius: 18, padding: 14, justifyContent: 'space-between' },
  quickActionText: { fontFamily: theme.typography.family.medium, fontSize: 13, color: '#344054', marginTop: 10 },
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
