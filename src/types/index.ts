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
  oel_twa_ppm: number;         // Compatibility field: OSHA general-industry ceiling
  oel_stel_ppm: number;        // Compatibility field: OSHA general-industry ceiling
  oel_ceiling_ppm: number;     // OSHA general-industry ceiling
  risk_elevated_twa: number;   // Internal early-warning threshold
  risk_high_twa: number;       // OSHA ceiling threshold
  risk_elevated_index: number;
  risk_high_index: number;
  calibration_curve_version: string;
  unit: 'ppm_hr' | 'mg_m3_hr';
}

/** Fixed H₂S reference values. Workers must never be able to change these. */
export const OSHA_H2S_LIMITS = {
  generalIndustryCeilingPpm: 20,
  maximumPeakPpm: 50,
  maximumPeakMinutes: 10,
  earlyWarningPpm: 10,
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  oel_twa_ppm: OSHA_H2S_LIMITS.generalIndustryCeilingPpm,
  oel_stel_ppm: OSHA_H2S_LIMITS.generalIndustryCeilingPpm,
  oel_ceiling_ppm: OSHA_H2S_LIMITS.generalIndustryCeilingPpm,
  risk_elevated_twa: OSHA_H2S_LIMITS.earlyWarningPpm,
  risk_high_twa: OSHA_H2S_LIMITS.generalIndustryCeilingPpm,
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
  cumulative_ppm_hr: number;
  twa_ppm: number;
  h2s_index: number;
  index_mode: IndexMode;
  risk_band: RiskBand;
  calibration_curve_version: string;
}
