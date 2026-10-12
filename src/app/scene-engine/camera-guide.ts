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

/** Eye-level fit: hangers fill the frame. Overview is pulled back, still not a ceiling shot. */
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

  const targetY = mode === 'rack' ? box.minY + height * 0.42 : cy;
  const fov = (fovDeg * Math.PI) / 180;
  const fill = mode === 'rack' ? 1.06 : 1.22;
  const fitH = height / (2 * Math.tan(fov / 2));
  const fitW = width / (2 * Math.tan(fov / 2) * Math.max(aspect, 0.2));
  let distance = Math.max(fitH, fitW, 1.8) * fill + depth * 0.35;
  if (mode === 'rack') distance = Math.min(Math.max(distance, 2.05), 4.6);
  else distance = Math.min(Math.max(distance, 4.2), 14);

  const eyeY = mode === 'rack' ? targetY + 0.16 : cy + height * 0.08;
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
