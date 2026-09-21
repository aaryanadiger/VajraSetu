/**
 * Image processing service — CIELAB conversion and ΔE00 (CIEDE2000) math.
 *
 * Pure TypeScript — no OpenCV required for the color math itself.
 * OpenCV is only used for perspective correction and region sampling,
 * which is wrapped in a graceful demo-mode fallback for Expo Go.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

export type CaptureProblem =
  | 'native_scanner_unavailable'
  | 'missing_image'
  | 'card_not_in_frame'
  | 'poor_lighting'
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
 * Reads the indicator locations from a card held within the central camera guide.
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

interface DecodedImage {
  cols: number;
  rows: number;
  channels: number;
  buffer: Uint8Array;
}

interface RelativeRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  circle?: boolean;
}

// These zones match the on-screen guides when the small indicator card is
// aligned with the square camera frame. The CuSO4 pad sits upper-left, the
// FeSO4 dot sits toward the centre-right, and plain white card is sampled
// upper-right.
const INDICATOR_ZONES: Record<'reference' | 'expiry' | 'sensing', RelativeRegion> = {
  reference: { x: 0.55, y: 0.08, width: 0.26, height: 0.17 },
  expiry: { x: 0.53, y: 0.38, width: 0.28, height: 0.30, circle: true },
  sensing: { x: 0.14, y: 0.17, width: 0.28, height: 0.29 },
};

interface CardBounds {
  left: number;
  top: number;
  side: number;
}

interface CardCandidate {
  bounds: CardBounds;
  score: number;
}

function extractCentredIndicatorRegions(image: DecodedImage): CaptureRegions {
  if (image.channels < 3 || image.cols < 180 || image.rows < 180) {
    throw new CaptureError('card_not_in_frame', 'Move the indicator card closer and keep it inside the frame.');
  }

  const candidate = findIndicatorCard(image);
  const card = candidate.bounds;

  const referenceRGB = sampleRegion(image, card, INDICATOR_ZONES.reference);
  const expiryRGB = sampleRegion(image, card, INDICATOR_ZONES.expiry);
  const sensingRGB = sampleRegion(image, card, INDICATOR_ZONES.sensing);

  const referenceBrightness = rgbBrightness(referenceRGB);
  if (referenceBrightness < 110 || referenceBrightness > 252 || rgbChroma(referenceRGB) > 70) {
    throw new CaptureError('poor_lighting', 'Use even light and keep the white part of the card visible.');
  }
  if (channelDistance(expiryRGB, referenceRGB) < 14 || channelDistance(sensingRGB, referenceRGB) < 14) {
    throw new CaptureError('card_not_in_frame', 'Centre the small card so both coloured indicators are inside the frame.');
  }

  return {
    referenceRGB,
    expiryRGB,
    sensingRGB,
    scanQuality: captureQuality(candidate.score, referenceRGB),
    sampleCount: 1,
  };
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

/**
 * Finds the card at slightly different positions and sizes inside the guide.
 * This is intentionally bounded: it is fast enough for an on-device preview
 * and avoids accidentally sampling the worker's hand or the surrounding work
 * surface. Rotation/perspective correction is the next physical-card upgrade:
 * print non-reactive corner markers, then rectify their quadrilateral.
 */
