/** sRGB hex → relative luminance (WCAG 2). */
export function hexLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const channel = (start: number) => {
    const v = parseInt(n.slice(start, start + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = hexLuminance(a);
  const l2 = hexLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Toast colors — opaque, WCAG AA for 16px body text (≥ 4.5:1). */
export const TOAST_TEXT = '#1c1814';
export const TOAST_BG = '#fffdf8';
export const TOAST_ERROR_TEXT = '#4a1418';
export const TOAST_ERROR_BG = '#fff5f5';
