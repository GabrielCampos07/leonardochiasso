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
