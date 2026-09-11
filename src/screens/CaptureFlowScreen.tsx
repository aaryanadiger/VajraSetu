import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme';
import { AppHeader } from '../components/ui/AppHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ExposureGauge } from '../components/ExposureGauge';
import { CameraOverlay } from '../components/CameraOverlay';
import { getWorkers, getSettings, createShift, createWristband, saveReading } from '../services/db';
import { extractRegionsFromImage } from '../services/imageProcessing';
import { runExposurePipeline } from '../services/exposure';
import { Worker, ProcessingResult, AppSettings, RiskBand } from '../types';

type Step = 'select' | 'camera' | 'processing' | 'result';

const PROCESSING_STEPS = [
  'Perspective correction…',
  'Normalising colours…',
  'Computing ΔE (CIEDE2000)…',
  'Validating band expiry…',
  'Mapping to ppm·hr…',
  'Calculating H₂S Index…',
  'Classifying risk band…',
];

function riskToBadge(band: RiskBand): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (band) {
    case 'low': return 'success';
    case 'elevated': return 'warning';
    case 'high': return 'danger';
    default: return 'neutral';
  }
}

function riskLabel(band: RiskBand): string {
  switch (band) {
    case 'low': return 'LOW EXPOSURE';
    case 'elevated': return 'ELEVATED';
    case 'high': return 'HIGH RISK';
    case 'invalid': return 'INVALID BAND';
    default: return 'UNKNOWN';
  }
}

