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
  oel_twa_ppm: number;         // default 5 (India)
  oel_stel_ppm: number;        // default 10
  oel_ceiling_ppm: number;     // default 10
  risk_elevated_twa: number;   // TWA threshold for Elevated
  risk_high_twa: number;       // TWA threshold for High
  risk_elevated_index: number;
  risk_high_index: number;
  calibration_curve_version: string;
  unit: 'ppm_hr' | 'mg_m3_hr';
}

export const DEFAULT_SETTINGS: AppSettings = {
  oel_twa_ppm: 5,
  oel_stel_ppm: 10,
  oel_ceiling_ppm: 10,
  risk_elevated_twa: 2.5,
  risk_high_twa: 5,
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
