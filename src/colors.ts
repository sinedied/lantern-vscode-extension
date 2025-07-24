import { getColorCustomizations } from './config';

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

/**
 * Converts RGB to OKLCH color space
 */
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

/**
 * Converts OKLCH to RGB color space
 */
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

/**
 * Generates a random hue while preserving lightness and chroma from a base color
 */
export function generateRandomColorVariant(baseColor: RgbColor): RgbColor {
  const oklch = rgbToOklch(baseColor);

  // Generate random hue (0-360 degrees)
  const randomHue = Math.random() * 360;

  // Create new color with same lightness and chroma but different hue
  const newOklch: OklchColor = {
    l: oklch.l,
    c: oklch.c,
    h: randomHue,
  };

  return oklchToRgb(newOklch);
}

/**
 * Converts RGB color to hex string
 */
export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Converts hex string to RGB color
 */
export function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error('Invalid hex color');
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Gets the current color of the specified VS Code UI element
 */
export function getCurrentThemeColor(element: string): RgbColor {
  // Default colors based on VS Code's default dark theme
  const defaultColors: { [key: string]: RgbColor } = {
    statusBarIndicator: { r: 0, g: 122, b: 204 }, // VS Code blue
    statusBar: { r: 0, g: 122, b: 204 }, // VS Code blue
    titleBar: { r: 51, g: 51, b: 51 }, // Dark gray
    activityBar: { r: 45, g: 45, b: 45 }, // Slightly lighter dark gray
  };

  // Try to get the current theme color from workbench.colorCustomizations
  const colorCustomizations = getColorCustomizations();

  const colorKeys: { [key: string]: string } = {
    statusBarIndicator: 'statusBar.background', // Use same as status bar for base color
    statusBar: 'statusBar.background',
    titleBar: 'titleBar.activeBackground',
    activityBar: 'activityBar.background',
  };

  const colorKey = colorKeys[element];
  if (colorKey && colorCustomizations[colorKey]) {
    try {
      return hexToRgb(colorCustomizations[colorKey]);
    } catch {
      // Fall back to default if parsing fails
    }
  }

  return defaultColors[element] || defaultColors['statusBar'];
}
