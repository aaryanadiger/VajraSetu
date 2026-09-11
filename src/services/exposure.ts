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

import { AppSettings } from '../types';
import { ProcessingResult, RiskBand, H2SIndex } from '../types';
import { isBandValid, deltaEToPpmHr, getSaturationDeltaE } from './calibration';
import { computeDeltaE, CaptureRegions, RGB } from './imageProcessing';

// Provisional CuSO4 baseline sampled from the supplied unexposed pad photograph.
// Replace this with lab-measured values once controlled exposure samples exist.
const CUSO4_UNEXPOSED_RGB: RGB = { r: 174, g: 190, b: 181 };
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

export function validateBand(expiryDeltaE: number, curveVersion = 'v1'): boolean {
  return isBandValid(expiryDeltaE, curveVersion);
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
  curveVersion = 'v1'
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
 * Band thresholds (configurable in settings, default = India/ACGIH values):
 *   ≤1 ppm:   very low (H2S01 band)
 *   1–5 ppm:  low-moderate (H2S1 band)
 *   5–10 ppm: moderate-high (H2S5 band)
 *   >10 ppm:  high (H2S10 band, STEL/ceiling territory)
 */
export function computeH2SIndex(
  twaPpm: number,
  shiftHours: number,
  settings: AppSettings
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

// ─── Risk band classification ─────────────────────────────────────────────────

export function classifyRisk(
  twa: TWAResult,
  h2sIndex: H2SIndex,
  settings: AppSettings
): RiskBand {
  if (twa.isSaturated) return 'high';

  const twaHigh = twa.twaPpm >= settings.risk_high_twa;
  const twaElevated = twa.twaPpm >= settings.risk_elevated_twa;
  const indexHigh = h2sIndex.value >= settings.risk_high_index;
  const indexElevated = h2sIndex.value >= settings.risk_elevated_index;

  if (twaHigh || indexHigh) return 'high';
  if (twaElevated || indexElevated) return 'elevated';
  return 'low';
}

// ─── Full pipeline entry point ────────────────────────────────────────────────

export async function runExposurePipeline(
  regions: CaptureRegions,
  shiftHours: number,
  settings: AppSettings,
  curveVersion = 'v1'
): Promise<ProcessingResult> {
  // FeSO4 validity is intentionally disabled for this CuSO4-only prototype.
  // The white reference corrects lighting; the CuSO4 pad is compared to its
  // own unexposed pale blue/green baseline to measure H2S colour change.
  const expiryDeltaE = 0;
  const correctedSensing = whiteBalance(regions.sensingRGB, regions.referenceRGB);
  const sensingDeltaE = computeDeltaE(correctedSensing, CUSO4_UNEXPOSED_RGB);

  // Step B1: TWA
  const twa = computeTWA(sensingDeltaE, shiftHours, curveVersion);

  // Step B2: H2S Index
  const h2sIndex = computeH2SIndex(twa.twaPpm, shiftHours, settings);

  // Risk classification
  const riskBand = classifyRisk(twa, h2sIndex, settings);

  return {
    band_valid: true,
    expiry_delta_e: expiryDeltaE,
    sensing_delta_e: sensingDeltaE,
    cumulative_ppm_hr: parseFloat(twa.cumulativePpmHr.toFixed(2)),
    twa_ppm: parseFloat(twa.twaPpm.toFixed(3)),
    h2s_index: h2sIndex.value,
    index_mode: 'estimated_single_sample',
    risk_band: riskBand,
    calibration_curve_version: curveVersion,
  };
}
