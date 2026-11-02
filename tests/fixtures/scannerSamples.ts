import { DecodedImage, RGB } from '../../src/services/imageProcessing';

export interface ScannerSample {
  name: string;
  image: DecodedImage;
  expected: { sensing: RGB; expiry: RGB; reference: RGB };
}

const width = 320;
const height = 320;
const card = { left: 87, top: 87, side: 147 };

function paint(buffer: Uint8Array, region: { x: number; y: number; width: number; height: number }, rgb: RGB, card: { left: number; top: number; side: number }, width: number) {
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
  cardBase = 220,
  geometry = { width, height, card }
): ScannerSample {
  const { width, height, card } = geometry;
  const buffer = new Uint8Array(width * height * 3);
  buffer.fill(35);
  for (let y = card.top; y <= card.top + card.side; y += 1) {
    for (let x = card.left; x <= card.left + card.side; x += 1) {
      const offset = (y * width + x) * 3;
      buffer[offset] = reference.b;
      buffer[offset + 1] = reference.g;
      buffer[offset + 2] = reference.r;
    }
  }
  paint(buffer, { x: 0.3, y: 0.12, width: 0.12, height: 0.12 }, expiry, card, width);
  paint(buffer, { x: 0.26, y: 0.34, width: 0.19, height: 0.19 }, sensing, card, width);
  paint(buffer, { x: 0.28, y: 0.64, width: 0.15, height: 0.14 }, { r: 100, g: 125, b: 160 }, card, width);
  paint(buffer, { x: 0.28, y: 0.78, width: 0.15, height: 0.14 }, { r: 150, g: 110, b: 95 }, card, width);
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
