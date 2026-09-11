import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Switch, TouchableOpacity, Alert, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getSettings, setSetting, getAllReadings, getWorkers, getShiftsByWorker } from '../services/db';
import { generateCSV, getExportFilename } from '../services/csv';
import { AppSettings, DEFAULT_SETTINGS } from '../types';
import { getCurve } from '../services/calibration';
import { useAuth } from '../navigation/RootNavigator';
import * as FileSystem from 'expo-file-system/legacy';

function ThresholdRow({
  label, value, unit, onDecrement, onIncrement, description,
}: {
  label: string; value: number; unit: string;
  onDecrement: () => void; onIncrement: () => void;
  description?: string;
}) {
  return (
    <View style={styles.thresholdRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.thresholdLabel}>{label}</Text>
        {description && <Text style={styles.thresholdDesc}>{description}</Text>}
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepperBtn} onPress={onDecrement}>
          <Ionicons name="remove" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value} {unit}</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={onIncrement}>
          <Ionicons name="add" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  const { logout } = useAuth();
  const [settings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [exporting, setExporting] = useState(false);
  const curve = getCurve(settings.calibration_curve_version);

  useEffect(() => {
    getSettings().then(setLocalSettings);
  }, []);

  async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = { ...settings, [key]: value };
    setLocalSettings(updated);
    await setSetting(key, String(value));
  }

  function stepValue<K extends keyof AppSettings>(key: K, step: number, min: number, max: number) {
    const cur = settings[key] as number;
    const next = Math.min(max, Math.max(min, parseFloat((cur + step).toFixed(1))));
    updateSetting(key, next as any);
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

  function handleLogout() {
    Alert.alert(
      'Logout',
      'This will end your session. You will need to enter your PIN again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#f5f8ff', '#e8f1fb', '#c8daf4']} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* ── OEL / Thresholds ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>Exposure Thresholds</Text>
          </View>
          <Text style={styles.sectionNote}>
            Values are configurable. Defaults match India occupational exposure limits.
            Confirm with your safety authority before changing.
          </Text>

          <ThresholdRow
            label="OEL TWA"
            value={settings.oel_twa_ppm}
            unit="ppm"
            description="8-hour time-weighted average limit"
            onDecrement={() => stepValue('oel_twa_ppm', -0.5, 0.5, 50)}
            onIncrement={() => stepValue('oel_twa_ppm', 0.5, 0.5, 50)}
          />
          <ThresholdRow
            label="OEL STEL"
            value={settings.oel_stel_ppm}
            unit="ppm"
            description="Short-term exposure limit (15 min)"
            onDecrement={() => stepValue('oel_stel_ppm', -1, 1, 100)}
            onIncrement={() => stepValue('oel_stel_ppm', 1, 1, 100)}
          />
          <ThresholdRow
            label="Risk: Elevated TWA"
            value={settings.risk_elevated_twa}
            unit="ppm"
            description="TWA above this → Elevated band"
            onDecrement={() => stepValue('risk_elevated_twa', -0.5, 0.1, settings.risk_high_twa - 0.5)}
            onIncrement={() => stepValue('risk_elevated_twa', 0.5, 0.1, settings.risk_high_twa - 0.5)}
          />
          <ThresholdRow
            label="Risk: High TWA"
            value={settings.risk_high_twa}
            unit="ppm"
            description="TWA above this → High risk band"
            onDecrement={() => stepValue('risk_high_twa', -0.5, settings.risk_elevated_twa + 0.5, 50)}
            onIncrement={() => stepValue('risk_high_twa', 0.5, settings.risk_elevated_twa + 0.5, 50)}
          />
        </Card>

        {/* ── Calibration ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="color-filter-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>Calibration</Text>
          </View>
          <SettingRow icon="document-text-outline" label="Curve version" value={curve.version} />
          <SettingRow icon="information-circle-outline" label="Curve description" value="" chevron={false} />
          <Text style={styles.calibrationDesc}>{curve.description}</Text>
          <SettingRow
            icon="warning"
            label="Placeholder data"
            value="Replace before use"
            chevron={false}
          />
        </Card>

        {/* ── Unit ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="options-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>Units</Text>
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
            <Text style={styles.cardTitle}>Data & Export</Text>
          </View>
          <SettingRow icon="wifi-outline" label="Sync Status" value="Local only (sync not configured)" chevron={false} />
          <Button
            label={exporting ? 'Exporting…' : 'Export CSV for Compliance'}
            onPress={handleExport}
            disabled={exporting}
            style={styles.exportBtn}
          />
          <Text style={styles.exportNote}>
            Exports all readings with worker, shift, TWA, H₂S Index, and calibration version.
          </Text>
        </Card>

        {/* ── Account ── */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-outline" size={20} color={theme.colors.text.primary} />
            <Text style={styles.cardTitle}>Account</Text>
          </View>
          <SettingRow icon="lock-closed-outline" label="Change PIN" onPress={() => Alert.alert('Change PIN', 'Log out and log back in to set a new PIN.')} />
          <SettingRow icon="log-out-outline" label="Logout" onPress={handleLogout} />
        </Card>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Vajra सेतु · v1.0 · SIH26118</Text>
          <Text style={styles.appInfoText}>H₂S Cumulative Exposure Monitor</Text>
          <Text style={styles.appInfoText}>Index: Austigard & Smedbold (2022), Ann Work Expo Health 66(1)</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  thresholdLabel: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
  },
  thresholdDesc: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
    minWidth: 60,
    textAlign: 'center',
  },
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
