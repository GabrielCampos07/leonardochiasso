export type CameraFocusMode = 'rack' | 'overview';

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
/** Header hint / chrome as a fraction of the viewport height. */
export const FIT_PAD_TOP = 0.12;
/** Guide bar as a fraction of the viewport height. */
export const FIT_PAD_BOTTOM = 0.18;
export const FIT_PAD_SIDE = 0.08;

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

export function formatStockLabel(qty: number): string {
  if (qty <= 0) return 'Sem estoque';
  if (qty === 1) return '1 unidade';
  return `${qty} unidades`;
}

/**
 * Fit the full rack (or atelier) bounding box, leaving room for the header and
 * the bottom guide. Distance is no longer capped at 4.6 — 2–3 row racks must fit.
 */
export function computeEyeLevelFit(
  box: FitBox,
  aspect: number,
  fovDeg: number,
  mode: CameraFocusMode,
): CameraPose {
  const width = Math.max(box.maxX - box.minX, 0.4);
  const height = Math.max(box.maxY - box.minY, 0.4);
  const depth = Math.max(box.maxZ - box.minZ, 0.2);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const cz = (box.minZ + box.maxZ) / 2;

  const visibleH = Math.max(0.35, 1 - FIT_PAD_TOP - FIT_PAD_BOTTOM);
  const visibleW = Math.max(0.4, 1 - FIT_PAD_SIDE * 2);
  const fov = (fovDeg * Math.PI) / 180;
  const fill = mode === 'rack' ? 1.12 : 1.28;
  const fitH = height / (2 * Math.tan(fov / 2) * visibleH);
  const fitW = width / (2 * Math.tan(fov / 2) * Math.max(aspect, 0.2) * visibleW);
  let distance = Math.max(fitH, fitW, 2.05) * fill + depth * 0.4;
  if (mode === 'rack') distance = Math.min(Math.max(distance, 2.2), 12);
  else distance = Math.min(Math.max(distance, 5.2), 28);

  const targetY = cy;
  const eyeY = Math.max(CAMERA_MIN_Y, targetY + (mode === 'rack' ? 0.06 : height * 0.03));
  return {
    position: { x: cx, y: eyeY, z: cz + distance },
    target: { x: cx, y: targetY, z: cz },
    distance,
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
