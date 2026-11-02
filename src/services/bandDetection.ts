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
  const masks = Array.from({ length: 5 }, () => new Uint8Array(cols * rows));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = (Math.min(y * stride, source.rows - 1) * source.cols + Math.min(x * stride, source.cols - 1)) * source.channels;
    const p = { b: source.buffer[i], g: source.buffer[i + 1], r: source.buffer[i + 2] };
    pixels.push(p);
  }
  // Estimate the frame's illuminant from bright neutral backing before colour
  // segmentation. Keep raw RGB for the exposure pipeline and recorded result.
  const neutralSamples = pixels.filter((p, index) => index % 16 === 0 && brightness(p) > 80
    && chroma(p) < Math.min(65, brightness(p) * 0.25)).sort((a, b) => brightness(a) - brightness(b));
  const brightest = neutralSamples.slice(Math.floor(neutralSamples.length * 0.75));
  const white = brightest.length ? { r: median(brightest.map(p => p.r)),
    g: median(brightest.map(p => p.g)), b: median(brightest.map(p => p.b)) } : { r: 200, g: 200, b: 200 };
  const target = brightness(white);
  const gain = { r: Math.max(0.75, Math.min(1.3, target / white.r)),
    g: Math.max(0.75, Math.min(1.3, target / white.g)), b: Math.max(0.75, Math.min(1.3, target / white.b)) };
  for (let index = 0; index < pixels.length; index++) {
    const raw = pixels[index];
    const p = { r: raw.r * gain.r, g: raw.g * gain.g, b: raw.b * gain.b };
    // Yellow/orange/brown expiry dot; no requirement that it be chemically valid.
    if (p.r > 75 && p.g > p.r * 0.52 && Math.min(p.r, p.g) - p.b > 15) masks[0][index] = 1;
    // Textured CuSO4 can be only slightly greener than red under warm light;
    // it can also be genuinely blue/cyan. Do not split it at a 4-point boundary.
    const green = p.g > p.r - 3 && p.g >= p.b - 10 && chroma(p) > Math.max(8, brightness(p) * 0.07);
    const blue = p.b > p.r + 6 && p.b > p.g + 2;
    const brown = p.r > p.g + 5 && p.r > p.b + 8 && p.r < 190;
    const scaleBrown = Math.max(p.g, p.b) < p.r * 0.9 && p.r > p.b + 10 && chroma(p) > 18;
    const scaleBlue = p.b > p.r + Math.max(6, brightness(p) * 0.08) && p.b > p.g + 2;
    const dark = brightness(p) < 80;
    if (green || blue) masks[1][index] = 1;
    if (brown || dark) masks[3][index] = 1;
    // Generic chroma connected the entire warm paper to the printed scale.
    // Separate blue/brown families instead of classifying cream paper as ink.
    if (scaleBlue || scaleBrown) masks[4][index] = 1;
    // Retain a second proposal path for lightly printed, desaturated scales.
    // Both paths still require the blue/brown sequence and band geometry.
    if (chroma(p) > 12) masks[2][index] = 1;
  }
  masks[1] = closeSmallGaps(masks[1], cols, rows);
  const blobs = masks.map(mask => components(mask, cols, rows));
  const dots = blobs[0].filter(b => compact(b) && b.pixels.length >= 8 && b.pixels.length < cols * rows * 0.15);
  const pads = [...blobs[1], ...blobs[3]].filter(b => compact(b) && b.pixels.length >= 12 && b.pixels.length < cols * rows * 0.3);
  // Printed scales can separate into blue and brown components where their
  // middle is desaturated. Join aligned neighbours across that short gap.
  const scaleParts = [...blobs[2], ...blobs[4]];
  for (const parts of [blobs[2], blobs[4]]) {
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j];
    const ac = centre(a), bc = centre(b);
    const shapeA = orientedShape(a, cols), shapeB = orientedShape(b, cols);
    const axis = shapeA.length / shapeA.width >= shapeB.length / shapeB.width ? shapeA : shapeB;
    const along = Math.abs((bc.x - ac.x) * Math.cos(axis.angle) + (bc.y - ac.y) * Math.sin(axis.angle));
    const across = Math.abs(-(bc.x - ac.x) * Math.sin(axis.angle) + (bc.y - ac.y) * Math.cos(axis.angle));
    const verticalGap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
    const horizontalGap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
    // A short visible end of a scale can be wider than it is long. Its own
    // principal axis then points sideways; align the two end centres as well.
    const vertical = Math.abs(ac.x - bc.x) < Math.min(a.right - a.left + 1, b.right - b.left + 1) * 0.6
      && verticalGap >= 0 && verticalGap < Math.max(a.right - a.left + 1, b.right - b.left + 1) * 1.5;
    const horizontal = Math.abs(ac.y - bc.y) < Math.min(a.bottom - a.top + 1, b.bottom - b.top + 1) * 0.6
      && horizontalGap >= 0 && horizontalGap < Math.max(a.bottom - a.top + 1, b.bottom - b.top + 1) * 1.5;
    if (vertical || horizontal || (across < Math.min(shapeA.width, shapeB.width) * 0.8
      && along < (shapeA.length + shapeB.length) / 2 + Math.max(shapeA.width, shapeB.width) * 1.4)) scaleParts.push({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
      right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom), pixels: [...a.pixels, ...b.pixels] });
  }
  }
  const scales = scaleParts.filter(b => {
    const shape = orientedShape(b, cols);
    const ratio = shape.length / shape.width;
    if (ratio < 1.5 || ratio > 7 || b.pixels.length < 20) return false;
    const blue = b.pixels.filter(i => pixels[i].b * gain.b > pixels[i].r * gain.r + 8).length;
    const brown = b.pixels.filter(i => pixels[i].r * gain.r > pixels[i].g * gain.g + 4
      && pixels[i].r * gain.r > pixels[i].b * gain.b + 8).length;
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
      const score = centred * 2 + greenBonus + Math.min(padSize / 80, 0.25)
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

function closeSmallGaps(mask: Uint8Array, cols: number, rows: number) {
  const expanded = new Uint8Array(mask.length), closed = mask.slice();
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    const i = y * cols + x;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (mask[i + dy * cols + dx]) expanded[i] = 1;
    }
  }
  for (let y = 2; y < rows - 2; y++) for (let x = 2; x < cols - 2; x++) {
    const i = y * cols + x;
    let filled = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!expanded[i + dy * cols + dx]) filled = false;
    }
    if (filled) closed[i] = 1;
  }
  return closed;
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
