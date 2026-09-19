// ─── Domain Types — Vajra-Setu ───────────────────────────────────────────────

export type RiskBand = 'low' | 'elevated' | 'high' | 'invalid';

export type IndexMode = 'estimated_single_sample' | 'full_timeseries';

export interface CalibrationPoint {
  deltaE: number;
  cumulative_ppm_hr: number;
}

export interface CalibrationCurve {
  version: string;
  description: string;
  expiry_valid_range: { min: number; max: number };
  sensing_saturation_delta_e: number;
  points: CalibrationPoint[];
}

export interface H2SIndex {
  value: number;
  mode: IndexMode;
  twaPpm: number;
  maxPpmEstimate: number;
}

// ─── Database Entity Types ───────────────────────────────────────────────────

export interface Worker {
  id: string;
  name: string;
  worker_code: string;
  site_id: string;
  created_at: string;
}

/** The single device owner. Their worker record owns every personal scan. */
export interface AccountProfile {
  id: number;
  name: string;
  worker_code: string;
  site_id: string;
  worker_id: string;
}

export interface Wristband {
  id: string;
  batch_id: string;
  issued_at: string;
  expiry_calibration_version: string;
}

export interface Shift {
  id: string;
  worker_id: string;
  start_time: string;
  end_time: string | null;
  wristband_id: string;
}

export interface Reading {
  id: string;
  shift_id: string;
  wristband_id: string;
  captured_at: string;
  band_valid: boolean;
  expiry_delta_e: number;
  sensing_delta_e: number;
  cumulative_ppm_hr: number;
  twa_ppm: number;
  h2s_index: number;
  index_mode: IndexMode;
  risk_band: RiskBand;
  calibration_curve_version: string;
  /** Camera/card quality from 0 to 1; not calibration confidence. */
  scan_quality: number;
  sample_count: number;
  is_saturated: boolean;
  raw_image_path: string | null;
}

// ─── Enriched types for UI ───────────────────────────────────────────────────

export interface WorkerWithLatestReading extends Worker {
  latest_reading?: Reading;
  active_shift?: Shift;
}

export interface ShiftWithReading extends Shift {
  reading?: Reading;
  worker?: Worker;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  oel_twa_ppm: number;         // India Factories Act Schedule II: 8-hour TWA
  oel_stel_ppm: number;        // India Factories Act Schedule II: 15-minute STEL
  oel_ceiling_ppm: number;     // Primary worker-facing reference value (8-hour TWA)
  risk_elevated_twa: number;   // Internal early-warning threshold
  risk_high_twa: number;       // India Factories Act Schedule II TWA threshold
  risk_elevated_index: number;
  risk_high_index: number;
  calibration_curve_version: string;
  unit: 'ppm_hr' | 'mg_m3_hr';
}

/** Fixed H₂S reference values. Workers must never be able to change these. */
export const INDIA_FACTORY_H2S_LIMITS = {
  scheduleIiTwaPpm: 10,
  scheduleIiStelPpm: 15,
  scheduleIiStelMinutes: 15,
  earlyWarningPpm: 5,
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  oel_twa_ppm: INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm,
  oel_stel_ppm: INDIA_FACTORY_H2S_LIMITS.scheduleIiStelPpm,
  oel_ceiling_ppm: INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm,
  risk_elevated_twa: INDIA_FACTORY_H2S_LIMITS.earlyWarningPpm,
  risk_high_twa: INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm,
  risk_elevated_index: 10,
  risk_high_index: 25,
  calibration_curve_version: 'v1',
  unit: 'ppm_hr',
};

// ─── Capture pipeline ────────────────────────────────────────────────────────

export type BandValidity = 'VALID' | 'INVALID_BAND' | 'UNPROCESSED';

export interface ProcessingResult {
  band_valid: boolean;
  expiry_delta_e: number;
  sensing_delta_e: number;
  /** A rules-based colour category, separate from a lab-calibrated ppm value. */
  colour_category: 'low' | 'elevated' | 'high';
  cumulative_ppm_hr: number;
  twa_ppm: number;
  h2s_index: number;
  index_mode: IndexMode;
  risk_band: RiskBand;
  calibration_curve_version: string;
  /** Camera/card quality from 0 to 1; not calibration confidence. */
  scan_quality: number;
  sample_count: number;
  is_saturated: boolean;
}
