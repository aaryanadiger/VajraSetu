import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CaptureError,
  CaptureRegions,
  extractRegionsFromDecodedImage,
  mergeCaptureRegions,
} from '../src/services/imageProcessing';
import { freshBandImage, lowLightBandImage, makeScannerSample } from './fixtures/scannerSamples';

function near(actual: number, expected: number, tolerance = 8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
}

test('extracts sensing, expiry, and reference regions from a representative card image', () => {
  const regions = extractRegionsFromDecodedImage(freshBandImage.image);
  near(regions.sensingRGB.r, freshBandImage.expected.sensing.r);
  near(regions.sensingRGB.g, freshBandImage.expected.sensing.g);
  near(regions.sensingRGB.b, freshBandImage.expected.sensing.b);
  near(regions.expiryRGB.r, freshBandImage.expected.expiry.r);
  near(regions.referenceRGB.r, freshBandImage.expected.reference.r);
  assert.ok(regions.scanQuality >= 0.42);
});

test('rejects a representative image with unusable lighting', () => {
  assert.throws(
    () => extractRegionsFromDecodedImage(lowLightBandImage.image),
    (error: unknown) => error instanceof CaptureError && error.problem === 'too_dark'
  );
});

for (const geometry of [
  { width: 320, height: 560, card: { left: 30, top: 120, side: 147 } },
  { width: 560, height: 320, card: { left: 280, top: 100, side: 132 } },
  { width: 320, height: 320, card: { left: 170, top: 40, side: 100 } },
]) {
  test(`reads an off-centre card in ${geometry.width}×${geometry.height} at ${geometry.card.left},${geometry.card.top}`, () => {
    const sample = makeScannerSample('off-centre', undefined, undefined, undefined, 220, geometry);
    const regions = extractRegionsFromDecodedImage(sample.image);
    near(regions.sensingRGB.r, sample.expected.sensing.r, 12);
    near(regions.expiryRGB.b, sample.expected.expiry.b, 12);
    near(regions.referenceRGB.r, sample.expected.reference.r, 12);
  });
}

test('rejects an empty scene rather than declaring the card ready', () => {
  const buffer = new Uint8Array(320 * 560 * 3).fill(200);
  assert.throws(() => extractRegionsFromDecodedImage({ cols: 320, rows: 560, channels: 3, buffer }),
    (error: unknown) => error instanceof CaptureError && error.problem === 'card_not_in_frame');
});

test('reports clipped reference lighting as glare', () => {
  const sample = makeScannerSample('glare', undefined, undefined, { r: 255, g: 255, b: 255 });
  assert.throws(() => extractRegionsFromDecodedImage(sample.image),
    (error: unknown) => error instanceof CaptureError && error.problem === 'glare');
});

test('preserves a dark sensing strip instead of sampling the background', () => {
  const sample = makeScannerSample('dark strip', { r: 70, g: 75, b: 45 });
  const regions = extractRegionsFromDecodedImage(sample.image);
  near(regions.sensingRGB.r, 70);
  near(regions.sensingRGB.g, 75);
  near(regions.sensingRGB.b, 45);
});

test('merges three consistent frames using median colours', () => {
  const frames: CaptureRegions[] = [0, 1, 2].map(offset => ({
    sensingRGB: { r: 195 + offset, g: 231 - offset, b: 216 },
    expiryRGB: { r: 245, g: 208 + offset, b: 123 },
    referenceRGB: { r: 245 - offset, g: 245 - offset, b: 245 - offset },
    scanQuality: 0.9,
    sampleCount: 1,
  }));
  const merged = mergeCaptureRegions(frames);
  assert.deepEqual(merged.sensingRGB, { r: 196, g: 230, b: 216 });
  assert.equal(merged.sampleCount, 3);
  assert.ok(merged.scanQuality > 0.8);
});

test('rejects three frames whose colours are inconsistent', () => {
  const common = { expiryRGB: { r: 245, g: 208, b: 123 }, referenceRGB: { r: 245, g: 245, b: 245 }, scanQuality: 0.9, sampleCount: 1 };
  assert.throws(
    () => mergeCaptureRegions([
      { ...common, sensingRGB: { r: 195, g: 231, b: 216 } },
      { ...common, sensingRGB: { r: 185, g: 180, b: 120 } },
      { ...common, sensingRGB: { r: 70, g: 75, b: 45 } },
    ]),
    (error: unknown) => error instanceof CaptureError && error.problem === 'unstable_capture'
  );
});
