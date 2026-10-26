/**
 * Calibration service — loads the swappable ΔE→ppm·hr calibration curve and
 * provides piecewise-linear interpolation.
 *
 * To update the calibration: add a new versioned JSON asset, register it below,
 * and migrate only future scans. Never rewrite a curve used by saved readings.
 */

import { CalibrationCurve, CalibrationRGB } from '../types';

// Static require works in Metro bundler for JSON assets
const CURVE_V1: unknown = require('../../calibration/h2s_curve_v1.json');
const CURVE_V2: unknown = require('../../calibration/h2s_curve_v2.json');

const RAW_CURVES: Record<string, unknown> = {
  v1: CURVE_V1,
  v2: CURVE_V2,
};

let validatedCurves: Readonly<Record<string, Readonly<CalibrationCurve>>> | null = null;

export class CalibrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalibrationError';
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateRgb(value: unknown, label: string): asserts value is CalibrationRGB {
  if (!value || typeof value !== 'object') throw new CalibrationError(`${label} must be an RGB object.`);
  const rgb = value as Record<string, unknown>;
  for (const channel of ['r', 'g', 'b'] as const) {
    if (!isFiniteNumber(rgb[channel]) || rgb[channel] < 0 || rgb[channel] > 255) {
      throw new CalibrationError(`${label}.${channel} must be between 0 and 255.`);
    }
  }
}

/** Validate untrusted/versioned curve data before it can influence a result. */
export function validateCurveData(value: unknown, expectedVersion?: string): CalibrationCurve {
  if (!value || typeof value !== 'object') throw new CalibrationError('Calibration curve must be an object.');
  const curve = value as Record<string, any>;
  if (typeof curve.version !== 'string' || !curve.version.trim()) throw new CalibrationError('Calibration version is missing.');
  if (expectedVersion && curve.version !== expectedVersion) {
    throw new CalibrationError(`Calibration key "${expectedVersion}" contains version "${curve.version}".`);
  }
  if (typeof curve.description !== 'string' || !curve.description.trim()) throw new CalibrationError(`Calibration ${curve.version} needs a description.`);
  if (!curve.expiry_valid_range || !isFiniteNumber(curve.expiry_valid_range.min) || !isFiniteNumber(curve.expiry_valid_range.max) || curve.expiry_valid_range.min > curve.expiry_valid_range.max) {
    throw new CalibrationError(`Calibration ${curve.version} has an invalid expiry range.`);
  }
  if (!isFiniteNumber(curve.sensing_saturation_delta_e) || curve.sensing_saturation_delta_e <= 0) {
    throw new CalibrationError(`Calibration ${curve.version} has an invalid saturation threshold.`);
  }
  if (!Array.isArray(curve.points) || curve.points.length < 2) {
    throw new CalibrationError(`Calibration ${curve.version} must contain at least two points.`);
  }
  let priorDelta = -Infinity;
  let priorDose = -Infinity;
  curve.points.forEach((point: Record<string, unknown>, index: number) => {
    if (!point || !isFiniteNumber(point.deltaE) || !isFiniteNumber(point.cumulative_ppm_hr)) {
      throw new CalibrationError(`Calibration ${curve.version} point ${index} is malformed.`);
    }
    if (point.deltaE <= priorDelta) throw new CalibrationError(`Calibration ${curve.version} ΔE points must increase strictly.`);
    if (point.cumulative_ppm_hr < priorDose || point.cumulative_ppm_hr < 0) {
      throw new CalibrationError(`Calibration ${curve.version} dose values must be non-negative and non-decreasing.`);
    }
    priorDelta = point.deltaE;
    priorDose = point.cumulative_ppm_hr;
  });
  if (curve.sensing_saturation_delta_e < priorDelta) {
    throw new CalibrationError(`Calibration ${curve.version} saturation must cover its final point.`);
  }
  if (curve.sensing_reference_rgb !== undefined) validateRgb(curve.sensing_reference_rgb, `${curve.version}.sensing_reference_rgb`);
  if (curve.expiry_reference_rgb !== undefined) validateRgb(curve.expiry_reference_rgb, `${curve.version}.expiry_reference_rgb`);
  if (curve.expiry_yellow_gate !== undefined) {
    if (!curve.expiry_yellow_gate || typeof curve.expiry_yellow_gate !== 'object') {
      throw new CalibrationError(`Calibration ${curve.version} has an invalid expiry yellow gate.`);
    }
    for (const field of ['min_brightness', 'min_red_minus_blue', 'min_green_minus_blue', 'min_red_to_green_ratio'] as const) {
      if (!isFiniteNumber(curve.expiry_yellow_gate[field])) {
        throw new CalibrationError(`Calibration ${curve.version} expiry_yellow_gate.${field} must be finite.`);
      }
    }
  }

  return curve as CalibrationCurve;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(child => deepFreeze(child));
  }
  return value;
}

