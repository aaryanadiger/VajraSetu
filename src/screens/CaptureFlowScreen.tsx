import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../navigation/RootNavigator';
import { useSarvamText } from '../hooks/useSarvamText';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CameraOverlay } from '../components/CameraOverlay';
import {
  createShift,
  createWristband,
  createWorker,
  getAccountProfile,
  getWorkerById,
  getWorkers,
  getSettings,
  saveReading,
} from '../services/db';
import { CaptureError, extractRegionsFromImage } from '../services/imageProcessing';
import { runExposurePipeline } from '../services/exposure';
import { AppSettings, ProcessingResult, RiskBand } from '../types';
import { AppLanguage, translateUi } from '../services/translation';

type Step = 'camera' | 'processing' | 'result' | 'unreadable';
type AlignmentStatus = 'checking' | 'aligned' | 'adjust' | 'lighting' | 'unavailable';

const PIPELINE_STAGES = [
  'Checking the card position',
  'Reading the expiry indicator',
  'Reading the H₂S indicator',
  'Categorising the colour change',
  'Preparing your result',
];

// A shift duration is not chosen at the camera. The current prototype uses
// the standard 8-hour reference consistently for every cumulative reading.
const REFERENCE_SHIFT_HOURS = 8;
const ALIGNMENT_CHECK_INTERVAL_MS = 1250;

function riskCopy(band: RiskBand, language: AppLanguage) {
  switch (band) {
    case 'elevated':
      return { title: translateUi('elevatedTitle', language, 'Exposure is elevated'), body: translateUi('elevatedBody', language, 'Pause when safe and tell your supervisor.'), icon: 'warning' as const, color: theme.colors.semantic.warning };
    case 'high':
      return { title: translateUi('highTitle', language, 'High exposure detected'), body: translateUi('highBody', language, 'Leave the area and alert your supervisor now.'), icon: 'alert-circle' as const, color: theme.colors.semantic.danger };
    default:
      return { title: translateUi('normalTitle', language, 'Within the normal range'), body: translateUi('normalBody', language, 'Continue following your site safety procedure.'), icon: 'checkmark-circle' as const, color: theme.colors.semantic.success };
  }
}

