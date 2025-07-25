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
 * Calculates perceptual distance between two colors in OKLCH space
 */
export function calculateColorDistance(color1: OklchColor, color2: OklchColor): number {
  // Weight factors for perceptual importance
  const lightnessWeight = 2;
  const chromaWeight = 1;
  const hueWeight = 1;

  // Calculate differences
  const lightnessDiff = Math.abs(color1.l - color2.l) * lightnessWeight;
  const chromaDiff = Math.abs(color1.c - color2.c) * chromaWeight;
  
  // Handle hue difference (circular, 0-360)
  let hueDiff = Math.abs(color1.h - color2.h);
  if (hueDiff > 180) {
    hueDiff = 360 - hueDiff;
  }
  hueDiff = (hueDiff / 180) * hueWeight; // Normalize to 0-1 range

  // Euclidean distance in perceptual space
  return Math.sqrt(lightnessDiff * lightnessDiff + chromaDiff * chromaDiff + hueDiff * hueDiff);
}

/**
 * Generates a random color variant with improved variety and contrast
 * Ensures good status bar contrast and avoids colors too similar to existing ones
 */
export function generateRandomColorVariant(baseColor: RgbColor, existingColor?: RgbColor, maxAttempts: number = 50): RgbColor {
  const baseOklch = rgbToOklch(baseColor);
  const existingOklch = existingColor ? rgbToOklch(existingColor) : null;
  
  let bestColor: RgbColor = baseColor;
  let bestDistance = 0;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a varied color with good status bar characteristics
    const newOklch = generateStatusBarColor();
    const newColor = oklchToRgb(newOklch);
    
    // Calculate distance from existing color if provided
    let distance = existingOklch ? calculateColorDistance(newOklch, existingOklch) : 1;
    
    // Prefer colors with good distance from existing color
    if (distance > bestDistance) {
      bestDistance = distance;
      bestColor = newColor;
    }
    
    // If we found a color with good distance, use it
    // Lowered threshold for easier satisfaction
    if (distance > 0.5) {
      break;
    }
  }
  
  // If no existing color to avoid, just return a random color
  if (!existingOklch) {
    return oklchToRgb(generateStatusBarColor());
  }
  
  return bestColor;
}

/**
 * Generates a color optimized for status bar visibility and variety
 */
function generateStatusBarColor(): OklchColor {
  // Define good lightness ranges for status bar (avoid too light or too dark)
  const minLightness = 0.3; // Not too dark
  const maxLightness = 0.8; // Not too light
  
  // Define good chroma ranges for vibrant but not overwhelming colors
  const minChroma = 0.12; // More saturation for better distinction
  const maxChroma = 0.35; // Higher max for more vibrant colors
  
  // Generate varied parameters with better distribution
  const lightness = minLightness + Math.random() * (maxLightness - minLightness);
  const chroma = minChroma + Math.random() * (maxChroma - minChroma);
  
  // Use completely random hue for maximum variety
  const hue = Math.random() * 360;
  
  return { l: lightness, c: chroma, h: hue };
}

/**
 * Legacy function name for compatibility - generates a random hue while preserving lightness and chroma
 */
export function generateRandomHueVariant(baseColor: RgbColor): RgbColor {
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
 * Supports both 3-character (#f00) and 6-character (#ff0000) hex codes
 */
export function hexToRgb(hex: string): RgbColor {
  // Remove # if present
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

/**
 * Converts any valid CSS color string to RGB using browser's built-in parsing
 * Supports all CSS color formats including modern color spaces like oklch(), lab(), etc.
 */
export function parseCssColor(cssColor: string): RgbColor | null {
  // For VS Code extension context, we can't use DOM, so we'll accept the color as-is
  // and let VS Code handle the validation when applying it to the UI
  const color = cssColor.trim();

  if (!color) {
    return null;
  }

  // For hex colors, we can still parse them to RGB for Hue integration
  if (color.startsWith('#')) {
    try {
      return hexToRgb(color);
    } catch {
      // If hex parsing fails, return a default color for Hue but still allow the CSS color
      return { r: 128, g: 128, b: 128 };
    }
  }

  // For all other CSS colors (rgb, hsl, oklch, lab, named colors, etc.)
  // we'll return a neutral color for Hue integration since we can't easily parse them
  // The actual color will still be applied correctly to VS Code's UI
  return { r: 128, g: 128, b: 128 };
}
