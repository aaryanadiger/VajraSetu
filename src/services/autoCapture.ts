import { CaptureRegions, computeDeltaE } from './imageProcessing';

export interface AutoCaptureState { frames: CaptureRegions[]; startedAt: number }
export const emptyAutoCapture = (): AutoCaptureState => ({ frames: [], startedAt: 0 });

/** Three consistent observations of the same band, not three unrelated colours. */
export function advanceAutoCapture(state: AutoCaptureState, frame: CaptureRegions, now: number) {
  if (frame.scanQuality < 0.5) return { state: emptyAutoCapture(), ready: false, progress: 0 };
  const previous = state.frames.at(-1);
  const geometry = frame.detection, oldGeometry = previous?.detection;
  const moved = geometry && oldGeometry && (
    Math.hypot(geometry.x - oldGeometry.x, geometry.y - oldGeometry.y) > 0.06
    || Math.abs(geometry.size - oldGeometry.size) > 0.08
    || Math.abs(((geometry.rotation - oldGeometry.rotation + 540) % 360) - 180) > 20
  );
  const changed = previous && (['sensingRGB', 'expiryRGB', 'referenceRGB'] as const)
    .some(key => computeDeltaE(previous[key], frame[key]) > 6);
  const stale = state.startedAt > 0 && now - state.startedAt > 5000;
  const next = !previous || moved || changed || stale
    ? { frames: [frame], startedAt: now }
    : { frames: [...state.frames.slice(-2), frame], startedAt: state.startedAt };
  const progress = Math.min(next.frames.length / 3, (now - next.startedAt) / 900, 1);
  return { state: next, ready: next.frames.length >= 3 && now - next.startedAt >= 900, progress };
}
