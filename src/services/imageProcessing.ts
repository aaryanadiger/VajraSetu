/**
 * Image processing service — CIELAB conversion and ΔE00 (CIEDE2000) math.
 *
 * Pure TypeScript — no OpenCV required for the color math itself.
 * OpenCV is only used for perspective correction and region sampling,
 * which is wrapped in a graceful demo-mode fallback for Expo Go.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RGB { r: number; g: number; b: number }
export interface LAB { L: number; a: number; b: number }

export interface CaptureRegions {
  /** Average RGB of the sensing (colorimetric) area */
  sensingRGB: RGB;
  /** Average RGB of the FeSO4 expiry indicator dot */
  expiryRGB: RGB;
  /** Average RGB of the unexposed reference patch on the printed scale */
  referenceRGB: RGB;
}

// ─── sRGB → CIELAB ────────────────────────────────────────────────────────────

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Convert sRGB (0-255) to CIELAB (D65 illuminant) */
export function rgbToLab(rgb: RGB): LAB {
  // sRGB → linear
  const rl = linearize(rgb.r);
  const gl = linearize(rgb.g);
  const bl = linearize(rgb.b);

  // linear → XYZ (D65)
  const X = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const Z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  // XYZ → Lab (D65 reference white)
  const xn = 0.95047, yn = 1.00000, zn = 1.08883;

  function f(t: number): number {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  }

  const fx = f(X / xn);
  const fy = f(Y / yn);
  const fz = f(Z / zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// ─── CIEDE2000 (ΔE00) ────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/**
 * CIEDE2000 color difference. Returns a perceptually uniform ΔE value.
 * Reference: Sharma et al. (2005), Color Research & Application.
 */
export function ciede2000(lab1: LAB, lab2: LAB): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = (Math.atan2(b1, a1p) * 180) / Math.PI + (b1 < 0 || a1p < 0 ? (b1 === 0 && a1p < 0 ? 180 : 360) : 0);
  const h2p = (Math.atan2(b2, a2p) * 180) / Math.PI + (b2 < 0 || a2p < 0 ? (b2 === 0 && a2p < 0 ? 180 : 360) : 0);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG);

  const Lbar = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let Hbarp = (h1p + h2p) / 2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) {
      Hbarp = (h1p + h2p + 360) / 2;
    }
  }

  const T =
    1 -
    0.17 * Math.cos((Hbarp - 30) * DEG) +
    0.24 * Math.cos(2 * Hbarp * DEG) +
    0.32 * Math.cos((3 * Hbarp + 6) * DEG) -
    0.20 * Math.cos((4 * Hbarp - 63) * DEG);

  const SL = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const dTheta = 30 * Math.exp(-Math.pow((Hbarp - 275) / 25, 2));
  const RT = -Math.sin(2 * dTheta * DEG) * RC;

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  );
}

// ─── Convenience: RGB → ΔE against reference ─────────────────────────────────

export function computeDeltaE(targetRGB: RGB, referenceRGB: RGB): number {
  return ciede2000(rgbToLab(targetRGB), rgbToLab(referenceRGB));
}

// ─── Region extraction (demo mode / real mode) ────────────────────────────────

/**
 * In Expo Go or environments without react-native-fast-opencv native module,
 * returns a simulated result so the full UI flow can be demonstrated.
 *
 * In a development build with OpenCV, this would:
 *  1. Run perspective correction using the printed reference-scale corners
 *  2. Crop the three regions (sensing, expiry dot, reference white patch)
 *  3. Average the RGB pixels in each region
 *  4. Return the CaptureRegions struct
 */
export async function extractRegionsFromImage(imageUri: string): Promise<CaptureRegions> {
  const isExpoGo = isRunningInExpoGo();

  if (isExpoGo || !imageUri) {
    // Demo mode: return a plausible mid-exposure simulation
    return simulatedCapture();
  }

  try {
    // Real processing path — requires react-native-fast-opencv dev build
    const { OpenCV } = await import('react-native-fast-opencv');
    return await _realExtractRegions(OpenCV, imageUri);
  } catch {
    console.warn('[imageProcessing] OpenCV not available, using demo mode');
    return simulatedCapture();
  }
}

function simulatedCapture(): CaptureRegions {
  // Provisional unexposed CuSO4 baseline from the supplied sample photograph.
  // Real values are supplied by the native OpenCV extraction path.
  return {
    referenceRGB: { r: 245, g: 245, b: 245 },
    expiryRGB: { r: 0, g: 0, b: 0 },
    sensingRGB: { r: 174, g: 190, b: 181 },
  };
}

async function _realExtractRegions(OpenCV: any, imageUri: string): Promise<CaptureRegions> {
  // Perspective correction + region sampling using react-native-fast-opencv
  // This is a structural stub — implement with the team's OpenCV pipeline
  const mat = await OpenCV.imageRgbaToMat({ uri: imageUri });
  
  // 1. Detect reference scale corners for perspective transform
  // 2. Apply getPerspectiveTransform + warpPerspective
  // 3. Crop regions by fixed relative coordinates on the corrected image
  // 4. Average pixel values in each region

  // Placeholder: sample entire image average as a fallback
  const avgRGB = await OpenCV.getMatMean(mat);
  await OpenCV.clearBuffers();

  return {
    referenceRGB: { r: 240, g: 248, b: 255 },
    expiryRGB:   { r: avgRGB.r * 0.95, g: avgRGB.g * 0.93, b: avgRGB.b * 0.80 },
    sensingRGB:  { r: avgRGB.r, g: avgRGB.g, b: avgRGB.b },
  };
}

function isRunningInExpoGo(): boolean {
  try {
    // expo-constants is always available in Expo projects
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}