export const CaptureFlowScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { language } = useLanguage();
  const sarvamText = useSarvamText();
  const [step, setStep] = useState<Step>('camera');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(Boolean(route.params?.initialTorch));
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProblem, setCaptureProblem] = useState('');
  const [alignmentStatus, setAlignmentStatus] = useState<AlignmentStatus>('checking');
  const cameraRef = useRef<CameraView>(null);
  const alignmentCheckInFlight = useRef(false);
  const alignmentSuccesses = useRef(0);
  const alignmentFailures = useRef(0);
  const alignmentStatusRef = useRef<AlignmentStatus>('checking');
  const tx = (key: Parameters<typeof translateUi>[0], fallback: string) => {
    const local = translateUi(key, language, fallback);
    return local === fallback ? sarvamText(fallback) : local;
  };

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    setTorchOn(Boolean(route.params?.initialTorch));
  }, [route.params?.initialTorch]);

  useEffect(() => {
    if (step !== 'camera' || !isFocused || !cameraReady || !permission?.granted) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const updateAlignmentStatus = (next: AlignmentStatus) => {
      alignmentStatusRef.current = next;
      setAlignmentStatus(next);
    };

    const checkAlignment = async () => {
      if (cancelled || alignmentCheckInFlight.current || alignmentStatusRef.current === 'unavailable') return;
      alignmentCheckInFlight.current = true;
      let previewUri: string | undefined;
      let scannerUnavailable = false;

      try {
        // expo-camera does not expose raw preview frames, so sample a small
        // compressed still periodically. Do not use skipProcessing here: it
        // bypasses JPEG quality and orientation correction, creating full-size
        // frames that make iOS stutter during the live alignment check.
        // Two readable samples are required before the UI declares the card
        // aligned, which keeps the status from flickering.
        const preview = await cameraRef.current?.takePictureAsync({
          quality: 0.1,
          base64: true,
          exif: false,
          shutterSound: false,
        });
        previewUri = preview?.uri;
        await extractRegionsFromImage(preview?.base64 ?? '');

        alignmentFailures.current = 0;
        alignmentSuccesses.current += 1;
        if (alignmentSuccesses.current >= 2) updateAlignmentStatus('aligned');
      } catch (error) {
        alignmentSuccesses.current = 0;
        alignmentFailures.current += 1;
        const nextStatus: AlignmentStatus = error instanceof CaptureError && error.problem === 'poor_lighting'
          ? 'lighting'
          : error instanceof CaptureError && error.problem === 'native_scanner_unavailable'
            ? 'unavailable'
            : 'adjust';
        scannerUnavailable = nextStatus === 'unavailable';

        // Once stable, tolerate one poor frame so small hand movements do
        // not immediately remove the ready confirmation.
        if (nextStatus === 'unavailable' || alignmentFailures.current >= 2 || alignmentStatusRef.current !== 'aligned') {
          updateAlignmentStatus(nextStatus);
        }
      } finally {
        alignmentCheckInFlight.current = false;
        if (previewUri) void FileSystem.deleteAsync(previewUri, { idempotent: true }).catch(() => undefined);
        if (!cancelled && !scannerUnavailable) {
          timer = setTimeout(() => void checkAlignment(), ALIGNMENT_CHECK_INTERVAL_MS);
        }
      }
    };

    void checkAlignment();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cameraReady, isFocused, permission?.granted, step]);

  async function handleCapture() {
    if (!settings || capturing || alignmentStatus !== 'aligned') return;
    setCapturing(true);
    setStep('processing');
    setStageIndex(0);

    let imageUri = '';
    let processed: ProcessingResult;
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        base64: true,
        exif: false,
        shutterSound: false,
      });
      imageUri = photo?.uri ?? '';

      let progressIndex = 0;
      for (const _stage of PIPELINE_STAGES) {
        setStageIndex(progressIndex);
        await pause(100);
        progressIndex += 1;
      }

      const regions = await extractRegionsFromImage(photo?.base64 ?? '');
      processed = await runExposurePipeline(regions, REFERENCE_SHIFT_HOURS, settings);
      setResult(processed);
    } catch (error) {
      const message = error instanceof CaptureError
        ? error.message
        : 'We could not read the two indicators. Centre the small card and try again.';
      setCaptureProblem(message);
      setStep('unreadable');
      setCapturing(false);
      return;
    }

    try {
      const profile = await getAccountProfile();
      const profileWorker = profile ? await getWorkerById(profile.worker_id) : null;
      const workers = profileWorker ? [] : await getWorkers();
      // Every scan belongs to the signed-in worker profile. The fallback keeps
      // older installs usable until they complete their profile in Settings.
      const worker = profileWorker ?? workers[0] ?? await createWorker({
        name: 'Worker',
        worker_code: 'WORKER-001',
        site_id: 'DEFAULT_SITE',
      });
      const wristband = await createWristband({
          batch_id: `BATCH-${Date.now()}`,
          issued_at: new Date().toISOString(),
          expiry_calibration_version: settings.calibration_curve_version,
      });
      const shift = await createShift({
          worker_id: worker.id,
          start_time: new Date(Date.now() - REFERENCE_SHIFT_HOURS * 3600000).toISOString(),
          end_time: new Date().toISOString(),
          wristband_id: wristband.id,
      });
      await saveReading({
          shift_id: shift.id,
          wristband_id: wristband.id,
          captured_at: new Date().toISOString(),
          raw_image_path: imageUri || null,
          ...processed,
      });
    } catch (error) {
      console.warn('[CaptureFlow] Could not save reading', error);
    }

    setStep('result');
    setCapturing(false);
  }

  function reset() {
    setStep('camera');
    setResult(null);
    setStageIndex(0);
    setCameraReady(false);
    setCapturing(false);
    setCaptureProblem('');
    alignmentSuccesses.current = 0;
    alignmentFailures.current = 0;
    alignmentStatusRef.current = 'checking';
    setAlignmentStatus('checking');
  }

  if (step === 'camera') {
    if (!permission) {
      return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;
    }
    if (!permission.granted) {
      return <PermissionStep onPress={requestPermission} />;
    }
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          active={isFocused}
          facing="back"
          autofocus="on"
          animateShutter={false}
          enableTorch={torchOn}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => setCameraReady(false)}
        />
        <CameraOverlay color={alignmentStatus === 'aligned' ? '#34D399' : alignmentStatus === 'lighting' ? '#FFD34D' : '#FFFFFF'} />

        <View style={styles.cameraChrome}>
          <View style={styles.cameraTopRow}>
            <TouchableOpacity style={styles.cameraButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close scanner">
              <Ionicons name="close" size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cameraButton, torchOn && styles.cameraButtonActive]} onPress={() => setTorchOn(value => !value)} accessibilityRole="button" accessibilityLabel={torchOn ? 'Turn light off' : 'Turn light on'}>
              <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={22} color={torchOn ? '#FFD60A' : '#fff'} />
            </TouchableOpacity>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>{tx('placeBand', 'Place the small indicator card in the frame')}</Text>
            <Text style={styles.instructionBody}>{tx('keepSteady', 'Match the blue square and yellow circle to the guides. Keep the phone steady.')}</Text>
            <View style={[
              styles.alignmentPill,
              alignmentStatus === 'aligned' && styles.alignmentPillReady,
              alignmentStatus === 'lighting' && styles.alignmentPillWarning,
              alignmentStatus === 'unavailable' && styles.alignmentPillWarning,
            ]}>
              <Ionicons
                name={alignmentStatus === 'aligned' ? 'checkmark-circle' : alignmentStatus === 'lighting' ? 'sunny-outline' : alignmentStatus === 'unavailable' ? 'phone-portrait-outline' : 'scan-outline'}
                size={16}
                color={alignmentStatus === 'aligned' ? '#6EE7B7' : alignmentStatus === 'lighting' ? '#FFD34D' : '#FFFFFF'}
              />
              <Text accessibilityLiveRegion="polite" style={[styles.alignmentText, alignmentStatus === 'aligned' && styles.alignmentTextReady]}>
                {alignmentStatus === 'aligned'
                  ? tx('cardAligned', 'Aligned — ready to scan')
                  : alignmentStatus === 'lighting'
                    ? tx('needEvenLight', 'Use even light')
                    : alignmentStatus === 'unavailable'
                      ? tx('scannerNeedsBuild', 'Open the development build to scan')
                      : alignmentStatus === 'checking'
                        ? tx('checkingPosition', 'Checking card position…')
                        : tx('moveCard', 'Move the card into the guides')}
              </Text>
            </View>
          </View>

          <View style={styles.cameraBottom}>
            <TouchableOpacity style={[styles.captureButton, (!cameraReady || capturing || alignmentStatus !== 'aligned') && styles.captureButtonDisabled]} onPress={handleCapture} disabled={!cameraReady || capturing || alignmentStatus !== 'aligned'} accessibilityRole="button" accessibilityLabel="Capture wristband">
              <View style={styles.captureButtonInner}><Ionicons name="scan" size={28} color={theme.colors.primary} /></View>
              <Text style={styles.captureLabel}>{!cameraReady ? tx('startingCamera', 'Starting camera…') : alignmentStatus === 'aligned' ? tx('tapToScan', 'Tap to scan') : tx('alignBeforeScan', 'Align card to scan')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'processing') {
    const progress = Math.min(1, (stageIndex + 1) / PIPELINE_STAGES.length);
    return (
      <View style={styles.center}>
        <View style={styles.processingIcon}><Ionicons name="scan-outline" size={32} color={theme.colors.primary} /></View>
        <Text style={styles.processingTitle}>{tx('checkingBand', 'Checking your wristband')}</Text>
        <Text style={styles.processingBody}>{tx('staysOnPhone', 'This stays on the phone.')}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
        <Text style={styles.processingStatus}>{tx((['alignImage', 'readPatches', 'checkBand', 'calculateExposure', 'prepareResult'] as const)[stageIndex], PIPELINE_STAGES[stageIndex])}</Text>
      </View>
    );
  }

  if (step === 'unreadable') {
    return <UnreadableStep message={captureProblem} onRescan={reset} onDone={() => navigation.goBack()} />;
  }

  if (!result) return null;

  return <ResultStep result={result} settings={settings} language={language} onRescan={reset} onDone={() => navigation.navigate('Home')} onHistory={() => navigation.navigate('History')} />;
};

