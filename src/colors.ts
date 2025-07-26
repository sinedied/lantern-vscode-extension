export interface OklchColor {
  l: number; // lightness (0-1)
  c: number; // chroma (0-0.4)
  h: number; // hue (0-360)
}

export interface RgbColor {
  r: number; // red (0-255)
  g: number; // green (0-255)
  b: number; // blue (0-255)
}

export function rgbToOklch(rgb: RgbColor): OklchColor {
  // Convert RGB to linear RGB
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const rLinear = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Convert to OKLab
  const l = 0.4122214708 * rLinear + 0.5363325363 * gLinear + 0.0514459929 * bLinear;
  const m = 0.2119034982 * rLinear + 0.6806995451 * gLinear + 0.1073969566 * bLinear;
  const s = 0.0883024619 * rLinear + 0.2817188376 * gLinear + 0.6299787005 * bLinear;

  const lCube = Math.cbrt(l);
  const mCube = Math.cbrt(m);
  const sCube = Math.cbrt(s);

  const L = 0.2104542553 * lCube + 0.793617785 * mCube - 0.0040720468 * sCube;
  const a = 1.9779984951 * lCube - 2.428592205 * mCube + 0.4505937099 * sCube;
  const bOklab = 0.0259040371 * lCube + 0.7827717662 * mCube - 0.808675766 * sCube;

  // Convert to OKLCH
  const C = Math.sqrt(a * a + bOklab * bOklab);
  let H = (Math.atan2(bOklab, a) * 180) / Math.PI;
  if (H < 0) {
    H += 360;
  }

  return { l: L, c: C, h: H };
}

export function oklchToRgb(oklch: OklchColor): RgbColor {
  const { l, c, h } = oklch;

  // Convert to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bOklab = c * Math.sin(hRad);

  // Convert OKLab to linear RGB
  const lCube = l + 0.3963377774 * a + 0.2158037573 * bOklab;
  const mCube = l - 0.1055613458 * a - 0.0638541728 * bOklab;
  const sCube = l - 0.0894841775 * a - 1.291485548 * bOklab;

  const lLinear = lCube * lCube * lCube;
  const mLinear = mCube * mCube * mCube;
  const sLinear = sCube * sCube * sCube;

  const rLinear = +4.0767416621 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
  const gLinear = -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
  const bLinear = -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear;

  // Convert linear RGB to sRGB
  const r = rLinear <= 0.0031308 ? 12.92 * rLinear : 1.055 * Math.pow(rLinear, 1 / 2.4) - 0.055;
  const g = gLinear <= 0.0031308 ? 12.92 * gLinear : 1.055 * Math.pow(gLinear, 1 / 2.4) - 0.055;
  const bSrgb = bLinear <= 0.0031308 ? 12.92 * bLinear : 1.055 * Math.pow(bLinear, 1 / 2.4) - 0.055;

  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(bSrgb * 255))),
  };
}

export function calculateColorDistance(color1: OklchColor, color2: OklchColor): number {
  // Weight factors for perceptual importance
  const lightnessWeight = 2;
  const chromaWeight = 1;
  const hueWeight = 1;

  const lightnessDiff = Math.abs(color1.l - color2.l) * lightnessWeight;
  const chromaDiff = Math.abs(color1.c - color2.c) * chromaWeight;

  let hueDiff = Math.abs(color1.h - color2.h);
  if (hueDiff > 180) {
    hueDiff = 360 - hueDiff;
  }
  hueDiff = (hueDiff / 180) * hueWeight; // Normalize to 0-1 range

  // Euclidean distance in perceptual space
  return Math.sqrt(lightnessDiff * lightnessDiff + chromaDiff * chromaDiff + hueDiff * hueDiff);
}

export function generateRandomColor(existingColor?: RgbColor, maxAttempts: number = 50): RgbColor {
  const existingOklch = existingColor ? rgbToOklch(existingColor) : null;

  let bestColor: RgbColor = { r: 0, g: 0, b: 0 };
  let bestDistance = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const newOklch = generateStatusBarColor();
    const newColor = oklchToRgb(newOklch);

    let distance = existingOklch ? calculateColorDistance(newOklch, existingOklch) : 1;

    if (distance > bestDistance) {
      bestDistance = distance;
      bestColor = newColor;
    }

    if (distance > 0.5) {
      break;
    }
  }

  return bestColor;
}

function generateStatusBarColor(): OklchColor {
  // Define good lightness ranges for status bar (avoid too light or too dark)
  const minLightness = 0.3; // Not too dark
  const maxLightness = 0.7; // Not too light

  // Define good chroma ranges for vibrant but not overwhelming colors
  const minChroma = 0.12; // More saturation for better distinction
  const maxChroma = 0.35; // Higher max for more vibrant colors

  const lightness = minLightness + Math.random() * (maxLightness - minLightness);
  const chroma = minChroma + Math.random() * (maxChroma - minChroma);
  const hue = Math.random() * 360;

  return { l: lightness, c: chroma, h: hue };
}

export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function isValidHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }

  const trimmed = color.trim();
  if (!trimmed.startsWith('#')) {
    return false;
  }

  const cleanHex = trimmed.slice(1);
  if (cleanHex.length === 3) {
    return /^[a-f\d]{3}$/i.test(cleanHex);
  } else if (cleanHex.length === 6) {
    return /^[a-f\d]{6}$/i.test(cleanHex);
  } else if (cleanHex.length === 8) {
    return /^[a-f\d]{8}$/i.test(cleanHex);
  }

  return false;
}

export function hexToRgb(hex: string): RgbColor {
  const cleanHex = hex.replace('#', '');

  // Handle 3-character hex codes
  if (cleanHex.length === 3) {
    const result = /^([a-f\d])([a-f\d])([a-f\d])$/i.exec(cleanHex);
    if (!result) {
      throw new Error('Invalid hex color');
    }
    return {
      r: parseInt(result[1] + result[1], 16),
      g: parseInt(result[2] + result[2], 16),
      b: parseInt(result[3] + result[3], 16),
    };
  }

  // Handle 6-character hex codes
  if (cleanHex.length === 6) {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    if (!result) {
      throw new Error('Invalid hex color');
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  // Handle 8-character hex codes (RGBA - ignore alpha for RGB conversion)
  if (cleanHex.length === 8) {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    if (!result) {
      throw new Error('Invalid hex color');
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      // Alpha channel (result[4]) is ignored for RGB conversion
    };
  }

  throw new Error('Invalid hex color format. Supported formats: #f00, #ff0000, #ff0000ff');
}
