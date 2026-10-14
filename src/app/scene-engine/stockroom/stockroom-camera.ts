import { Box3, Vector3 } from 'three';
import type { StockroomBounds } from './stockroom-layout';

const DEG = Math.PI / 180;

/** Polar angle from straight down (OrbitControls φ). Never near 0 or 90° → no flip. */
export const STOCKROOM_POLAR_MIN = 30 * DEG;
export const STOCKROOM_POLAR_MAX = 60 * DEG;
export const STOCKROOM_POLAR_DEFAULT = 44 * DEG;
/** Zoomed views tilt a little toward the box fronts so photos read larger. */
export const STOCKROOM_POLAR_AREA = 52 * DEG;
export const STOCKROOM_POLAR_PIECE = 56 * DEG;
/** Limited swing either side of the front view. */
export const STOCKROOM_AZIMUTH_LIMIT = 30 * DEG;
export const STOCKROOM_AZIMUTH_DEFAULT = 14 * DEG;
/** Orthographic frustum half-height at zoom 1 (world units). */
export const STOCKROOM_FRUSTUM_HALF = 6;
export const STOCKROOM_CAMERA_DISTANCE = 40;
export const STOCKROOM_TWEEN_MS = 650;
/** Side padding as a fraction of the viewport width. */
export const STOCKROOM_SIDE_INSET = 0.04;
export const STOCKROOM_FIT_PAD = 1.08;
/** Lowest zoom = overview × this; highest = one box filling ~60% of the height. */
export const STOCKROOM_MIN_ZOOM_FACTOR = 0.7;
export const STOCKROOM_MAX_ZOOM = 9;

export interface StockroomInsets {
  top: number;
  bottom: number;
  side?: number;
}

export interface StockroomPose {
  polar: number;
  azimuth: number;
  target: Vector3;
  zoom: number;
}

export function clampStockroomSpherical(polar: number, azimuth: number): { polar: number; azimuth: number } {
  return {
    polar: Math.min(STOCKROOM_POLAR_MAX, Math.max(STOCKROOM_POLAR_MIN, polar)),
    azimuth: Math.min(STOCKROOM_AZIMUTH_LIMIT, Math.max(-STOCKROOM_AZIMUTH_LIMIT, azimuth)),
  };
}

/** Unit offset from target to camera, matching OrbitControls' spherical convention. */
export function offsetDirection(polar: number, azimuth: number): Vector3 {
  return new Vector3(
    Math.sin(polar) * Math.sin(azimuth),
    Math.cos(polar),
    Math.sin(polar) * Math.cos(azimuth),
  );
}

/** Screen right / up axes in world space for a camera looking along −offset. */
export function viewBasis(polar: number, azimuth: number): { right: Vector3; up: Vector3; forward: Vector3 } {
  const forward = offsetDirection(polar, azimuth).negate();
  const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  return { right, up, forward };
}

/**
 * Zoom + target that frame `box` inside the viewport band left free by the
 * guide (bottom) and hint chrome (top). Pure: no camera mutation.
 */
export function fitOrthoBox(
  box: Box3,
  polar: number,
  azimuth: number,
  aspect: number,
  insets: StockroomInsets,
  pad = STOCKROOM_FIT_PAD,
): { zoom: number; target: Vector3 } {
  const { right, up } = viewBasis(polar, azimuth);
  const center = box.getCenter(new Vector3());
  let minR = Infinity;
  let maxR = -Infinity;
  let minU = Infinity;
  let maxU = -Infinity;
  const corner = new Vector3();
  for (let i = 0; i < 8; i += 1) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    corner.sub(center);
    const r = corner.dot(right);
    const u = corner.dot(up);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
  }
  const width = Math.max(0.01, maxR - minR) * pad;
  const height = Math.max(0.01, maxU - minU) * pad;
  const side = insets.side ?? STOCKROOM_SIDE_INSET;
  const bandH = Math.max(0.2, 1 - insets.top - insets.bottom);
  const bandW = Math.max(0.2, 1 - side * 2);
  const full = STOCKROOM_FRUSTUM_HALF * 2;
  const zoom = Math.min((full * bandH) / height, (full * aspect * bandW) / width);
  const visibleH = full / zoom;
  const projectedCenter = center
    .clone()
    .addScaledVector(right, (minR + maxR) / 2)
    .addScaledVector(up, (minU + maxU) / 2);
  // The free band's centre sits (bottom − top) of the half-height above screen centre.
  const shift = (insets.bottom - insets.top) * (visibleH / 2);
  const target = projectedCenter.addScaledVector(up, -shift);
  return { zoom, target };
}

export function clampStockroomTarget(target: Vector3, room: StockroomBounds, maxY = 3.6): Vector3 {
  target.x = Math.min(room.maxX, Math.max(room.minX, target.x));
  target.z = Math.min(room.maxZ, Math.max(room.minZ, target.z));
  target.y = Math.min(maxY, Math.max(-1, target.y));
  return target;
}

export function stockroomZoomLimits(overviewZoom: number): { min: number; max: number } {
  const min = Math.max(0.05, overviewZoom * STOCKROOM_MIN_ZOOM_FACTOR);
  return { min, max: Math.max(min * 1.5, STOCKROOM_MAX_ZOOM) };
}

/** Shortest-path free lerp of a pose (all angles stay within the clamp). */
export function lerpPose(from: StockroomPose, to: StockroomPose, t: number): StockroomPose {
  return {
    polar: from.polar + (to.polar - from.polar) * t,
    azimuth: from.azimuth + (to.azimuth - from.azimuth) * t,
    target: from.target.clone().lerp(to.target, t),
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, t),
  };
}
