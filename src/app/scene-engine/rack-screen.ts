export interface ScreenRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface WorldBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** Inclusive hit, with optional pixel pad so gaps at the silhouette still count. */
export function pointInScreenRect(
  x: number,
  y: number,
  rect: ScreenRect,
  pad = 0,
): boolean {
  return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
}

export function screenRectFromPoints(points: ReadonlyArray<{ x: number; y: number }>): ScreenRect | null {
  if (!points.length) return null;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const p of points) {
    if (p.x < left) left = p.x;
    if (p.x > right) right = p.x;
    if (p.y < top) top = p.y;
    if (p.y > bottom) bottom = p.y;
  }
  if (!Number.isFinite(left)) return null;
  return { left, right, top, bottom };
}

export function worldBoxCorners(box: WorldBox): Array<{ x: number; y: number; z: number }> {
  const xs = [box.minX, box.maxX];
  const ys = [box.minY, box.maxY];
  const zs = [box.minZ, box.maxZ];
  const out: Array<{ x: number; y: number; z: number }> = [];
  for (const x of xs) for (const y of ys) for (const z of zs) out.push({ x, y, z });
  return out;
}

/** Few extra pixels around the focused rack silhouette + rug. Open floor must zoom. */
export const FOCUS_WHEEL_PAD_PX = 8;

/** Front face of a world box (camera looks from +Z). Avoids depth-inflated AABBs. */
export function worldBoxFrontCorners(box: WorldBox): Array<{ x: number; y: number; z: number }> {
  const z = box.maxZ;
  return [
    { x: box.minX, y: box.minY, z },
    { x: box.maxX, y: box.minY, z },
    { x: box.minX, y: box.maxY, z },
    { x: box.maxX, y: box.maxY, z },
  ];
}

/**
 * Focus-view wheel boxes. X is the framed window only. The rug is a floor
 * strip at its centre Z so the oval's near edge does not balloon the rect.
 */
export function focusWheelWorldBoxes(
  originX: number,
  look: { offset: number; halfW: number },
  rack: WorldBox,
  rug?: WorldBox | null,
): { rack: WorldBox; rug: WorldBox | null } {
  const minX = originX + look.offset - look.halfW;
  const maxX = originX + look.offset + look.halfW;
  const framed: WorldBox = {
    minX,
    maxX,
    minY: rack.minY,
    maxY: rack.maxY,
    minZ: rack.minZ,
    maxZ: rack.maxZ,
  };
  if (!rug) return { rack: framed, rug: null };
  const rugZ = (rug.minZ + rug.maxZ) / 2;
  return {
    rack: framed,
    rug: {
      minX,
      maxX,
      minY: rug.minY,
      maxY: Math.max(rug.maxY, rug.minY + 0.04),
      minZ: rugZ,
      maxZ: rugZ,
    },
  };
}

export function unionScreenRects(a: ScreenRect | null, b: ScreenRect | null): ScreenRect | null {
  if (!a) return b;
  if (!b) return a;
  return {
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    top: Math.min(a.top, b.top),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

/** Wheel is over a rack when the pointer is inside any projected AABB. */
export function wheelOverRackRects(
  clientX: number,
  clientY: number,
  rects: ReadonlyArray<ScreenRect | null | undefined>,
  pad = 4,
): boolean {
  for (const rect of rects) {
    if (rect && pointInScreenRect(clientX, clientY, rect, pad)) return true;
  }
  return false;
}
