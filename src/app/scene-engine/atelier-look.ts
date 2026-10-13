/** Warm Leo atelier palette + lite-mode detection. No three.js imports. */

export const ATELIER_CLEAR = 0xcfc6b8;
export const ATELIER_FOG = 0xd6cec2;
export const ATELIER_BRASS = 0xc4b08a;
export const ATELIER_LIGHT_WOOD = 0xd8c4a4;
export const ATELIER_WAXED_WOOD = 0xcbb89a;
export const ATELIER_DARK_WOOD = 0x5a4c40;
export const ATELIER_LINEN = 0xe4dcd2;
export const ATELIER_WALL = 0xe8e2d8;
export const ATELIER_WAINSCOT = 0xd4cbbd;
export const ATELIER_CEILING = 0xe4ddd4;
export const ATELIER_RUG = 0xc6bbb0;
export const ATELIER_EXPOSURE = 1.04;
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
