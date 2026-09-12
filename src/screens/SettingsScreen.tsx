import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, Share, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useSarvamText } from '../hooks/useSarvamText';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAccountProfile, getSettings, saveAccountProfile, setSetting, getAllReadings, getWorkers, getShiftsByWorker } from '../services/db';
import { generateCSV, getExportFilename } from '../services/csv';
import { AccountProfile, AppSettings, DEFAULT_SETTINGS, INDIA_FACTORY_H2S_LIMITS } from '../types';
import { getCurve } from '../services/calibration';
import * as FileSystem from 'expo-file-system/legacy';

function SettingRow({
  icon, label, value, onPress, chevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; value?: string; onPress?: () => void; chevron?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {chevron && onPress && <Ionicons name="chevron-forward" size={16} color={theme.colors.text.light} />}
      </View>
    </TouchableOpacity>
  );
}

export const SettingsScreen: React.FC = () => {
  const t = useSarvamText();
  const [settings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [exporting, setExporting] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState('');
  const [workerCode, setWorkerCode] = useState('');
  const [siteId, setSiteId] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const curve = getCurve(settings.calibration_curve_version);

  useEffect(() => {
    Promise.all([getSettings(), getAccountProfile()]).then(([appSettings, account]) => {
      setLocalSettings(appSettings);
      setProfile(account);
    });
  }, []);

  function openProfile() {
    setName(profile?.name ?? '');
    setWorkerCode(profile?.worker_code ?? '');
    setSiteId(profile?.site_id ?? '');
    setProfileError('');
    setProfileOpen(true);
  }

  async function saveProfile() {
    if (!name.trim() || !workerCode.trim() || !siteId.trim()) {
      setProfileError('Enter your name, worker ID, and site.');
      return;
    }
    setSavingProfile(true);
    try {
      const saved = await saveAccountProfile({ name, worker_code: workerCode, site_id: siteId });
      setProfile(saved);
      setProfileOpen(false);
    } catch {
      setProfileError('That worker ID is already in use. Check it and try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = { ...settings, [key]: value };
    setLocalSettings(updated);
    await setSetting(key, String(value));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const readings = await getAllReadings();
      if (readings.length === 0) {
        Alert.alert('No Data', 'There are no readings to export yet.');
        setExporting(false);
        return;
      }
      const csv = generateCSV(readings.map(r => ({ reading: r })));
      const filename = getExportFilename();
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({ url: path, message: `Vajra-Setu exposure data: ${filename}` });
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#f5f8ff', '#e8f1fb', '#c8daf4']} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{t('Settings')}</Text>
        </View>

        {/* ── Indian factory safety reference — intentionally read-only ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>{t('Indian factory H₂S reference')}</Text>
          </View>
          <View style={styles.limitRow}>
            <View><Text style={styles.limitLabel}>{t('8-hour TWA limit')}</Text><Text style={styles.limitNote}>{t('Schedule II reference')}</Text></View>
            <Text style={styles.limitValue}>{INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm} ppm</Text>
          </View>
          <View style={styles.limitRow}>
            <View><Text style={styles.limitLabel}>{t('15-minute STEL')}</Text><Text style={styles.limitNote}>{t('Schedule II reference')}</Text></View>
            <Text style={styles.limitValue}>{INDIA_FACTORY_H2S_LIMITS.scheduleIiStelPpm} ppm</Text>
          </View>
          <Text style={styles.safetyDisclaimer}>{t('This wristband estimates cumulative exposure. It cannot measure instantaneous peaks or establish legal compliance. Follow your site’s H₂S procedure and supervisor instructions.')}</Text>
        </Card>

        {/* ── Calibration ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-filter-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>{t('Calibration')}</Text>
          </View>
          <SettingRow icon="document-text-outline" label={t('Curve version')} value={curve.version} />
          <SettingRow icon="information-circle-outline" label={t('Curve description')} value="" chevron={false} />
          <Text style={styles.calibrationDesc}>{curve.description}</Text>
          <SettingRow
            icon="warning"
            label={t('Prototype calibration')}
            value={t('Replace before use')}
            chevron={false}
          />
        </Card>

        {/* ── Unit ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="options-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>{t('Units')}</Text>
          </View>
          <View style={styles.unitToggle}>
            {(['ppm_hr', 'mg_m3_hr'] as const).map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.unitOption, settings.unit === u && styles.unitOptionActive]}
                onPress={() => updateSetting('unit', u)}
              >
                <Text style={[styles.unitText, settings.unit === u && styles.unitTextActive]}>
                  {u === 'ppm_hr' ? 'ppm·hr' : 'mg/m³·hr'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Data & Export ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="cloud-download-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>{t('Data & export')}</Text>
          </View>
          <SettingRow icon="wifi-outline" label={t('Sync status')} value={t('Local only')} chevron={false} />
          <Button
            label={exporting ? t('Exporting…') : t('Export CSV')}
            onPress={handleExport}
            disabled={exporting}
            style={styles.exportBtn}
          />
          <Text style={styles.exportNote}>
            {t('Exports your readings with TWA, H₂S Index, and calibration version.')}
          </Text>
        </Card>

        {/* ── Account ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>{t('Account')}</Text>
          </View>
          <View style={styles.profileSummary}>
            <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{(profile?.name ?? 'Worker').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.name ?? t('Finish your profile')}</Text>
              <Text style={styles.profileMeta}>{profile ? `${profile.worker_code} · ${profile.site_id}` : t('Your scans are stored on this device.')}</Text>
            </View>
          </View>
          <Button label={profile ? t('Edit account details') : t('Add account details')} variant="outline" onPress={openProfile} style={styles.accountButton} />
        </Card>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Vajra सेतु · v1.0 · SIH26118</Text>
          <Text style={styles.appInfoText}>H₂S Cumulative Exposure Monitor</Text>
          <Text style={styles.appInfoText}>Index: Austigard & Smedbold (2022), Ann Work Expo Health 66(1)</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <Modal visible={profileOpen} transparent animationType="slide" onRequestClose={() => setProfileOpen(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.profileSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('Your account')}</Text>
            <Text style={styles.sheetNote}>{t('These details label your personal exposure record.')}</Text>
            <TextInput style={styles.profileInput} value={name} onChangeText={setName} placeholder={t('Full name')} autoCapitalize="words" />
            <TextInput style={styles.profileInput} value={workerCode} onChangeText={setWorkerCode} placeholder={t('Worker ID')} autoCapitalize="characters" />
            <TextInput style={styles.profileInput} value={siteId} onChangeText={setSiteId} placeholder={t('Site / factory')} autoCapitalize="characters" />
            {profileError ? <Text style={styles.profileError}>{profileError}</Text> : null}
            <Button label={savingProfile ? t('Saving…') : t('Save details')} onPress={saveProfile} disabled={savingProfile} style={styles.sheetButton} />
            <Button label={t('Cancel')} variant="outline" onPress={() => setProfileOpen(false)} />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  sectionNote: {
    fontFamily: theme.typography.family.main,
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  limitLabel: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.text.primary },
  limitNote: { fontFamily: theme.typography.family.main, fontSize: 11, color: theme.colors.text.secondary, marginTop: 2, maxWidth: 220, lineHeight: 15 },
  limitValue: { fontFamily: theme.typography.family.bold, fontSize: theme.typography.size.md, color: '#1677FF' },
  safetyDisclaimer: { fontFamily: theme.typography.family.main, fontSize: 11, lineHeight: 16, color: theme.colors.text.secondary, backgroundColor: '#F8FAFC', borderRadius: 12, padding: theme.spacing.md, marginTop: theme.spacing.sm },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  settingLabel: {
    flex: 1,
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  settingValue: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
    maxWidth: 160,
    textAlign: 'right',
  },
  calibrationDesc: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
    lineHeight: 16,
    paddingLeft: 28,
    marginBottom: theme.spacing.sm,
    fontStyle: 'italic',
  },
  unitToggle: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  unitOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.btn,
    backgroundColor: '#f0f4fa',
    alignItems: 'center',
  },
  unitOptionActive: { backgroundColor: theme.colors.primaryLight },
  unitText: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
  },
  unitTextActive: { color: theme.colors.text.primary },
  exportBtn: { width: '100%', marginTop: theme.spacing.md },
  profileSummary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1677FF', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontFamily: theme.typography.family.bold, fontSize: 14, color: '#fff' },
  profileName: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.md, color: theme.colors.text.primary },
  profileMeta: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.xs, color: theme.colors.text.secondary, marginTop: 2 },
  accountButton: { width: '100%', marginBottom: theme.spacing.sm },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#10182866' },
  profileSheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: theme.spacing.xl, gap: theme.spacing.md },
  sheetHandle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#D0D5DD', alignSelf: 'center', marginBottom: theme.spacing.xs },
  sheetTitle: { fontFamily: theme.typography.family.semiBold, fontSize: 21, color: theme.colors.text.primary },
  sheetNote: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.sm, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm },
  profileInput: { minHeight: 52, borderRadius: 14, backgroundColor: '#F3F6FA', paddingHorizontal: theme.spacing.lg, fontFamily: theme.typography.family.main, fontSize: theme.typography.size.md, color: theme.colors.text.primary },
  profileError: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.xs, color: theme.colors.semantic.danger },
  sheetButton: { width: '100%' },
  exportNote: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  appInfo: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
  },
  appInfoText: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.light,
    textAlign: 'center',
  },
});
