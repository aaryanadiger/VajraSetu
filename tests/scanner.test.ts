import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CaptureError,
  CaptureRegions,
  extractRegionsFromDecodedImage,
  mergeCaptureRegions,
} from '../src/services/imageProcessing';
import { freshBandImage, lowLightBandImage } from './fixtures/scannerSamples';

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
    (error: unknown) => error instanceof CaptureError && error.problem === 'poor_lighting'
  );
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
