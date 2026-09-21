/**
 * Exposure algorithm service — maps ΔE readings to TWA + H2S Index.
 *
 * Algorithm basis:
 *  - TWA: from calibration curve (ΔE → cumulative ppm·hr / shift hours)
 *  - H2S Index: Option A (single-sample estimate), adapted from
 *    Austigard & Smedbold (2022), Ann Work Expo Health 66(1):124–129.
 *    Labeled "estimated_single_sample" — not the full multi-peak index.
 *
 * See PRD §6.3 and §6.4 for design rationale and open questions.
 */

import { ProcessingResult, H2SIndex } from '../types';
import { deltaEToPpmHr, getCurve, getSaturationDeltaE, isBandValid } from './calibration';
import { computeDeltaE, CaptureRegions, RGB } from './imageProcessing';

// Legacy v1 fallbacks. Measured v2 references live in the versioned JSON asset.
const LEGACY_CUSO4_UNEXPOSED_RGB: RGB = { r: 174, g: 190, b: 181 };
const LEGACY_FESO4_FRESH_RGB: RGB = { r: 201, g: 168, b: 55 };
const TARGET_WHITE_RGB: RGB = { r: 245, g: 245, b: 245 };

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
}

/** Normalise the sensing-pad colour against the captured white reference. */
function whiteBalance(sample: RGB, capturedWhite: RGB): RGB {
  return {
    r: clampChannel(sample.r * TARGET_WHITE_RGB.r / Math.max(capturedWhite.r, 1)),
    g: clampChannel(sample.g * TARGET_WHITE_RGB.g / Math.max(capturedWhite.g, 1)),
    b: clampChannel(sample.b * TARGET_WHITE_RGB.b / Math.max(capturedWhite.b, 1)),
  };
}

// ─── Band validity gate (Step A) ─────────────────────────────────────────────

export function validateBand(expiryRGB: RGB, expiryDeltaE: number, curveVersion = 'v2'): boolean {
  // v2 requires both proximity to the measured fresh sample and the expected
  // yellow colour family. This is more robust than one very narrow ΔE cutoff.
  return isBandValid(expiryDeltaE, expiryRGB, curveVersion);
}

/**
 * Fresh prototype pads are blue/green: blue remains close to red while green
 * is the strongest channel. The measured 5–15 minute olive/brown controls all
 * have a substantially larger blue deficit. This chromaticity check prevents
 * exposure from being inferred from brightness or camera white balance alone.
 * These are deterministic colour bands—not a trained model or a live gas
 * concentration measurement.
 */
export function isFreshCuSO4Colour(sensingRGB: RGB): boolean {
  const brightness = (sensingRGB.r + sensingRGB.g + sensingRGB.b) / 3;
  const blueDeficit = (sensingRGB.r + sensingRGB.g) / 2 - sensingRGB.b;

  return brightness >= 130
    && sensingRGB.g >= sensingRGB.r - 8
    && sensingRGB.b >= sensingRGB.r - 15
    && blueDeficit <= 18;
}

function classifyCuSO4Colour(sensingRGB: RGB, sensingDeltaE: number, curveVersion: string): ProcessingResult['colour_category'] {
  const brightness = (sensingRGB.r + sensingRGB.g + sensingRGB.b) / 3;
  const redDominant = sensingRGB.r > sensingRGB.b + 8;

  if (curveVersion === 'v2') {
    // Colour family is checked before ΔE because a fresh pad can move farther
    // from one reference photo under a different phone or light source while
    // remaining recognisably blue/green.
    if (isFreshCuSO4Colour(sensingRGB)) return 'low';

    // Remaining thresholds follow the measured series: overlapping olive/
    // brown intermediate patches and the distinctly dark 30-minute patch.
    if (brightness < 120 || sensingDeltaE >= 30) return 'high';
    if (sensingDeltaE > 10) return 'elevated';
    return 'low';
  }

  if (brightness < 72 || sensingDeltaE >= 46) return 'high';
  if (redDominant || sensingDeltaE >= 22) return 'elevated';
  return 'low';
}

// ─── TWA computation (Step B1) ────────────────────────────────────────────────

export interface TWAResult {
  cumulativePpmHr: number;
  twaPpm: number;
  shiftHours: number;
  isSaturated: boolean;
}

export function computeTWA(
  sensingDeltaE: number,
  shiftHours: number,
  curveVersion = 'v2'
): TWAResult {
  const saturationDeltaE = getSaturationDeltaE(curveVersion);
  const isSaturated = sensingDeltaE >= saturationDeltaE;
  const cumulativePpmHr = deltaEToPpmHr(sensingDeltaE, curveVersion);
  const twaPpm = shiftHours > 0 ? cumulativePpmHr / shiftHours : 0;
  return { cumulativePpmHr, twaPpm, shiftHours, isSaturated };
}

// ─── H2S Index (Step B2, Option A — single-sample estimate) ──────────────────

