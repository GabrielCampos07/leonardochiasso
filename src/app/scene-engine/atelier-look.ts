/** Warm Leo atelier palette + lite-mode detection. No three.js imports. */

export const ATELIER_CLEAR = 0x6a5e52;
export const ATELIER_FOG = 0x7d7164;
export const ATELIER_BRASS = 0xc4b08a;
export const ATELIER_LIGHT_WOOD = 0xc8b396;
export const ATELIER_WAXED_WOOD = 0x8a6e54;
export const ATELIER_DARK_WOOD = 0x3a3028;
export const ATELIER_LINEN = 0xd8cfc4;
export const ATELIER_WALL = 0xb4a494;
export const ATELIER_CEILING = 0x8a8074;
export const ATELIER_RUG = 0x6e5648;
export const ATELIER_EXPOSURE = 1.12;
export const LITE_VIEWPORT_MAX = 768;
export const LITE_MEMORY_MAX = 4;
export const LITE_CORES_MAX = 4;

export interface AtelierLiteFlags {
  reducedMotion?: boolean;
  width?: number;
  coarsePointer?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

export function detectAtelierLiteMode(flags: AtelierLiteFlags = {}): boolean {
  if (flags.reducedMotion) return true;
  const width =
    flags.width ?? (typeof window === 'undefined' ? 1280 : window.innerWidth || 1280);
  if (width <= LITE_VIEWPORT_MAX) return true;
  const coarse =
    flags.coarsePointer ??
    (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  if (coarse && width <= 1024) return true;
  const cores =
    flags.hardwareConcurrency ??
    (typeof navigator === 'undefined' ? 8 : navigator.hardwareConcurrency || 8);
  const memory =
    flags.deviceMemory ??
    (typeof navigator === 'undefined'
      ? 8
      : Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) || 8);
  return cores <= LITE_CORES_MAX || memory <= LITE_MEMORY_MAX;
}
