import type { CaptureRegions, DecodedImage, RGB } from './imageProcessing';

type Blob = { left: number; top: number; right: number; bottom: number; pixels: number[] };
const shapeCache = new WeakMap<Blob, { angle: number; length: number; width: number }>();
const brightness = (p: RGB) => (p.r + p.g + p.b) / 3;
const chroma = (p: RGB) => Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b);
const centre = (b: Blob) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
const side = (b: Blob) => Math.sqrt((b.right - b.left + 1) * (b.bottom - b.top + 1));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Recognise the actual separate strip, dot and printed blue/brown reference.
 * No square-card layout, centre target or fixed orientation is assumed.
 */
export function detectPhysicalBand(source: DecodedImage): CaptureRegions | undefined {
  const stride = Math.max(1, Math.ceil(Math.max(source.cols, source.rows) / 400));
  const cols = Math.ceil(source.cols / stride), rows = Math.ceil(source.rows / stride);
  const pixels: RGB[] = [];
  const masks = Array.from({ length: 4 }, () => new Uint8Array(cols * rows));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = (Math.min(y * stride, source.rows - 1) * source.cols + Math.min(x * stride, source.cols - 1)) * source.channels;
    const p = { b: source.buffer[i], g: source.buffer[i + 1], r: source.buffer[i + 2] };
    const index = y * cols + x; pixels.push(p);
    // Yellow/orange/brown expiry dot; no requirement that it be chemically valid.
    if (p.r > 75 && p.g > p.r * 0.52 && Math.min(p.r, p.g) - p.b > 15) masks[0][index] = 1;
    const green = p.g > p.r + 4 && p.g >= p.b - 10;
    const brown = p.r > p.g + 5 && p.r > p.b + 8 && p.r < 190;
    const dark = brightness(p) < 80;
    if (green) masks[1][index] = 1;
    if (brown || dark) masks[3][index] = 1;
    if (chroma(p) > 12) masks[2][index] = 1;
  }
  const blobs = masks.map(mask => components(mask, cols, rows));
  const dots = blobs[0].filter(b => compact(b) && b.pixels.length >= 8 && b.pixels.length < cols * rows * 0.15);
  const pads = [...blobs[1], ...blobs[3]].filter(b => compact(b) && b.pixels.length >= 12 && b.pixels.length < cols * rows * 0.3);
  // Printed scales can separate into blue and brown components where their
  // middle is desaturated. Join aligned neighbours across that short gap.
  const scaleParts = [...blobs[2]];
  for (let i = 0; i < blobs[2].length; i++) for (let j = i + 1; j < blobs[2].length; j++) {
    const a = blobs[2][i], b = blobs[2][j];
    const ac = centre(a), bc = centre(b);
    const shapeA = orientedShape(a, cols), shapeB = orientedShape(b, cols);
    const axis = shapeA.length / shapeA.width >= shapeB.length / shapeB.width ? shapeA : shapeB;
    const along = Math.abs((bc.x - ac.x) * Math.cos(axis.angle) + (bc.y - ac.y) * Math.sin(axis.angle));
    const across = Math.abs(-(bc.x - ac.x) * Math.sin(axis.angle) + (bc.y - ac.y) * Math.cos(axis.angle));
    if (across < Math.min(shapeA.width, shapeB.width) * 0.8
      && along < (shapeA.length + shapeB.length) / 2 + Math.max(shapeA.width, shapeB.width) * 1.4) scaleParts.push({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
      right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom), pixels: [...a.pixels, ...b.pixels] });
  }
  const scales = scaleParts.filter(b => {
    const shape = orientedShape(b, cols);
    const ratio = shape.length / shape.width;
    if (ratio < 1.5 || ratio > 7 || b.pixels.length < 20) return false;
    const blue = b.pixels.filter(i => pixels[i].b > pixels[i].r + 8).length;
    const brown = b.pixels.filter(i => pixels[i].r > pixels[i].g + 4 && pixels[i].r > pixels[i].b + 8).length;
    return blue / b.pixels.length > 0.12 && brown / b.pixels.length > 0.12;
  });
  let best: { score: number; dot: Blob; pad: Blob; scale: Blob } | undefined;
  for (const dot of dots) for (const pad of pads) {
    const d = distance(centre(dot), centre(pad));
    const dotSize = side(dot), padSize = side(pad);
    if (padSize / dotSize < 0.65 || padSize / dotSize > 2.5 || d < Math.max(dotSize, padSize) * 0.55 || d > padSize * 4) continue;
    if (dot.left <= pad.right && dot.right >= pad.left && dot.top <= pad.bottom && dot.bottom >= pad.top) {
      const padPixels = new Set(pad.pixels);
      if (dot.pixels.filter(i => padPixels.has(i)).length > Math.min(dot.pixels.length, pad.pixels.length) * 0.2) continue;
    }
    for (const scale of scales) {
      const overlaps = (a: Blob, b: Blob) => a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
      if (overlaps(scale, pad) || overlaps(scale, dot)) continue;
      const { length: scaleLength, width: scaleWidth } = orientedShape(scale, cols);
      const fromPad = distance(centre(pad), centre(scale));
      if (scaleWidth < padSize * 0.35 || scaleWidth > padSize * 1.8 || scaleLength < padSize * 1.3
        || scaleLength > padSize * 6 || fromPad > padSize * 6 || fromPad < padSize) continue;
      const pc = centre(pad);
      const centred = 1 - distance(pc, { x: cols / 2, y: rows / 2 }) / Math.hypot(cols / 2, rows / 2);
      const colour = sample(pad, pixels, cols);
      const greenBonus = colour.g > colour.r + 4 && colour.g >= colour.b - 10 ? 0.3 : 0;
      // Prefer the dot/scale belonging to this band over a neighbouring band.
      const score = centred + greenBonus + Math.min(padSize / 80, 0.25)
        - Math.abs(d / padSize - 1.3) * 0.12 - fromPad / padSize * 0.03;
      if (!best || score > best.score) best = { score, dot, pad, scale };
    }
  }
  if (!best) return;
  const { dot, pad, scale } = best;
  // Sample the neutral band backing alongside the printed scale, not a coloured
  // swatch or the chemical pads. It provides the white-balance observation.
  const neutral: RGB[] = [];
  for (const blob of [pad, scale]) {
    const w = blob.right - blob.left + 1, h = blob.bottom - blob.top + 1;
    for (const [nx, ny] of [[-0.2, 0.2], [-0.2, 0.5], [1.2, 0.2], [1.2, 0.5], [0.5, -0.2], [0.5, 1.2]]) {
      const x = Math.round(blob.left + nx * w), y = Math.round(blob.top + ny * h);
      if (x >= 0 && y >= 0 && x < cols && y < rows) {
        const p = pixels[y * cols + x];
        if (chroma(p) < 45 && brightness(p) > 55) neutral.push(p);
      }
    }
  }
  if (neutral.length < 3) return;
  neutral.sort((a, b) => brightness(a) - brightness(b));
  const whites = neutral.slice(Math.floor(neutral.length / 2));
  const pc = centre(pad), dc = centre(dot);
  return {
    sensingRGB: sample(pad, pixels, cols), expiryRGB: sample(dot, pixels, cols),
    referenceRGB: { r: median(whites.map(p => p.r)), g: median(whites.map(p => p.g)), b: median(whites.map(p => p.b)) },
    scanQuality: 0.8, sampleCount: 1,
    detection: { x: pc.x / cols, y: pc.y / rows, size: side(pad) / Math.min(cols, rows),
      rotation: (Math.atan2(pc.y - dc.y, pc.x - dc.x) * 180 / Math.PI + 360) % 360 },
  };
}

