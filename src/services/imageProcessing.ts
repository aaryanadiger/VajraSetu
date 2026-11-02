/**
 * Image processing service — CIELAB conversion and ΔE00 (CIEDE2000) math.
 *
 * Pure TypeScript — no OpenCV required for the color math itself.
 * OpenCV decodes camera JPEGs; detection and sampling run locally.
 * Expo Go cannot load that native decoder and never returns simulated readings.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

import { detectPhysicalBand } from './bandDetection';

export interface RGB { r: number; g: number; b: number }
export interface LAB { L: number; a: number; b: number }

export interface CaptureRegions {
  /** Average RGB of the sensing (colorimetric) area */
  sensingRGB: RGB;
  /** Average RGB of the FeSO4 expiry indicator dot */
  expiryRGB: RGB;
  /** Average RGB of the unexposed reference patch on the printed scale */
  referenceRGB: RGB;
  /** Image/card quality only. This is not confidence in the chemical calibration. */
  scanQuality: number;
  /** Number of camera frames consolidated into this sample. */
  sampleCount: number;
  /** Normalised geometry used to ensure automatic capture follows one band. */
  detection?: { x: number; y: number; size: number; rotation: number };
}

export type CaptureProblem =
  | 'native_scanner_unavailable'
  | 'missing_image'
  | 'card_not_in_frame'
  | 'poor_lighting'
  | 'too_dark'
  | 'glare'
  | 'unstable_capture';

/** A recoverable scan problem that the UI can turn into a simple retry tip. */
export class CaptureError extends Error {
  constructor(public readonly problem: CaptureProblem, message: string) {
    super(message);
    this.name = 'CaptureError';
  }
}

// ─── sRGB → CIELAB ────────────────────────────────────────────────────────────

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Convert sRGB (0-255) to CIELAB (D65 illuminant) */
export function rgbToLab(rgb: RGB): LAB {
  // sRGB → linear
  const rl = linearize(rgb.r);
  const gl = linearize(rgb.g);
  const bl = linearize(rgb.b);

  // linear → XYZ (D65)
  const X = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const Z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  // XYZ → Lab (D65 reference white)
  const xn = 0.95047, yn = 1.00000, zn = 1.08883;

  function f(t: number): number {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  }

  const fx = f(X / xn);
  const fy = f(Y / yn);
  const fz = f(Z / zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// ─── CIEDE2000 (ΔE00) ────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/**
 * CIEDE2000 color difference. Returns a perceptually uniform ΔE value.
 * Reference: Sharma et al. (2005), Color Research & Application.
 */
export function ciede2000(lab1: LAB, lab2: LAB): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = (Math.atan2(b1, a1p) * 180) / Math.PI + (b1 < 0 || a1p < 0 ? (b1 === 0 && a1p < 0 ? 180 : 360) : 0);
  const h2p = (Math.atan2(b2, a2p) * 180) / Math.PI + (b2 < 0 || a2p < 0 ? (b2 === 0 && a2p < 0 ? 180 : 360) : 0);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG);

  const Lbar = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let Hbarp = (h1p + h2p) / 2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) {
      Hbarp = (h1p + h2p + 360) / 2;
    }
  }

  const T =
    1 -
    0.17 * Math.cos((Hbarp - 30) * DEG) +
    0.24 * Math.cos(2 * Hbarp * DEG) +
    0.32 * Math.cos((3 * Hbarp + 6) * DEG) -
    0.20 * Math.cos((4 * Hbarp - 63) * DEG);

  const SL = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const dTheta = 30 * Math.exp(-Math.pow((Hbarp - 275) / 25, 2));
  const RT = -Math.sin(2 * dTheta * DEG) * RC;

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  );
}

// ─── Convenience: RGB → ΔE against reference ─────────────────────────────────

export function computeDeltaE(targetRGB: RGB, referenceRGB: RGB): number {
  return ciede2000(rgbToLab(targetRGB), rgbToLab(referenceRGB));
}

// ─── Region extraction ──────────────────────────────────────────────────────

/**
 * Reads the CuSO4 strip, FeSO4 dot and neutral reference on the printed scale.
 *
 * This deliberately does not use a learned model. The coloured pads have known
 * positions on the card, so a bounded search for the white reference and two
 * coloured pads is repeatable, works offline, and can be checked in code.
 * OpenCV decodes the JPEG; the sampling stays deterministic and auditable
 * TypeScript.
 */
export async function extractRegionsFromImage(imageBase64: string): Promise<CaptureRegions> {
  const isExpoGo = isRunningInExpoGo();

  if (!imageBase64) {
    throw new CaptureError('missing_image', 'No image was captured. Try again.');
  }

  if (isExpoGo) {
    // Expo Go cannot load react-native-fast-opencv. A simulated safety result
    // would be misleading, so scanning is intentionally unavailable there.
    throw new CaptureError(
      'native_scanner_unavailable',
      'Use the Vajra Setu development build to read a wristband.'
    );
  }

  try {
    const { Mat } = await import('react-native-fast-opencv');
    const image = Mat.createFromBase64(imageBase64);
    try {
      return extractCentredIndicatorRegions(image.toBuffer('uint8'));
    } finally {
      image.release();
    }
  } catch (error) {
    if (error instanceof CaptureError) throw error;
    console.warn('[imageProcessing] Could not read image', error);
    throw new CaptureError(
      'native_scanner_unavailable',
      'The scanner is not ready on this phone. Open the development build and try again.'
    );
  }
}

