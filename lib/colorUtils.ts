/**
 * Converts RGB color values to HSL (Hue, Saturation, Lightness)
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns HSL values as [h, s, l] where h is 0-360, s and l are 0-100
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Converts HSL color values to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns RGB values as [r, g, b] where each is 0-255
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Converts hex color string to RGB values
 * @param hex Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns RGB values as [r, g, b] where each is 0-255
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Converts RGB values to hex color string
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns Hex color string (e.g., "#FF0000")
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Calculates a color between two colors based on a percentage
 * Uses HSL color space for smooth hue transitions (e.g., red to green)
 * 
 * @param startColor Starting color in hex format (e.g., "#FF0000" for red)
 * @param endColor Ending color in hex format (e.g., "#00FF00" for green)
 * @param percentage Progress from 0.0 (start) to 1.0 (end)
 * @returns Interpolated color in hex format
 * 
 * @example
 * interpolateColor("#FF0000", "#00FF00", 0.5) // Returns yellowish color
 * interpolateColor("#FF0000", "#00FF00", 0.0) // Returns "#FF0000" (red)
 * interpolateColor("#FF0000", "#00FF00", 1.0) // Returns "#00FF00" (green)
 */
export function interpolateColor(
  startColor: string,
  endColor: string,
  percentage: number
): string {
  // Clamp percentage between 0 and 1
  const p = Math.max(0, Math.min(1, percentage));

  // Convert hex to RGB
  const [r1, g1, b1] = hexToRgb(startColor);
  const [r2, g2, b2] = hexToRgb(endColor);

  // Convert to HSL for better color transitions
  const [h1, s1, l1] = rgbToHsl(r1, g1, b1);
  const [h2, s2, l2] = rgbToHsl(r2, g2, b2);

  // Interpolate HSL values
  // Handle hue wrap-around (choose shortest path around color wheel)
  let h: number;
  const diff = h2 - h1;
  if (Math.abs(diff) <= 180) {
    h = h1 + diff * p;
  } else if (diff > 180) {
    h = h1 + (diff - 360) * p;
  } else {
    h = h1 + (diff + 360) * p;
  }

  // Normalize hue to 0-360 range
  if (h < 0) h += 360;
  if (h > 360) h -= 360;

  const s = s1 + (s2 - s1) * p;
  const l = l1 + (l2 - l1) * p;

  // Convert back to RGB and then to hex
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/**
 * Gets a color representing progress from red (0%) to green (100%)
 * @param percentage Progress from 0.0 to 1.0
 * @returns Hex color string
 */
export function getProgressColor(percentage: number): string {
  return interpolateColor('#FF0000', '#00FF00', percentage);
}

/**
 * Gets a color for bill payment status (green when income covers bills, red when insufficient)
 * @param income Amount of income/paychecks available
 * @param bills Total bills to pay
 * @returns Hex color string
 */
export function getBillProgressColor(income: number, bills: number): string {
  if (bills <= 0) return '#27ae60'; // Green when no bills
  
  const percentage = income / bills;
  
  // Red when insufficient income, green when income covers bills
  if (percentage >= 1.0) {
    return '#27ae60'; // Green - income covers all bills
  } else if (percentage >= 0.8) {
    // Red to yellow range (80% to 100%)
    const subPercentage = (percentage - 0.8) / 0.2;
    return interpolateColor('#f39c12', '#27ae60', subPercentage);
  } else if (percentage >= 0.5) {
    // Dark red to yellow range (50% to 80%)
    const subPercentage = (percentage - 0.5) / 0.3;
    return interpolateColor('#e74c3c', '#f39c12', subPercentage);
  } else {
    // Pure red (0% to 50%) - very low income
    return '#e74c3c';
  }
}
