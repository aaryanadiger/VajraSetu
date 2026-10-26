import { DecodedImage, RGB } from '../../src/services/imageProcessing';

export interface ScannerSample {
  name: string;
  image: DecodedImage;
  expected: { sensing: RGB; expiry: RGB; reference: RGB };
}

const width = 320;
const height = 320;
const card = { left: 87, top: 87, side: 147 };

function paint(buffer: Uint8Array, region: { x: number; y: number; width: number; height: number }, rgb: RGB) {
  const left = card.left + Math.round(region.x * card.side);
  const top = card.top + Math.round(region.y * card.side);
  const regionWidth = Math.round(region.width * card.side);
  const regionHeight = Math.round(region.height * card.side);
  for (let y = top; y <= top + regionHeight; y += 1) {
    for (let x = left; x <= left + regionWidth; x += 1) {
      const offset = (y * width + x) * 3;
      buffer[offset] = rgb.b;
      buffer[offset + 1] = rgb.g;
      buffer[offset + 2] = rgb.r;
    }
  }
}

export function makeScannerSample(
  name: string,
  sensing: RGB = { r: 195, g: 231, b: 216 },
  expiry: RGB = { r: 245, g: 208, b: 123 },
  reference: RGB = { r: 245, g: 245, b: 245 },
  cardBase = 220
): ScannerSample {
  const buffer = new Uint8Array(width * height * 3);
  buffer.fill(35);
  for (let y = card.top; y <= card.top + card.side; y += 1) {
    for (let x = card.left; x <= card.left + card.side; x += 1) {
      const offset = (y * width + x) * 3;
      buffer[offset] = cardBase;
      buffer[offset + 1] = cardBase;
      buffer[offset + 2] = cardBase;
    }
  }
  paint(buffer, { x: 0.55, y: 0.08, width: 0.26, height: 0.17 }, reference);
  paint(buffer, { x: 0.53, y: 0.38, width: 0.28, height: 0.30 }, expiry);
  paint(buffer, { x: 0.14, y: 0.17, width: 0.28, height: 0.29 }, sensing);
  return { name, image: { cols: width, rows: height, channels: 3, buffer }, expected: { sensing, expiry, reference } };
}

export const freshBandImage = makeScannerSample('fresh band');
export const lowLightBandImage = makeScannerSample(
  'low-light band',
  { r: 50, g: 80, b: 65 },
  { r: 120, g: 95, b: 30 },
  { r: 95, g: 95, b: 95 },
  95
);
