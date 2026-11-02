import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceAutoCapture, emptyAutoCapture } from '../src/services/autoCapture';
import type { CaptureRegions } from '../src/services/imageProcessing';

const frame: CaptureRegions = {
  sensingRGB: { r: 147, g: 164, b: 161 }, expiryRGB: { r: 167, g: 117, b: 35 },
  referenceRGB: { r: 213, g: 218, b: 221 }, scanQuality: 0.8, sampleCount: 1,
  detection: { x: 0.5, y: 0.6, size: 0.1, rotation: 90 },
};

test('automatically becomes ready after three stable observations and a hold', () => {
  const first = advanceAutoCapture(emptyAutoCapture(), frame, 100);
  const second = advanceAutoCapture(first.state, frame, 650);
  const third = advanceAutoCapture(second.state, frame, 1200);
  assert.equal(first.ready, false); assert.equal(second.ready, false);
  assert.equal(third.ready, true); assert.equal(third.progress, 1);
});

test('moving to another band resets the automatic capture hold', () => {
  const first = advanceAutoCapture(emptyAutoCapture(), frame, 100);
  const second = advanceAutoCapture(first.state, frame, 650);
  const moved = advanceAutoCapture(second.state, { ...frame, detection: { ...frame.detection!, x: 0.7 } }, 1200);
  assert.equal(moved.ready, false); assert.equal(moved.state.frames.length, 1);
});

test('changing colours or insufficient quality never triggers automatic capture', () => {
  const first = advanceAutoCapture(emptyAutoCapture(), frame, 100);
  const changed = advanceAutoCapture(first.state, { ...frame, sensingRGB: { r: 70, g: 75, b: 45 } }, 1500);
  assert.equal(changed.ready, false);
  const blurred = advanceAutoCapture(changed.state, { ...frame, scanQuality: 0.3 }, 2100);
  assert.equal(blurred.ready, false); assert.equal(blurred.state.frames.length, 0);
});

test('stale observations cannot trigger a scan on returning to the camera', () => {
  const first = advanceAutoCapture(emptyAutoCapture(), frame, 100);
  const later = advanceAutoCapture(first.state, frame, 10000);
  assert.equal(later.ready, false); assert.equal(later.state.frames.length, 1);
});
