import assert from 'node:assert/strict';
import test from 'node:test';
import { generateCSV, validateCSVExport } from '../src/services/csv';
import { Reading, Shift, Worker } from '../src/types';

test('CSV export contains linked worker, shift, build, device, and calibration fields without leaking a local path', () => {
  const worker: Worker = { id: 'worker-1', name: 'Imran Khan', worker_code: 'WK-14', site_id: 'Pune Plant', created_at: '2026-01-01T00:00:00.000Z' };
  const shift: Shift = { id: 'shift-1', worker_id: worker.id, start_time: '2026-10-26T01:00:00.000Z', end_time: '2026-10-26T09:00:00.000Z', wristband_id: 'band-1' };
  const reading: Reading = {
    id: 'reading-1', shift_id: shift.id, wristband_id: shift.wristband_id, captured_at: shift.end_time!,
    band_valid: true, expiry_delta_e: 2.4, sensing_delta_e: 15, cumulative_ppm_hr: 5, twa_ppm: 0.625,
    h2s_index: 24.1, index_mode: 'estimated_single_sample', risk_band: 'elevated', calibration_curve_version: 'v2',
    scan_quality: 0.91, sample_count: 3, is_saturated: false, raw_image_path: '/private/device-only/photo.jpg',
    app_version: '1.0.0', build_version: '42', device_model: 'iPhone 15', os_name: 'iOS', os_version: '27.0',
  };
  const csv = generateCSV([{ reading, worker, shift }]);
  assert.match(csv, /Worker Name,Worker Code,Worker Site,Shift ID/);
  assert.match(csv, /Imran Khan,WK-14,Pune Plant,shift-1/);
  assert.match(csv, /App Version,Build Version,Device Model,OS Name,OS Version/);
  assert.match(csv, /1\.0\.0,42,iPhone 15,iOS,27\.0,YES/);
  assert.doesNotMatch(csv, /\/private\/device-only/);
  assert.doesNotThrow(() => validateCSVExport(csv));
  assert.throws(() => validateCSVExport('Reading ID,Captured At\nreading-1,now'), /missing required fields/);
});
