/**
 * Calibration service — loads the swappable ΔE→ppm·hr calibration curve and
 * provides piecewise-linear interpolation.
 *
 * To update the calibration: add a new versioned JSON asset, register it below,
 * and migrate only future scans. Never rewrite a curve used by saved readings.
 */

import { CalibrationCurve } from '../types';

// Static require works in Metro bundler for JSON assets
const CURVE_V1: CalibrationCurve = require('../../calibration/h2s_curve_v1.json');
const CURVE_V2: CalibrationCurve = require('../../calibration/h2s_curve_v2.json');

const _curves: Record<string, CalibrationCurve> = {
  v1: CURVE_V1,
  v2: CURVE_V2,
};

export function getCurve(version = 'v2'): CalibrationCurve {
  const curve = _curves[version];
  if (!curve) throw new Error(`Calibration curve "${version}" not found`);
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