export const CaptureFlowScreen: React.FC = () => {
  const [step, setStep] = useState<Step>('select');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [shiftHours, setShiftHours] = useState(8);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    Promise.all([getWorkers(), getSettings()]).then(([ws, s]) => {
      setWorkers(ws);
      setSettings(s);
    });
  }, []);

  // ── Step 1: Select ──────────────────────────────────────────────────────────

  function handleStartCapture() {
    if (!selectedWorker) {
      Alert.alert('Select Worker', 'Please select a worker before scanning.');
      return;
    }
    if (!cameraPermission?.granted) {
      requestCameraPermission().then(perm => {
        if (perm.granted) setStep('camera');
      });
    } else {
      setStep('camera');
    }
  }

  // ── Step 2: Camera ──────────────────────────────────────────────────────────

  async function handleCapture() {
    setStep('processing');
    setProcessingStep(0);
    progressAnim.setValue(0);

    let imageUri = '';
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
        imageUri = photo?.uri ?? '';
      }
    } catch {
      // Fall through to demo mode in extractRegionsFromImage
    }

    await runProcessingPipeline(imageUri);
  }

  // ── Step 3: Processing ──────────────────────────────────────────────────────

  async function runProcessingPipeline(imageUri: string) {
    if (!settings) return;

    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setProcessingStep(i);
      Animated.timing(progressAnim, {
        toValue: (i + 1) / PROCESSING_STEPS.length,
        duration: 350,
        useNativeDriver: false,
      }).start();
      await sleep(400 + Math.random() * 300);
    }

    const regions = await extractRegionsFromImage(imageUri);
    const res = await runExposurePipeline(regions, shiftHours, settings);
    setResult(res);

    // Persist to DB
    if (selectedWorker) {
      try {
        const wristband = await createWristband({
          batch_id: `BATCH-${Date.now()}`,
          issued_at: new Date().toISOString(),
          expiry_calibration_version: settings.calibration_curve_version,
        });
        const shift = await createShift({
          worker_id: selectedWorker.id,
          start_time: new Date(Date.now() - shiftHours * 3600000).toISOString(),
          end_time: new Date().toISOString(),
          wristband_id: wristband.id,
        });
        await saveReading({
          shift_id: shift.id,
          wristband_id: wristband.id,
          captured_at: new Date().toISOString(),
          raw_image_path: imageUri || null,
          ...res,
        });
      } catch (e) {
        console.warn('[CaptureFlow] DB save error', e);
      }
    }

    setStep('result');
  }

  // ── Step 4: Result ──────────────────────────────────────────────────────────

  function handleReset() {
    setStep('select');
    setResult(null);
    setSelectedWorker(null);
    setProcessingStep(0);
    progressAnim.setValue(0);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#f5f8ff', '#e8f1fb', '#c8daf4']} style={StyleSheet.absoluteFill} />

      {step !== 'camera' && <AppHeader />}

      {step === 'select' && (
        <SelectStep
          workers={workers}
          selectedWorker={selectedWorker}
          onSelectWorker={setSelectedWorker}
          shiftHours={shiftHours}
          onShiftHoursChange={setShiftHours}
          onNext={handleStartCapture}
        />
      )}

      {step === 'camera' && (
        <CameraStep
          cameraRef={cameraRef}
          onCapture={handleCapture}
          onBack={() => setStep('select')}
        />
      )}

      {step === 'processing' && (
        <ProcessingStep
          currentStep={processingStep}
          progressAnim={progressAnim}
        />
      )}

      {step === 'result' && result && (
        <ResultStep
          result={result}
          worker={selectedWorker}
          settings={settings}
          onRescan={handleReset}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Select Step ──────────────────────────────────────────────────────────────

const SHIFT_OPTIONS = [6, 8, 10, 12];

const SelectStep: React.FC<{
  workers: Worker[];
  selectedWorker: Worker | null;
  onSelectWorker: (w: Worker) => void;
  shiftHours: number;
  onShiftHoursChange: (h: number) => void;
  onNext: () => void;
}> = ({ workers, selectedWorker, onSelectWorker, shiftHours, onShiftHoursChange, onNext }) => (
  <ScrollView contentContainerStyle={styles.scrollContent}>
    <Text style={styles.pageTitle}>New Scan</Text>
    <Text style={styles.pageSubtitle}>Select worker and shift duration</Text>

    <Card style={styles.sectionCard}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="person-outline" size={20} color={theme.colors.text.primary} />
        <Text style={styles.cardSectionTitle}>Select Worker</Text>
      </View>
      {workers.length === 0 ? (
        <Text style={styles.emptyText}>No workers found. Add workers in the Roster tab first.</Text>
      ) : (
        workers.map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.workerOption, selectedWorker?.id === w.id && styles.workerOptionSelected]}
            onPress={() => onSelectWorker(w)}
            activeOpacity={0.75}
          >
            <View style={styles.workerInitialBadge}>
              <Text style={styles.workerInitialText}>{w.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerOptionName}>{w.name}</Text>
              <Text style={styles.workerOptionCode}>{w.worker_code}</Text>
            </View>
            {selectedWorker?.id === w.id && (
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))
      )}
    </Card>

    <Card style={styles.sectionCard}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="time-outline" size={20} color={theme.colors.text.primary} />
        <Text style={styles.cardSectionTitle}>Shift Duration</Text>
      </View>
      <View style={styles.shiftOptions}>
        {SHIFT_OPTIONS.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.shiftOption, shiftHours === h && styles.shiftOptionActive]}
            onPress={() => onShiftHoursChange(h)}
            activeOpacity={0.75}
          >
            <Text style={[styles.shiftOptionText, shiftHours === h && styles.shiftOptionTextActive]}>
              {h}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>

    <View style={styles.demoNotice}>
      <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
      <Text style={styles.demoText}>
        Running in demo mode — results use a simulated image. Real scanning requires a dev build.
      </Text>
    </View>

    <Button
      label="Proceed to Camera →"
      onPress={onNext}
      style={styles.nextBtn}
    />
  </ScrollView>
);

// ─── Camera Step ──────────────────────────────────────────────────────────────

const CameraStep: React.FC<{
  cameraRef: React.RefObject<CameraView | null>;
  onCapture: () => void;
  onBack: () => void;
}> = ({ cameraRef, onCapture, onBack }) => (
  <View style={{ flex: 1 }}>
    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
    <CameraOverlay />
    <View style={styles.cameraUI}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.cameraInstructions}>
        <Text style={styles.cameraInstrText}>Align wristband + reference scale in the frame</Text>
      </View>
      <TouchableOpacity style={styles.captureBtn} onPress={onCapture} activeOpacity={0.8}>
        <View style={styles.captureBtnInner} />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Processing Step ──────────────────────────────────────────────────────────

