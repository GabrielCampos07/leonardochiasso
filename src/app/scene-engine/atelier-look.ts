/** Warm Leo atelier palette + lite-mode detection. No three.js imports. */

export const ATELIER_CLEAR = 0x2c2620;
export const ATELIER_FOG = 0x3a322b;
export const ATELIER_BRASS = 0xc4b08a;
export const ATELIER_LIGHT_WOOD = 0xc8b396;
export const ATELIER_WAXED_WOOD = 0x5c4636;
export const ATELIER_DARK_WOOD = 0x2a221c;
export const ATELIER_LINEN = 0xd8cfc4;
export const ATELIER_WALL = 0x6e6258;
export const ATELIER_RUG = 0x4a3a32;
export const ATELIER_EXPOSURE = 0.88;
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