/** Validate and freeze every registered curve. Safe to call during startup. */
export function validateAllCurves(): Readonly<Record<string, Readonly<CalibrationCurve>>> {
  if (validatedCurves) return validatedCurves;
  const entries = Object.entries(RAW_CURVES).map(([version, raw]) => [version, deepFreeze(validateCurveData(raw, version))] as const);
  validatedCurves = Object.freeze(Object.fromEntries(entries));
  return validatedCurves;
}

export function getCalibrationVersions(): string[] {
  return Object.keys(validateAllCurves());
}

export function getCurve(version = 'v2'): Readonly<CalibrationCurve> {
  const curve = validateAllCurves()[version];
  if (!curve) throw new CalibrationError(`Unknown calibration curve "${version}". Available: ${getCalibrationVersions().join(', ')}.`);
  return curve;
}

// ─── Piecewise linear interpolation ──────────────────────────────────────────

/**
 * Given a measured ΔE from the sensing region, returns the estimated
 * cumulative ppm·hr exposure using piecewise linear interpolation between
 * the calibration control points.
 */
export function deltaEToPpmHr(deltaE: number, version = 'v2'): number {
  const curve = getCurve(version);
  const pts = curve.points;

  if (deltaE <= pts[0].deltaE) return pts[0].cumulative_ppm_hr;
  if (deltaE >= pts[pts.length - 1].deltaE) return pts[pts.length - 1].cumulative_ppm_hr;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    if (deltaE >= p0.deltaE && deltaE <= p1.deltaE) {
      const t = (deltaE - p0.deltaE) / (p1.deltaE - p0.deltaE);
      return p0.cumulative_ppm_hr + t * (p1.cumulative_ppm_hr - p0.cumulative_ppm_hr);
    }
  }

  return 0;
}

// ─── Expiry indicator validation ──────────────────────────────────────────────

/**
 * Checks whether the expiry indicator dot's ΔE falls within the valid
 * calibrated range. Returns true = band is still valid/unexpired.
 */
export function isBandValid(
  expiryDeltaE: number,
  expiryRGB?: { r: number; g: number; b: number },
  version = 'v2'
): boolean {
  const curve = getCurve(version);
  const { min, max } = curve.expiry_valid_range;
  const deltaPass = Number.isFinite(expiryDeltaE) && expiryDeltaE >= min && expiryDeltaE <= max;
  if (!deltaPass || !curve.expiry_yellow_gate || !expiryRGB) return deltaPass;

  const gate = curve.expiry_yellow_gate;
  const brightness = (expiryRGB.r + expiryRGB.g + expiryRGB.b) / 3;
  return brightness >= gate.min_brightness
    && expiryRGB.r - expiryRGB.b >= gate.min_red_minus_blue
    && expiryRGB.g - expiryRGB.b >= gate.min_green_minus_blue
    && expiryRGB.r / Math.max(expiryRGB.g, 1) >= gate.min_red_to_green_ratio;
}

/**
 * Returns the sensing saturation ΔE above which the reading is unreliable.
 */
export function getSaturationDeltaE(version = 'v2'): number {
  return getCurve(version).sensing_saturation_delta_e;
}
