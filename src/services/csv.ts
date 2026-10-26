/**
 * CSV export service — generates a traceable prototype export for readings.
 * Use expo-sharing or expo-file-system to save/share the output.
 */

import { Reading, Worker, Shift } from '../types';

export interface CSVRow {
  reading: Reading;
  worker?: Worker;
  shift?: Shift;
}

export const CSV_HEADERS = [
  'Reading ID',
  'Captured At',
  'Worker Name',
  'Worker Code',
  'Worker Site',
  'Shift ID',
  'Shift Start',
  'Shift End',
  'Wristband ID',
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
  'App Version',
  'Build Version',
  'Device Model',
  'OS Name',
  'OS Version',
  'Image Stored Locally',
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
  const lines: string[] = [CSV_HEADERS.join(',')];

  for (const { reading, worker, shift } of rows) {
    const cells = [
      reading.id,
      reading.captured_at,
      worker?.name ?? '',
      worker?.worker_code ?? '',
      worker?.site_id ?? '',
      shift?.id ?? reading.shift_id,
      shift?.start_time ?? '',
      shift?.end_time ?? '',
      reading.wristband_id,
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
      reading.app_version,
      reading.build_version,
      reading.device_model,
      reading.os_name,
      reading.os_version,
      reading.raw_image_path ? 'YES' : 'NO',
    ];
    lines.push(cells.map(escape).join(','));
  }

  return lines.join('\n');
}

/** Fail before sharing if a written export is truncated or missing traceability fields. */
export function validateCSVExport(csv: string): void {
  const firstLine = csv.split(/\r?\n/, 1)[0];
  const actualHeaders = new Set(firstLine.split(','));
  const required = [
    'Worker Name', 'Worker Code', 'Worker Site', 'Shift ID', 'Shift Start', 'Shift End',
    'Calibration Version', 'App Version', 'Build Version', 'Device Model', 'OS Name',
    'OS Version', 'Image Stored Locally',
  ];
  const missing = required.filter(header => !actualHeaders.has(header));
  if (missing.length > 0) throw new Error(`CSV export is missing required fields: ${missing.join(', ')}`);
  if (csv.split(/\r?\n/).length < 2) throw new Error('CSV export contains no readings.');
}

export function getExportFilename(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  return `vajra_setu_export_${date}.csv`;
}
