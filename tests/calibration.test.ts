import assert from 'node:assert/strict';
import test from 'node:test';
import { CalibrationError, deltaEToPpmHr, getCurve, validateCurveData } from '../src/services/calibration';
import { computeTWA, runExposurePipeline } from '../src/services/exposure';
import { CaptureRegions } from '../src/services/imageProcessing';

function regions(sensingRGB: CaptureRegions['sensingRGB'], expiryRGB = { r: 245, g: 208, b: 123 }): CaptureRegions {
  return { sensingRGB, expiryRGB, referenceRGB: { r: 245, g: 245, b: 245 }, scanQuality: 0.9, sampleCount: 3 };
}

test('validates a fresh expiry patch and rejects a non-yellow expiry patch', async () => {
  const valid = await runExposurePipeline(regions({ r: 195, g: 231, b: 216 }), 8);
  const expired = await runExposurePipeline(regions({ r: 195, g: 231, b: 216 }, { r: 170, g: 170, b: 170 }), 8);
  assert.equal(valid.band_valid, true);
  assert.equal(expired.band_valid, false);
  assert.equal(expired.risk_band, 'invalid');
});

test('classifies representative fresh, intermediate, and dark sensing colours', async () => {
  const low = await runExposurePipeline(regions({ r: 195, g: 231, b: 216 }), 8);
  const elevated = await runExposurePipeline(regions({ r: 165, g: 170, b: 115 }), 8);
  const high = await runExposurePipeline(regions({ r: 70, g: 75, b: 45 }), 8);
  assert.equal(low.colour_category, 'low');
  assert.equal(low.cumulative_ppm_hr, 0);
  assert.equal(elevated.colour_category, 'elevated');
  assert.equal(high.colour_category, 'high');
});

test('interpolates dose between immutable calibration points', () => {
  assert.equal(deltaEToPpmHr(0, 'v2'), 0);
  assert.equal(deltaEToPpmHr(11.5, 'v2'), 2.5);
  assert.equal(deltaEToPpmHr(15, 'v2'), 5);
  assert.ok(Object.isFrozen(getCurve('v2')));
  assert.ok(Object.isFrozen(getCurve('v2').points));
});

test('marks values at and beyond the measured upper bound as saturated', () => {
  const atLimit = computeTWA(38.5, 8, 'v2');
  const beyond = computeTWA(80, 8, 'v2');
  assert.equal(atLimit.isSaturated, true);
  assert.equal(atLimit.cumulativePpmHr, 15);
  assert.equal(beyond.isSaturated, true);
  assert.equal(beyond.cumulativePpmHr, 15);
});

test('rejects malformed and unknown calibration curves clearly', () => {
  assert.throws(() => validateCurveData({ version: 'bad', description: 'bad', points: [] }), CalibrationError);
  assert.throws(() => getCurve('does-not-exist'), /Unknown calibration curve/);
});