const ProcessingStep: React.FC<{ currentStep: number; progressAnim: Animated.Value }> = ({
  currentStep, progressAnim,
}) => (
  <View style={styles.processingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={styles.processingTitle}>Analysing wristband…</Text>
    <View style={styles.progressBarBg}>
      <Animated.View
        style={[
          styles.progressBarFill,
          { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
    <Text style={styles.processingStep}>{PROCESSING_STEPS[currentStep]}</Text>
    <View style={styles.stepsList}>
      {PROCESSING_STEPS.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <Ionicons
            name={i < currentStep ? 'checkmark-circle' : i === currentStep ? 'ellipse' : 'ellipse-outline'}
            size={16}
            color={i < currentStep ? theme.colors.semantic.success : i === currentStep ? theme.colors.primary : theme.colors.text.light}
          />
          <Text style={[styles.stepText, i > currentStep && styles.stepTextDim]}>{s}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ─── Result Step ──────────────────────────────────────────────────────────────

const ResultStep: React.FC<{
  result: ProcessingResult;
  worker: Worker | null;
  settings: AppSettings | null;
  onRescan: () => void;
}> = ({ result, worker, settings, onRescan }) => {
  if (!result.band_valid) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.invalidCard}>
          <View style={styles.invalidIcon}>
            <Ionicons name="alert-circle" size={48} color={theme.colors.semantic.danger} />
          </View>
          <Text style={styles.invalidTitle}>Band Invalid</Text>
          <Text style={styles.invalidBody}>
            The FeSO₄ expiry indicator on this wristband is outside the calibrated range.
            The sensing region reading cannot be trusted.
          </Text>
          <Text style={styles.invalidDeltaE}>Expiry ΔE: {result.expiry_delta_e.toFixed(2)}</Text>
          <View style={styles.replaceCTA}>
            <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.semantic.warning} />
            <Text style={styles.replaceCTAText}>Replace this wristband before the next shift.</Text>
          </View>
          <Button label="Scan New Wristband" onPress={onRescan} style={{ marginTop: theme.spacing.lg }} />
        </Card>
      </ScrollView>
    );
  }

  const oel = settings?.oel_twa_ppm ?? 5;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.resultHeader}>
        {worker && <Text style={styles.resultWorkerName}>{worker.name}</Text>}
        <Badge label={riskLabel(result.risk_band)} variant={riskToBadge(result.risk_band)} style={styles.riskBadge} />
      </View>

      {/* Gauge */}
      <Card>
        <Text style={styles.cardSectionTitle}>Cumulative Exposure</Text>
        <ExposureGauge
          value={result.cumulative_ppm_hr}
          max={oel * 12}
          thresholdValue={oel * 8}
          thresholdLabel={`OEL (8h): ${(oel * 8).toFixed(0)} ppm·hr`}
        />
      </Card>

      {/* Metrics */}
      <Card>
        <View style={styles.metricsGrid}>
          <MetricBox
            label="TWA"
            value={`${result.twa_ppm.toFixed(3)}`}
            unit="ppm"
            sub={`OEL: ${oel} ppm`}
            alert={result.twa_ppm >= oel}
          />
          <MetricBox
            label="H₂S Index"
            value={`${result.h2s_index.toFixed(1)}`}
            unit=""
            sub="Estimated (single sample)"
          />
          <MetricBox
            label="Sensing ΔE"
            value={`${result.sensing_delta_e.toFixed(2)}`}
            unit="ΔE₀₀"
            sub="CIEDE2000"
          />
          <MetricBox
            label="Expiry ΔE"
            value={`${result.expiry_delta_e.toFixed(2)}`}
            unit="ΔE₀₀"
            sub="Band valid ✓"
            highlight
          />
        </View>

        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.text.secondary} />
          <Text style={styles.noticeText}>
            Index mode: {result.index_mode.replace(/_/g, ' ')} · Calibration: {result.calibration_curve_version}
          </Text>
        </View>
      </Card>

      <Button label="New Scan" variant="outline" onPress={onRescan} style={styles.rescanBtn} />
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const MetricBox: React.FC<{
  label: string; value: string; unit: string; sub: string;
  alert?: boolean; highlight?: boolean;
}> = ({ label, value, unit, sub, alert, highlight }) => (
  <View style={[styles.metricBox, highlight && styles.metricBoxHighlight]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
      <Text style={[styles.metricValue, alert && { color: theme.colors.semantic.danger }]}>{value}</Text>
      {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
    </View>
    <Text style={styles.metricSub}>{sub}</Text>
  </View>
);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { padding: theme.spacing.xl, paddingBottom: 100 },
  pageTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xxxl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
    marginBottom: theme.spacing.xs,
  },
  pageSubtitle: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  sectionCard: { marginHorizontal: 0, marginBottom: theme.spacing.lg },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  cardSectionTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  workerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.xs,
    backgroundColor: '#f0f4fa',
  },
  workerOptionSelected: { backgroundColor: theme.colors.primaryLight },
  workerInitialBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInitialText: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.md,
    color: '#fff',
  },
  workerOptionName: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
  },
  workerOptionCode: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  emptyText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  shiftOptions: { flexDirection: 'row', gap: theme.spacing.md },
  shiftOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.btn,
    backgroundColor: '#f0f4fa',
    alignItems: 'center',
  },
  shiftOptionActive: { backgroundColor: theme.colors.primaryLight },
  shiftOptionText: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.secondary,
  },
  shiftOptionTextActive: { color: theme.colors.text.primary },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(43,150,255,0.1)',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  demoText: {
    flex: 1,
    fontFamily: theme.typography.family.main,
    fontSize: 12,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  nextBtn: { width: '100%' },
  // Camera
  cameraUI: { flex: 1, justifyContent: 'space-between', padding: theme.spacing.xl, paddingTop: 50 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },
  cameraInstructions: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  cameraInstrText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: '#fff',
    textAlign: 'center',
  },
  captureBtn: {
    width: 72, height: 72,
    borderRadius: 36,
    borderWidth: 3, borderColor: '#fff',
    alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtnInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
  },
  // Processing
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  processingTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.semantic.neutral,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  processingStep: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
  },
  stepsList: { width: '100%', gap: theme.spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  stepText: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.primary,
  },
  stepTextDim: { color: theme.colors.text.light },
  // Result
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  resultWorkerName: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xxxl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
    flex: 1,
  },
  riskBadge: { marginLeft: theme.spacing.md },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f5f8ff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    gap: 2,
  },
  metricBoxHighlight: { backgroundColor: 'rgba(34,197,94,0.1)' },
  metricLabel: {
    fontFamily: theme.typography.family.medium,
    fontSize: 11,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.xl,
    color: theme.colors.text.primary,
  },
  metricUnit: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
  },
  metricSub: {
    fontFamily: theme.typography.family.main,
    fontSize: 10,
    color: theme.colors.text.light,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  noticeText: {
    fontFamily: theme.typography.family.main,
    fontSize: 11,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  rescanBtn: { marginTop: theme.spacing.lg },
  // Invalid
  invalidCard: { marginHorizontal: 0, alignItems: 'center', gap: theme.spacing.lg },
  invalidIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  invalidTitle: {
    fontFamily: theme.typography.family.bold,
    fontSize: theme.typography.size.xl,
    color: theme.colors.semantic.danger,
  },
  invalidBody: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  invalidDeltaE: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
  },
  replaceCTA: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    width: '100%',
  },
  replaceCTAText: {
    fontFamily: theme.typography.family.medium,
    fontSize: theme.typography.size.sm,
    color: theme.colors.semantic.warning,
    flex: 1,
  },
});