export interface DecodedImage {
  cols: number;
  rows: number;
  channels: number;
  buffer: Uint8Array;
}

function extractCentredIndicatorRegions(image: DecodedImage): CaptureRegions {
  if (image.channels < 3 || image.cols < 180 || image.rows < 180) {
    throw new CaptureError('card_not_in_frame', 'Move closer so the CuSO₄ strip, FeSO₄ dot and reference scale are visible.');
  }

  const band = detectPhysicalBand(image);
  if (!band) throw new CaptureError('card_not_in_frame', 'Show one complete band with the strip, dot and printed reference scale visible.');
  const { referenceRGB, expiryRGB, sensingRGB } = band;

  const referenceBrightness = rgbBrightness(referenceRGB);
  if (referenceBrightness < 110) {
    throw new CaptureError('too_dark', 'More light needed. Turn on the light or move to a brighter spot.');
  }
  if (referenceBrightness > 252) {
    throw new CaptureError('glare', 'Glare on the reference scale. Turn off the light or tilt the phone slightly.');
  }
  if (rgbChroma(referenceRGB) > 70) {
    throw new CaptureError('poor_lighting', 'Use even light and keep the white part of the card visible.');
  }
  if (channelDistance(expiryRGB, referenceRGB) < 14 || channelDistance(sensingRGB, referenceRGB) < 14) {
    throw new CaptureError('card_not_in_frame', 'Keep the CuSO₄ strip, FeSO₄ dot and reference scale visible together.');
  }

  return {
    referenceRGB,
    expiryRGB,
    sensingRGB,
    scanQuality: band.scanQuality,
    sampleCount: 1,
    detection: band.detection,
  };
}

/** Pure decoded-image entry point used by deterministic scanner fixtures. */
export function extractRegionsFromDecodedImage(image: DecodedImage): CaptureRegions {
  return extractCentredIndicatorRegions(image);
}

/**
 * Consolidate several final captures. Median RGB values reduce camera noise,
 * while a cross-frame ΔE gate prevents a moving/glared card from producing a
 * precise-looking exposure estimate.
 */
export function mergeCaptureRegions(frames: CaptureRegions[]): CaptureRegions {
  if (frames.length < 2) {
    throw new CaptureError('unstable_capture', 'Keep the phone steady while the app checks the card.');
  }
  const first = frames[0].detection;
  if (first && frames.some(frame => frame.detection && (
    Math.hypot(frame.detection.x - first.x, frame.detection.y - first.y) > 0.06
    || Math.abs(frame.detection.size - first.size) > 0.08
    || Math.abs(((frame.detection.rotation - first.rotation + 540) % 360) - 180) > 20
  ))) {
    throw new CaptureError('unstable_capture', 'The band moved. Hold one band steady and we’ll try again.');
  }

  const merged = {
    referenceRGB: medianRGB(frames.map(frame => frame.referenceRGB)),
    expiryRGB: medianRGB(frames.map(frame => frame.expiryRGB)),
    sensingRGB: medianRGB(frames.map(frame => frame.sensingRGB)),
  };
  const frameDifferences = frames.flatMap(frame => [
    computeDeltaE(frame.referenceRGB, merged.referenceRGB),
    computeDeltaE(frame.expiryRGB, merged.expiryRGB),
    computeDeltaE(frame.sensingRGB, merged.sensingRGB),
  ]);
  const worstFrameDifference = Math.max(...frameDifferences);

  if (!Number.isFinite(worstFrameDifference) || worstFrameDifference > 9) {
    throw new CaptureError(
      'unstable_capture',
      'The card moved or the light changed. Hold steady in even light and scan again.'
    );
  }

  const averageFrameQuality = frames.reduce((sum, frame) => sum + frame.scanQuality, 0) / frames.length;
  const consistencyQuality = clamp(1 - worstFrameDifference / 9, 0, 1);
  const scanQuality = clamp(averageFrameQuality * 0.6 + consistencyQuality * 0.4, 0, 1);

  if (scanQuality < 0.42) {
    throw new CaptureError('poor_lighting', 'Use even light and keep the full card clearly visible.');
  }

  return { ...merged, scanQuality, sampleCount: frames.length };
}

function medianRGB(values: RGB[]): RGB {
  return {
    r: median(values.map(value => value.r)),
    g: median(values.map(value => value.g)),
    b: median(values.map(value => value.b)),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function channelDistance(a: RGB, b: RGB): number {
  return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
}

function rgbBrightness(rgb: RGB): number {
  return (rgb.r + rgb.g + rgb.b) / 3;
}

function rgbChroma(rgb: RGB): number {
  return Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRunningInExpoGo(): boolean {
  try {
    // expo-constants is always available in Expo projects
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}