const UnreadableStep: React.FC<{ message: string; onRescan: () => void; onDone: () => void }> = ({ message, onRescan, onDone }) => (
  <SafeAreaView style={styles.permissionScreen}>
    <View style={[styles.permissionIcon, { backgroundColor: '#FFF4DB' }]}><Ionicons name="scan-outline" size={34} color={theme.colors.semantic.warning} /></View>
    <Text style={styles.permissionTitle}>Try that scan again</Text>
    <Text style={styles.permissionBody}>{message}</Text>
    <Text style={styles.retryTip}>Use even light. Centre only the small card and match the blue square and yellow circle to their guides.</Text>
    <Button label="Scan again" onPress={onRescan} style={styles.permissionButton} />
    <Button label="Cancel" variant="outline" onPress={onDone} style={styles.cancelButton} />
  </SafeAreaView>
);

const PermissionStep: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { language } = useLanguage();
  const sarvamText = useSarvamText();
  const tx = (key: Parameters<typeof translateUi>[0], fallback: string) => {
    const local = translateUi(key, language, fallback);
    return local === fallback ? sarvamText(fallback) : local;
  };
  return (
    <SafeAreaView style={styles.permissionScreen}>
      <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={34} color={theme.colors.primary} /></View>
      <Text style={styles.permissionTitle}>{tx('cameraNeeded', 'Camera access is needed')}</Text>
      <Text style={styles.permissionBody}>{tx('cameraReason', 'Vajra Setu uses the camera to read the colour patches on your wristband.')}</Text>
      <Button label={tx('allowCamera', 'Allow camera')} onPress={onPress} style={styles.permissionButton} />
    </SafeAreaView>
  );
};

