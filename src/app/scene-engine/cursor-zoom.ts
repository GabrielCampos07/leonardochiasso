import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';

/** Orbit distance (m) at which a hanger under the cursor may swap in the pdp photo. */
export const PIECE_ZOOM_UPGRADE_DISTANCE = 2.15;
export const PIECE_ZOOM_UPGRADE_CLEAR = PIECE_ZOOM_UPGRADE_DISTANCE + 0.35;

const plane = new Plane();
const raycaster = new Raycaster();
const ndc = new Vector2();
const look = new Vector3();
const after = new Vector3();
const delta = new Vector3();

export function ndcFromClient(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  return {
    x: ((clientX - rect.left) / w) * 2 - 1,
    y: -((clientY - rect.top) / h) * 2 + 1,
  };
}

/** World point on the look-at plane under the cursor (pre- or post-dolly). */
export function cursorOnTargetPlane(
  camera: PerspectiveCamera,
  target: Vector3,
  cursorNdc: { x: number; y: number },
  out = new Vector3(),
): Vector3 | null {
  camera.getWorldDirection(look);
  plane.setFromNormalAndCoplanarPoint(look, target);
  ndc.set(cursorNdc.x, cursorNdc.y);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, out);
}

/**
 * After OrbitControls dollies toward its target, slide the camera and target
 * so the same world point stays under the cursor (ctrl+wheel / pinch).
 */
export function keepCursorWorldPoint(
  camera: PerspectiveCamera,
  target: Vector3,
  cursorNdc: { x: number; y: number },
  worldBefore: Vector3,
): boolean {
  if (!cursorOnTargetPlane(camera, target, cursorNdc, after)) return false;
  delta.copy(worldBefore).sub(after);
  if (delta.lengthSq() < 1e-12) return false;
  camera.position.add(delta);
  target.add(delta);
  return true;
}

export function shouldUpgradePieceFromZoom(distance: number, slug: string | null): boolean {
  return Boolean(slug) && distance <= PIECE_ZOOM_UPGRADE_DISTANCE;
}

export function shouldClearPieceZoomUpgrade(distance: number, hasFocus: boolean): boolean {
  return hasFocus && distance > PIECE_ZOOM_UPGRADE_CLEAR;
}