function findIndicatorCard(image: DecodedImage): CardCandidate {
  const centreSide = Math.round(Math.min(image.cols * 0.62, image.rows * 0.46));
  const centreLeft = (image.cols - centreSide) / 2;
  const centreTop = (image.rows - centreSide) / 2;
  const scales = [0.78, 0.9, 1, 1.12, 1.24];
  const offsets = [-0.2, -0.1, 0, 0.1, 0.2];
  let best: CardCandidate | undefined;

  for (const scale of scales) {
    const side = Math.round(centreSide * scale);
    for (const horizontalOffset of offsets) {
      for (const verticalOffset of offsets) {
        const bounds = {
          left: Math.round(centreLeft + horizontalOffset * centreSide),
          top: Math.round(centreTop + verticalOffset * centreSide),
          side,
        };
        if (!isInsideImage(bounds, image)) continue;

        const reference = sampleRegion(image, bounds, INDICATOR_ZONES.reference, 8);
        const expiry = sampleRegion(image, bounds, INDICATOR_ZONES.expiry, 8);
        const sensing = sampleRegion(image, bounds, INDICATOR_ZONES.sensing, 8);
        const score = scoreCardCandidate(reference, expiry, sensing);
        if (!best || score > best.score) best = { bounds, score };
      }
    }
  }

  if (!best || best.score < 2.25) {
    throw new CaptureError(
      'card_not_in_frame',
      'Place the small card inside the guides with the blue square and yellow dot visible.'
    );
  }

  return best;
}

function captureQuality(cardScore: number, reference: RGB): number {
  const geometryQuality = clamp((cardScore - 2.25) / 1.5, 0, 1);
  const brightnessQuality = clamp(1 - Math.abs(rgbBrightness(reference) - 205) / 100, 0, 1);
  const neutralityQuality = clamp(1 - rgbChroma(reference) / 70, 0, 1);
  return clamp(geometryQuality * 0.55 + brightnessQuality * 0.2 + neutralityQuality * 0.25, 0, 1);
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

function isInsideImage(card: CardBounds, image: DecodedImage): boolean {
  return card.left >= 0 && card.top >= 0 && card.left + card.side <= image.cols && card.top + card.side <= image.rows;
}

function scoreCardCandidate(reference: RGB, expiry: RGB, sensing: RGB): number {
  const referenceBrightness = rgbBrightness(reference);
  const brightnessScore = Math.max(0, 1 - Math.abs(referenceBrightness - 210) / 120);
  const neutralReferenceScore = Math.max(0, 1 - rgbChroma(reference) / 80);
  const expiryDifference = Math.min(1, channelDistance(expiry, reference) / 70);
  const sensingDifference = Math.min(1, channelDistance(sensing, reference) / 70);
  const yellowFamily = clamp(
    ((expiry.r - expiry.b) + (expiry.g - expiry.b)) / 110,
    0,
    1
  );

  // The white reference is the strongest geometry signal. Both chemical pads
  // must differ from it; they may be blue, brown, yellow, or black as they age.
  return brightnessScore * 0.8
    + neutralReferenceScore * 1.2
    + expiryDifference * 0.7
    + sensingDifference
    + yellowFamily * 0.55;
}

function sampleRegion(image: DecodedImage, card: CardBounds, region: RelativeRegion, gridSize = 24): RGB {
  const left = card.left + Math.round(region.x * card.side);
  const top = card.top + Math.round(region.y * card.side);
  const width = Math.max(8, Math.round(region.width * card.side));
  const height = Math.max(8, Math.round(region.height * card.side));
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];

  // A small grid gives a robust value without processing every photo pixel.
  for (let row = 1; row < gridSize; row += 1) {
    for (let column = 1; column < gridSize; column += 1) {
      const nx = column / gridSize;
      const ny = row / gridSize;
      if (region.circle && Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2) > 0.18) continue;
      const x = clamp(Math.round(left + nx * width), 0, image.cols - 1);
      const y = clamp(Math.round(top + ny * height), 0, image.rows - 1);
      const index = (y * image.cols + x) * image.channels;
      // Mat.createFromBase64 follows OpenCV's decoded BGR channel order.
      blue.push(image.buffer[index]);
      green.push(image.buffer[index + 1]);
      red.push(image.buffer[index + 2]);
    }
  }

  return { r: trimmedMean(red), g: trimmedMean(green), b: trimmedMean(blue) };
}

function trimmedMean(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * 0.15);
  const kept = sorted.slice(trim, sorted.length - trim);
  return Math.round(kept.reduce((total, value) => total + value, 0) / kept.length);
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
