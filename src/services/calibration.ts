/**
 * Calibration service — loads the swappable ΔE→ppm·hr calibration curve and
 * provides piecewise-linear interpolation.
 *
 * To update the calibration: replace calibration/h2s_curve_v1.json with new
 * lab data and bump the version string. No app code change needed.
 */

import { CalibrationCurve, CalibrationPoint } from '../types';

// Static require works in Metro bundler for JSON assets
const CURVE_V1: CalibrationCurve = require('../../calibration/h2s_curve_v1.json');

const _curves: Record<string, CalibrationCurve> = {
  v1: CURVE_V1,
};

export function getCurve(version = 'v1'): CalibrationCurve {
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
export function deltaEToPpmHr(deltaE: number, version = 'v1'): number {
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
export function isBandValid(expiryDeltaE: number, version = 'v1'): boolean {
  const curve = getCurve(version);
  const { min, max } = curve.expiry_valid_range;
  return expiryDeltaE >= min && expiryDeltaE <= max;
}

/**
 * Returns the sensing saturation ΔE above which the reading is unreliable.
 */
export function getSaturationDeltaE(version = 'v1'): number {
  return getCurve(version).sensing_saturation_delta_e;
}