/**
 * Adapted index from Austigard & Smedbold (2022).
 * Since we have only ONE colorimetric snapshot per shift (not a time series),
 * we cannot count individual peaks or compute time-in-band directly.
 *
 * Option A approach:
 *  - The estimated TWA ppm acts as the shift's average severity.
 *  - maxPpmEstimate = TWA × peakFactor (configurable, default 2.0) as a
 *    conservative bound on the likely peak, since colorimetric wristbands
 *    record cumulative dose, not instantaneous peak.
 *  - The simplified index = TWA-weighted band contribution + maxPpmEstimate.
 *  - Clearly labeled "estimated_single_sample" in all outputs.
 *
 * Band thresholds (fixed app safety levels, with Indian statutory values as the reference):
 *   ≤1 ppm:   very low (H2S01 band)
 *   1–5 ppm:  low-moderate (H2S1 band)
 *   5–10 ppm: moderate-high (H2S5 band)
 *   >10 ppm:  high (H2S10 band, STEL/ceiling territory)
 */
export function computeH2SIndex(
  twaPpm: number,
  shiftHours: number
): H2SIndex {
  const peakFactor = 2.0; // conservative peak estimate multiplier
  const maxPpmEstimate = twaPpm * peakFactor;

  // Assign shift duration to the appropriate TWA band
  // (treating the entire shift as being at the TWA concentration)
  const durMin = shiftHours * 60;

  let indexValue = 0;

  if (twaPpm <= 1.0) {
    // H2S01 band: count×0.1 + duration×0.1
    indexValue = 0.1 + durMin * 0.1;
  } else if (twaPpm <= 5.0) {
    // H2S1 band: count×1 + duration@≤5ppm×5
    indexValue = 1 + durMin * 5;
  } else if (twaPpm <= 10.0) {
    // H2S5 band: count×5 + duration@>5ppm×5 + H2S10 component
    indexValue = 5 + durMin * 5 + 10;
  } else {
    // H2S10 band: count×10
    indexValue = 10;
  }

  // Add max ppm estimate (Hmax term from original paper)
  indexValue += maxPpmEstimate;

  // Normalise to a 0–100 scale for UI readability
  // (The raw paper values are much larger; we scale down for display)
  const normalised = Math.min(indexValue / 10, 100);

  return {
    value: parseFloat(normalised.toFixed(1)),
    mode: 'estimated_single_sample',
    twaPpm,
    maxPpmEstimate,
  };
}

// ─── Full pipeline entry point ────────────────────────────────────────────────

export async function runExposurePipeline(
  regions: CaptureRegions,
  shiftHours: number,
  curveVersion = 'v2'
): Promise<ProcessingResult> {
  // Both indicators are corrected against the same white card area so warm
  // factory lighting does not look like a chemical colour change.
  const correctedExpiry = whiteBalance(regions.expiryRGB, regions.referenceRGB);
  const correctedSensing = whiteBalance(regions.sensingRGB, regions.referenceRGB);
  const curve = getCurve(curveVersion);
  const expiryReference = curve.expiry_reference_rgb ?? LEGACY_FESO4_FRESH_RGB;
  const sensingReference = curve.sensing_reference_rgb ?? LEGACY_CUSO4_UNEXPOSED_RGB;
  const expiryDeltaE = computeDeltaE(correctedExpiry, expiryReference);
  const sensingDeltaE = computeDeltaE(correctedSensing, sensingReference);
  const bandValid = validateBand(correctedExpiry, expiryDeltaE, curveVersion);
  const freshCuSO4 = curveVersion === 'v2' && isFreshCuSO4Colour(correctedSensing);

  // Step B1: TWA
  // A positive ΔE caused only by camera/lighting variation must not become a
  // false dose when the pad still matches the measured fresh colour family.
  const twa = computeTWA(freshCuSO4 ? 0 : sensingDeltaE, shiftHours, curveVersion);

  // Step B2: H2S Index
  const h2sIndex = computeH2SIndex(twa.twaPpm, shiftHours);

  // Risk classification
  const colourCategory = classifyCuSO4Colour(correctedSensing, sensingDeltaE, curveVersion);
  const riskBand = !bandValid
    ? 'invalid'
    : colourCategory === 'high' || twa.isSaturated
      ? 'high'
      : colourCategory === 'elevated' ? 'elevated' : 'low';

  return {
    band_valid: bandValid,
    expiry_delta_e: expiryDeltaE,
    sensing_delta_e: sensingDeltaE,
    colour_category: colourCategory,
    cumulative_ppm_hr: parseFloat(twa.cumulativePpmHr.toFixed(2)),
    twa_ppm: parseFloat(twa.twaPpm.toFixed(3)),
    h2s_index: h2sIndex.value,
    index_mode: 'estimated_single_sample',
    risk_band: riskBand,
    calibration_curve_version: curveVersion,
    scan_quality: parseFloat(regions.scanQuality.toFixed(3)),
    sample_count: regions.sampleCount,
    is_saturated: twa.isSaturated,
  };
}