const ResultStep: React.FC<{
  result: ProcessingResult;
  settings: AppSettings | null;
  language: AppLanguage;
  onRescan: () => void;
  onDone: () => void;
  onHistory: () => void;
}> = ({ result, settings, language, onRescan, onDone, onHistory }) => {
  const sarvamText = useSarvamText();
  const tx = (key: Parameters<typeof translateUi>[0], fallback: string) => {
    const local = translateUi(key, language, fallback);
    return local === fallback ? sarvamText(fallback) : local;
  };
  if (!result.band_valid) {
    return (
      <SafeAreaView style={styles.resultScreen}>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <View style={[styles.resultIcon, { backgroundColor: '#EF44441A' }]}><Ionicons name="close-circle" size={42} color={theme.colors.semantic.danger} /></View>
          <Text style={styles.resultHeading}>{tx('replaceBand', 'Replace the wristband')}</Text>
          <Text style={styles.resultBody}>{tx('replaceBandBody', 'The expiry patch is not valid, so this scan cannot be used. Do not rely on this result.')}</Text>
          <Card style={styles.resultCard}>
            <Text style={styles.detailLabel}>{tx('whatToDo', 'What to do')}</Text>
            <Text style={styles.detailText}>{tx('newBand', 'Use a new wristband and scan again.')} {tx('tellSupervisor', 'If this keeps happening, tell your supervisor.')}</Text>
            <Text style={styles.detailSub}>Expiry ΔE: {result.expiry_delta_e.toFixed(2)}</Text>
          </Card>
          <Button label={tx('rescan', 'Scan another wristband')} onPress={onRescan} style={styles.fullButton} />
          <Button label={tx('done', 'Done')} variant="outline" onPress={onDone} style={styles.fullButton} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const copy = riskCopy(result.risk_band, language);
  const oel = settings?.oel_twa_ppm ?? 10;
  return (
    <SafeAreaView style={styles.resultScreen}>
      <ScrollView contentContainerStyle={styles.resultContent}>
        <View style={styles.resultHeader}>
          <TouchableOpacity onPress={onDone} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Close result">
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.resultHeaderTitle}>{tx('scanComplete', 'Scan complete')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.resultIcon, { backgroundColor: `${copy.color}1A` }]}><Ionicons name={copy.icon} size={42} color={copy.color} /></View>
        <Badge label={result.risk_band.toUpperCase()} variant={result.risk_band === 'high' ? 'danger' : result.risk_band === 'elevated' ? 'warning' : 'success'} style={styles.resultBadge} />
        <Text style={styles.resultHeading}>{copy.title}</Text>
        <Text style={styles.resultBody}>{copy.body}</Text>

        <View style={styles.prototypeNote}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.text.secondary} />
          <Text style={styles.prototypeNoteText}>Colour category: {result.colour_category.toUpperCase()}. ppm values are estimates until the band is calibrated with controlled H₂S samples.</Text>
        </View>

        <Card style={styles.resultCard}>
          <Text style={styles.detailLabel}>{tx('latestExposure', 'Your latest reading')}</Text>
          <View style={styles.bigMetricRow}><Text style={styles.bigMetric}>{result.twa_ppm.toFixed(2)}</Text><Text style={styles.bigUnit}>ppm TWA</Text></View>
          <View style={styles.resultRule} />
          <View style={styles.detailRow}><Text style={styles.detailLabel}>{tx('referenceLimit', 'India TWA limit')}</Text><Text style={styles.detailValue}>{oel} ppm</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Cumulative exposure</Text><Text style={styles.detailValue}>{result.cumulative_ppm_hr.toFixed(1)} ppm·hr</Text></View>
        </Card>

        <Button label={tx('done', 'Done')} onPress={onDone} style={styles.fullButton} />
        <View style={styles.secondaryActions}>
          <TouchableOpacity onPress={onRescan} style={styles.secondaryAction}><Ionicons name="scan-outline" size={18} color={theme.colors.primary} /><Text style={styles.secondaryActionText}>{tx('rescan', 'Scan again')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onHistory} style={styles.secondaryAction}><Ionicons name="time-outline" size={18} color={theme.colors.primary} /><Text style={styles.secondaryActionText}>{tx('viewAll', 'View history')}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function pause(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101820' },
  center: { flex: 1, backgroundColor: theme.colors.background.screen, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xxl },
  cameraChrome: { flex: 1, justifyContent: 'space-between', padding: theme.spacing.xl, paddingTop: 18 },
  cameraTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cameraButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  cameraButtonActive: { backgroundColor: '#6e5b0088' },
  instructionCard: {
    position: 'absolute',
    top: '15%',
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    alignSelf: 'center',
    backgroundColor: '#07111FAD',
    borderWidth: 1,
    borderColor: '#FFFFFF2E',
    borderRadius: 18,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    maxWidth: 360,
  },
  instructionTitle: { color: '#fff', fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.md, textAlign: 'center' },
  instructionBody: { color: '#ffffffCC', fontFamily: theme.typography.family.main, fontSize: theme.typography.size.xs, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  alignmentPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFFFFF1C' },
  alignmentPillReady: { backgroundColor: '#06764766', borderWidth: 1, borderColor: '#6EE7B755' },
  alignmentPillWarning: { backgroundColor: '#A15C003D' },
  alignmentText: { color: '#FFFFFFE6', fontFamily: theme.typography.family.medium, fontSize: 12 },
  alignmentTextReady: { color: '#D1FADF' },
  cameraBottom: { alignItems: 'center', paddingBottom: 112 },
  captureButton: { alignItems: 'center', gap: theme.spacing.sm },
  captureButtonDisabled: { opacity: 0.55 },
  captureButtonInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', borderWidth: 5, borderColor: '#ffffff99', justifyContent: 'center', alignItems: 'center' },
  captureLabel: { color: '#fff', fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.sm, backgroundColor: '#00000088', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  permissionScreen: { flex: 1, backgroundColor: theme.colors.background.screen, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xxl },
  permissionIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.lg },
  permissionTitle: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.xl, color: theme.colors.text.primary, textAlign: 'center' },
  permissionBody: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.md, lineHeight: 22, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 320 },
  permissionButton: { width: '100%', marginTop: theme.spacing.xl },
  cancelButton: { width: '100%', marginTop: theme.spacing.md },
  retryTip: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.sm, lineHeight: 20, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing.lg, maxWidth: 330 },
  processingIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xl },
  processingTitle: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.xl, color: theme.colors.text.primary },
  processingBody: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.sm, color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
  progressTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: theme.colors.semantic.neutral, overflow: 'hidden', marginTop: theme.spacing.xxl },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 5 },
  processingStatus: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.text.secondary, marginTop: theme.spacing.md },
  resultScreen: { flex: 1, backgroundColor: theme.colors.background.screen },
  resultContent: { padding: theme.spacing.xl, paddingBottom: 48, alignItems: 'center' },
  resultHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xxl },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffffAA', alignItems: 'center', justifyContent: 'center' },
  resultHeaderTitle: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.lg, color: theme.colors.text.primary },
  resultIcon: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg },
  resultBadge: { marginBottom: theme.spacing.md },
  resultHeading: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.xxl, color: theme.colors.text.primary, textAlign: 'center' },
  resultBody: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.md, lineHeight: 22, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl, maxWidth: 340 },
  prototypeNote: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EEF5FF', borderRadius: 14, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
  prototypeNoteText: { flex: 1, fontFamily: theme.typography.family.main, fontSize: theme.typography.size.xs, lineHeight: 18, color: theme.colors.text.secondary },
  resultCard: { width: '100%', marginHorizontal: 0, borderRadius: 20, marginBottom: theme.spacing.lg },
  detailLabel: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.xs, color: theme.colors.text.secondary },
  detailText: { fontFamily: theme.typography.family.main, fontSize: theme.typography.size.md, lineHeight: 22, color: theme.colors.text.primary, marginTop: theme.spacing.sm },
  detailSub: { fontFamily: theme.typography.family.main, fontSize: 11, color: theme.colors.text.light, marginTop: theme.spacing.lg },
  bigMetricRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  bigMetric: { fontFamily: theme.typography.family.bold, fontSize: 48, color: theme.colors.text.primary, letterSpacing: -1 },
  bigUnit: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.text.secondary },
  resultRule: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm },
  detailValue: { fontFamily: theme.typography.family.semiBold, fontSize: theme.typography.size.sm, color: theme.colors.text.primary },
  fullButton: { width: '100%', marginBottom: theme.spacing.md },
  secondaryActions: { flexDirection: 'row', width: '100%', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  secondaryAction: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: '#ffffffAA', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  secondaryActionText: { fontFamily: theme.typography.family.medium, fontSize: theme.typography.size.sm, color: theme.colors.primary },
});
