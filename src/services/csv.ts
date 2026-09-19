/**
 * CSV export service — generates compliance-ready CSV for all readings.
 * Use expo-sharing or expo-file-system to save/share the output.
 */

import { Reading, Worker, Shift } from '../types';

export interface CSVRow {
  reading: Reading;
  worker?: Worker;
  shift?: Shift;
}

const HEADERS = [
  'Reading ID',
  'Captured At',
  'Worker Name',
  'Worker Code',
  'Shift Start',
  'Shift End',
  'Band Valid',
  'Expiry ΔE',
  'Sensing ΔE',
  'Cumulative ppm·hr',
  'TWA ppm',
  'H2S Index',
  'Index Mode',
  'Risk Band',
  'Calibration Version',
  'Scan Quality',
  'Sample Count',
  'Saturated',
  'Image Path',
];

function escape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(rows: CSVRow[]): string {
  const lines: string[] = [HEADERS.join(',')];

  for (const { reading, worker, shift } of rows) {
    const cells = [
      reading.id,
      reading.captured_at,
      worker?.name ?? '',
      worker?.worker_code ?? '',
      shift?.start_time ?? '',
      shift?.end_time ?? '',
      reading.band_valid ? 'YES' : 'NO',
      reading.expiry_delta_e.toFixed(2),
      reading.sensing_delta_e.toFixed(2),
      reading.cumulative_ppm_hr.toFixed(2),
      reading.twa_ppm.toFixed(3),
      reading.h2s_index.toFixed(1),
      reading.index_mode,
      reading.risk_band.toUpperCase(),
      reading.calibration_curve_version,
      reading.scan_quality.toFixed(3),
      reading.sample_count,
      reading.is_saturated ? 'YES' : 'NO',
      reading.raw_image_path ?? '',
    ];
    lines.push(cells.map(escape).join(','));
  }

  return lines.join('\n');
}

export function getExportFilename(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  return `vajra_setu_export_${date}.csv`;
}