function compact(b: Blob) {
  const w = b.right - b.left + 1, h = b.bottom - b.top + 1;
  return w / h > 0.5 && w / h < 1.9 && b.pixels.length / (w * h) > 0.4;
}

/** Principal axis makes the printed scale recognisable at any phone angle. */
function orientedShape(blob: Blob, cols: number) {
  const cached = shapeCache.get(blob);
  if (cached) return cached;
  let sx = 0, sy = 0, xx = 0, yy = 0, xy = 0;
  for (const i of blob.pixels) {
    const x = i % cols, y = Math.floor(i / cols);
    sx += x; sy += y; xx += x * x; yy += y * y; xy += x * y;
  }
  const n = blob.pixels.length, mx = sx / n, my = sy / n;
  const angle = Math.atan2(2 * (xy / n - mx * my), xx / n - mx * mx - yy / n + my * my) / 2;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const i of blob.pixels) {
    const x = i % cols - mx, y = Math.floor(i / cols) - my;
    const along = x * Math.cos(angle) + y * Math.sin(angle);
    const across = -x * Math.sin(angle) + y * Math.cos(angle);
    left = Math.min(left, along); right = Math.max(right, along);
    top = Math.min(top, across); bottom = Math.max(bottom, across);
  }
  const shape = { angle, length: right - left + 1, width: bottom - top + 1 };
  shapeCache.set(blob, shape);
  return shape;
}

function sample(b: Blob, pixels: RGB[], cols: number): RGB {
  const c = centre(b), radius = Math.min(b.right - b.left + 1, b.bottom - b.top + 1) * 0.3;
  const points: RGB[] = [];
  for (let y = Math.ceil(c.y - radius); y <= c.y + radius; y++) for (let x = Math.ceil(c.x - radius); x <= c.x + radius; x++) {
    if (Math.hypot(x - c.x, y - c.y) <= radius) points.push(pixels[y * cols + x]);
  }
  return { r: median(points.map(p => p.r)), g: median(points.map(p => p.g)), b: median(points.map(p => p.b)) };
}

function components(mask: Uint8Array, cols: number, rows: number): Blob[] {
  const queue = new Int32Array(mask.length), found: Blob[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    let head = 0, tail = 1;
    const blob: Blob = { left: cols, top: rows, right: 0, bottom: 0, pixels: [] };
    queue[0] = i; mask[i] = 0;
    while (head < tail) {
      const j = queue[head++], x = j % cols, y = Math.floor(j / cols);
      blob.pixels.push(j); blob.left = Math.min(blob.left, x); blob.right = Math.max(blob.right, x);
      blob.top = Math.min(blob.top, y); blob.bottom = Math.max(blob.bottom, y);
      for (const next of [x > 0 ? j - 1 : -1, x + 1 < cols ? j + 1 : -1, y > 0 ? j - cols : -1, y + 1 < rows ? j + cols : -1]) {
        if (next >= 0 && mask[next]) { queue[tail++] = next; mask[next] = 0; }
      }
    }
    if (tail >= 5 && tail < cols * rows * 0.9) found.push(blob);
  }
  return found.sort((a, b) => b.pixels.length - a.pixels.length).slice(0, 100);
}
