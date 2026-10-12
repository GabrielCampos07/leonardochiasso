export type CameraFocusMode = 'rack' | 'vitrine' | 'overview';

export interface FitBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface CameraPose {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  distance: number;
}

export interface RackNavItem {
  id: string;
  name: string;
  index: number;
}

export const OVERVIEW_FOCUS_ID = 'all';
export const CAMERA_TWEEN_MS = 720;
/** Keep the lens above the wood floor (`collection-rack` FLOOR_Y = -0.7). */
export const CAMERA_MIN_Y = -0.45;
export const FIT_PAD_TOP = 0.12;
export const FIT_PAD_BOTTOM = 0.18;
export const FIT_PAD_SIDE = 0.08;

/** ±25° around the front of the active unit. */
export const CAMERA_AZIMUTH_LIMIT = (25 * Math.PI) / 180;
/** 35° above horizontal. */
export const CAMERA_POLAR_MIN = Math.PI / 2 - (35 * Math.PI) / 180;
/** 10° above horizontal. */
export const CAMERA_POLAR_MAX = Math.PI / 2 - (10 * Math.PI) / 180;
export const VITRINE_ELEVATION = (34 * Math.PI) / 180;

export function isCompactAtelierViewport(
  width = typeof window === 'undefined' ? 1280 : window.innerWidth,
): boolean {
  return width <= 768;
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function stepRackIndex(current: number, delta: -1 | 1, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, current + delta));
}

export function rackNavItems(racks: ReadonlyArray<{ id: string; name: string }>): RackNavItem[] {
  return racks.map((rack, index) => ({ id: rack.id, name: rack.name, index }));
}

export function poseFromElevation(
  cx: number,
  cy: number,
  cz: number,
  distance: number,
  elevation: number,
): CameraPose {
  const eyeY = Math.max(CAMERA_MIN_Y, cy + Math.sin(elevation) * distance);
  const z = cz + Math.cos(elevation) * distance;
  return {
    position: { x: cx, y: eyeY, z },
    target: { x: cx, y: cy, z: cz },
    distance,
  };
}

/**
 * Fit the full rack (or atelier) bounding box, leaving room for the header and
 * the bottom guide. Compact viewports frame one unit tighter and higher.
 */
export function computeEyeLevelFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  mode: CameraFocusMode,
  compact = false,
): CameraPose {
  const width = Math.max(box.maxX - box.minX, 0.4);
  const height = Math.max(box.maxY - box.minY, 0.4);
  const depth = Math.max(box.maxZ - box.minZ, 0.2);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const cz = (box.minZ + box.maxZ) / 2;

  const padTop = compact ? 0.1 : FIT_PAD_TOP;
  const padBottom = compact ? 0.22 : FIT_PAD_BOTTOM;
  const visibleH = Math.max(0.35, 1 - padTop - padBottom);
  const visibleW = Math.max(0.4, 1 - FIT_PAD_SIDE * 2);
  const fov = (fovDeg * Math.PI) / 180;
  const fill = mode === 'overview' ? (compact ? 1.08 : 1.12) : compact ? 1.04 : 1.1;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = width / (2 * Math.tan(fov / 2) * Math.max(aspect, 0.2) * visibleW);
  let distance = Math.max(fitH, fitW, 2.05) * fill + depth * 0.35;
  if (mode === 'overview') distance = Math.min(Math.max(distance, compact ? 3.6 : 4.4), compact ? 10 : 16);
  else distance = Math.min(Math.max(distance, compact ? 2.0 : 2.2), 12);

  const targetY = compact ? box.minY + height * 0.58 : cy;
  const elevation = mode === 'vitrine' ? VITRINE_ELEVATION : compact ? 0.22 : 0.16;
  return poseFromElevation(cx, targetY, cz, distance, elevation);
}

/** Closer, ~30–40° above, looking at the vitrine top and shelves. */
export function computeVitrineFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  compact = false,
): CameraPose {
  return computeEyeLevelFit(box, aspect, fovDeg, 'vitrine', compact);
}

export function photoPlaneSize(
  imageWidth: number,
  imageHeight: number,
  maxW = 0.48,
  maxH = 0.64,
): { width: number; height: number } {
  const aspect = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 3 / 4;
  let height = maxH;
  let width = height * aspect;
  if (width > maxW) {
    width = maxW;
    height = width / aspect;
  }
  return { width, height };
}
