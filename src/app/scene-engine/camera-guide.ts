import { UNCOLLECTED_RACK_ID } from './types';

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
/** Create / cancel / rise tweens stay inside the 400–700 ms band. */
export const CREATE_TWEEN_MS = 560;
/** Keep the lens above the wood floor (`collection-rack` FLOOR_Y = -0.7). */
export const CAMERA_MIN_Y = -0.45;
export const FIT_PAD_TOP = 0.08;
export const FIT_PAD_BOTTOM = 0.16;
export const FIT_PAD_SIDE = 0.075;
/** Side inset so hangers fill ~85% of the viewport width. */
export const FIT_WIDTH_MARGIN = 0.075;
export const FIT_HANGER_FILL = 1 - FIT_WIDTH_MARGIN * 2;

/** ±25° around the front of the active unit. */
export const CAMERA_AZIMUTH_LIMIT = (25 * Math.PI) / 180;
/** 35° above horizontal. */
export const CAMERA_POLAR_MIN = Math.PI / 2 - (35 * Math.PI) / 180;
/** 10° above horizontal. */
export const CAMERA_POLAR_MAX = Math.PI / 2 - (10 * Math.PI) / 180;
/** ~22° above horizontal — closer and lower than the old 34° look-down. */
export const VITRINE_ELEVATION = (22 * Math.PI) / 180;

export function isCompactAtelierViewport(
  width = typeof window === 'undefined' ? 1280 : window.innerWidth,
): boolean {
  return width <= 768;
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Light spring for the new rack / vitrine rising from the floor. */
export function easeOutBack(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function stepRackIndex(current: number, delta: -1 | 1, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, current + delta));
}

/** Collections in sortOrder, then "Sem coleção" last — same before and after reload. */
export function rackNavItems(
  racks: ReadonlyArray<{ id: string; name: string; sortOrder?: number }>,
): RackNavItem[] {
  const uncollected = racks.filter((rack) => rack.id === UNCOLLECTED_RACK_ID);
  const collected = racks
    .filter((rack) => rack.id !== UNCOLLECTED_RACK_ID)
    .slice()
    .sort((a, b) => {
      const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (order !== 0) return order;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  return [...collected, ...uncollected].map((rack, index) => ({
    id: rack.id,
    name: rack.name,
    index,
  }));
}

/** Distance that fits `width` in the horizontal FOV, with a side margin on each edge. */
export function distanceToFitWidth(
  width: number,
  aspect: number,
  fovDeg: number,
  margin = FIT_WIDTH_MARGIN,
): number {
  const fov = (fovDeg * Math.PI) / 180;
  const visibleW = Math.max(0.4, 1 - margin * 2);
  return Math.max(0.4, width) / (2 * Math.tan(fov / 2) * Math.max(aspect, 0.2) * visibleW);
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
 * Fit the active rack so hangers fill ~85% of the viewport width. Height only
 * pushes the camera back far enough to keep the collection sign on screen.
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

  const padTop = compact ? 0.05 : FIT_PAD_TOP;
  const padBottom = compact ? 0.16 : FIT_PAD_BOTTOM;
  const visibleH = Math.max(0.42, 1 - padTop - padBottom);
  const fov = (fovDeg * Math.PI) / 180;
  const fill = mode === 'overview' ? (compact ? 0.98 : 1.08) : 1;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = distanceToFitWidth(width, aspect, fovDeg, FIT_WIDTH_MARGIN);
  const fitted = Math.max(fitH, fitW);
  let distance = fitted * fill + depth * (compact ? 0.08 : 0.1);
  if (mode === 'overview') distance = Math.min(Math.max(distance, compact ? 2.6 : 3.8), compact ? 9 : 16);
  else distance = Math.min(Math.max(distance, compact ? 1.15 : 1.35), 10);

  const targetY = compact ? box.minY + height * 0.48 : cy;
  const elevation = compact ? 0.11 : 0.13;
  return poseFromElevation(cx, targetY, cz, distance, elevation);
}

/** Closer and a bit lower so tray photos fill the frame without the top shelf covering them. */
export function computeVitrineFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  compact = false,
): CameraPose {
  const width = Math.max(box.maxX - box.minX, 0.4);
  const height = Math.max(box.maxY - box.minY, 0.4);
  const depth = Math.max(box.maxZ - box.minZ, 0.2);
  const cx = (box.minX + box.maxX) / 2;
  const cy = box.minY + height * (compact ? 0.4 : 0.38);
  const cz = (box.minZ + box.maxZ) / 2;
  const fov = (fovDeg * Math.PI) / 180;
  const visibleH = compact ? 0.82 : 0.74;
  const fill = 1;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = distanceToFitWidth(width, aspect, fovDeg, FIT_WIDTH_MARGIN);
  const fitted = Math.max(fitH, fitW);
  let distance = Math.max(fitted, compact ? 1.2 : 1.45) * fill + depth * 0.18;
  distance = Math.min(Math.max(distance, compact ? 1.2 : 1.45), compact ? 10 : 6);
  return poseFromElevation(cx, cy, cz, distance, VITRINE_ELEVATION);
}

/** Hard lock: azimuth ±25°, elevation 10–35° above horizontal. No roll. */
export function clampOrbitSpherical(theta: number, phi: number): { theta: number; phi: number } {
  return {
    theta: Math.min(CAMERA_AZIMUTH_LIMIT, Math.max(-CAMERA_AZIMUTH_LIMIT, theta)),
    phi: Math.min(CAMERA_POLAR_MAX, Math.max(CAMERA_POLAR_MIN, phi)),
  };
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
