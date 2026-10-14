/**
 * Pure floor-plan math for the option A stockroom (`?cc0=1`). No three.js.
 * One area per collection: a rug, N open bookcase bays at the back, one box per
 * piece on the shelves, and the collection name on a header sign + the floor.
 */

/** Cardboard box (Kenney `cardboardBoxClosed`) world size. */
export const BOX_W = 0.62;
export const BOX_H = 0.74;
export const BOX_D = 0.5;

/** Open bookcase bay (Kenney `bookcaseOpen` scaled). */
export const BAY_W = 1.48;
export const BAY_H = 3.2;
export const BAY_D = 0.62;
/** Shelf board tops (model 0.13 / 0.37 / 0.61 of 0.88 tall), top level first — box bottoms sit here. */
export const BAY_LEVEL_Y: readonly number[] = [2.218, 1.345, 0.473];
export const BOXES_PER_LEVEL = 2;
export const SLOTS_PER_BAY = BAY_LEVEL_Y.length * BOXES_PER_LEVEL;
/** Gap between the two boxes on one level, measured from the bay centre. */
export const BOX_COLUMN_OFFSET = BOX_W / 2 + 0.03;

export const AREA_PAD_X = 0.42;
export const AREA_DEPTH = 2.3;
/** Bay back face sits this far in from the area's back edge. */
export const AREA_BACK_INSET = 0.22;
export const AREA_GAP_X = 0.9;
/** Wide aisles so a front row's bays never hide the boxes of the row behind. */
export const AISLE_Z = 2.9;
export const ROW_PITCH = AREA_DEPTH + AISLE_Z;
export const ROOM_MARGIN = 1.6;
export const TARGET_ASPECT = 1.6;

export interface StockroomUnitInput {
  id: string;
  name: string;
  hangers: ReadonlyArray<{ slug: string }>;
}

export interface StockroomSlot {
  slug: string;
  index: number;
  bay: number;
  level: number;
  column: number;
  /** World centre of the box. */
  x: number;
  y: number;
  z: number;
}

export interface StockroomArea {
  id: string;
  name: string;
  index: number;
  row: number;
  /** World centre of the area footprint (floor). */
  x: number;
  z: number;
  width: number;
  depth: number;
  /** World x of each bay centre. */
  bayX: number[];
  /** World z of the bay front face. */
  bayFrontZ: number;
  slots: StockroomSlot[];
}

export interface StockroomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface StockroomPlan {
  areas: StockroomArea[];
  /** Union of area footprints. */
  bounds: StockroomBounds;
  /** Floor / wall extent: bounds plus `ROOM_MARGIN`. */
  room: StockroomBounds;
}

export function bayCount(pieces: number): number {
  return Math.max(1, Math.ceil(Math.max(0, pieces) / SLOTS_PER_BAY));
}

export function areaWidth(pieces: number): number {
  return bayCount(pieces) * BAY_W + AREA_PAD_X * 2;
}

/** Fill order: bay by bay, top level first, left to right. */
export function slotCell(index: number): { bay: number; level: number; column: number } {
  const bay = Math.floor(index / SLOTS_PER_BAY);
  const within = index % SLOTS_PER_BAY;
  return {
    bay,
    level: Math.floor(within / BOXES_PER_LEVEL),
    column: within % BOXES_PER_LEVEL,
  };
}

/**
 * Left-to-right wrap that keeps reading order. Every contiguous run width is a
 * candidate row limit; the plan whose footprint is closest to `aspect`
 * (width / depth) wins, ties going to fewer rows. Returns indices per row.
 */
export function packRows(
  widths: readonly number[],
  gap = AREA_GAP_X,
  pitch = ROW_PITCH,
  aspect = TARGET_ASPECT,
): number[][] {
  if (!widths.length) return [];
  const limits = new Set<number>();
  for (let i = 0; i < widths.length; i += 1) {
    let span = 0;
    for (let j = i; j < widths.length; j += 1) {
      span += widths[j] + (j > i ? gap : 0);
      limits.add(Math.round(span * 1000) / 1000);
    }
  }
  const widest = Math.max(...widths);
  let best: number[][] = [];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of [...limits].sort((a, b) => b - a)) {
    const limit = Math.max(widest, candidate);
    const rows = wrapRows(widths, gap, limit);
    const maxWidth = Math.max(...rows.map((r) => rowSpan(r, widths, gap)));
    const depth = rows.length * pitch;
    const score = Math.abs(Math.log(maxWidth / depth) - Math.log(aspect));
    if (score < bestScore - 1e-9) {
      bestScore = score;
      best = rows;
    }
  }
  return best;
}

function wrapRows(widths: readonly number[], gap: number, limit: number): number[][] {
  const rows: number[][] = [];
  let row: number[] = [];
  let rowWidth = 0;
  widths.forEach((width, i) => {
    const next = row.length ? rowWidth + gap + width : width;
    if (row.length && next > limit + 1e-3) {
      rows.push(row);
      row = [i];
      rowWidth = width;
    } else {
      row.push(i);
      rowWidth = next;
    }
  });
  if (row.length) rows.push(row);
  return rows;
}

function rowSpan(row: readonly number[], widths: readonly number[], gap: number): number {
  return row.reduce((sum, i) => sum + widths[i], 0) + gap * Math.max(0, row.length - 1);
}

/** Row 0 is the back (top of screen); collections read left to right, back to front. */
export function planStockroom(
  units: readonly StockroomUnitInput[],
  aspect = TARGET_ASPECT,
): StockroomPlan {
  const widths = units.map((u) => areaWidth(u.hangers.length));
  const rows = packRows(widths, AREA_GAP_X, ROW_PITCH, aspect);
  const spans = rows.map((row) => rowSpan(row, widths, AREA_GAP_X));
  const maxSpan = spans.length ? Math.max(...spans) : 0;
  const depth = rows.length * ROW_PITCH - AISLE_Z;
  const areas: StockroomArea[] = [];
  rows.forEach((row, r) => {
    let cursor = -maxSpan / 2;
    const z = -depth / 2 + AREA_DEPTH / 2 + r * ROW_PITCH;
    for (const i of row) {
      const unit = units[i];
      const width = widths[i];
      areas.push(buildArea(unit, i, r, cursor + width / 2, z, width));
      cursor += width + AREA_GAP_X;
    }
  });
  areas.sort((a, b) => a.index - b.index);
  const bounds = areas.length
    ? {
        minX: Math.min(...areas.map((a) => a.x - a.width / 2)),
        maxX: Math.max(...areas.map((a) => a.x + a.width / 2)),
        minZ: Math.min(...areas.map((a) => a.z - a.depth / 2)),
        maxZ: Math.max(...areas.map((a) => a.z + a.depth / 2)),
      }
    : { minX: -2, maxX: 2, minZ: -1.5, maxZ: 1.5 };
  return {
    areas,
    bounds,
    room: {
      minX: bounds.minX - ROOM_MARGIN,
      maxX: bounds.maxX + ROOM_MARGIN,
      minZ: bounds.minZ - ROOM_MARGIN,
      maxZ: bounds.maxZ + ROOM_MARGIN,
    },
  };
}

function buildArea(
  unit: StockroomUnitInput,
  index: number,
  row: number,
  x: number,
  z: number,
  width: number,
): StockroomArea {
  const bays = bayCount(unit.hangers.length);
  const firstBayX = x - (bays * BAY_W) / 2 + BAY_W / 2;
  const bayX = Array.from({ length: bays }, (_, b) => firstBayX + b * BAY_W);
  const bayBackZ = z - AREA_DEPTH / 2 + AREA_BACK_INSET;
  const bayFrontZ = bayBackZ + BAY_D;
  const slots = unit.hangers.map((hanger, i): StockroomSlot => {
    const cell = slotCell(i);
    const dx = cell.column === 0 ? -BOX_COLUMN_OFFSET : BOX_COLUMN_OFFSET;
    return {
      slug: hanger.slug,
      index: i,
      ...cell,
      x: bayX[cell.bay] + dx,
      y: BAY_LEVEL_Y[cell.level] + BOX_H / 2,
      z: bayFrontZ - BOX_D / 2,
    };
  });
  return { id: unit.id, name: unit.name, index, row, x, z, width, depth: AREA_DEPTH, bayX, bayFrontZ, slots };
}

/** Bays + sign of an area (the rug in front is left out) for camera fitting. */
export function areaFocusBox(area: StockroomArea): {
  min: [number, number, number];
  max: [number, number, number];
} {
  const bayHalf = (area.bayX.length * BAY_W) / 2;
  const halfW = Math.max(bayHalf + 0.2, Math.min(area.width / 2, 1.6));
  return {
    min: [area.x - halfW, 0, area.bayFrontZ - BAY_D],
    max: [area.x + halfW, SIGN_TOP_Y, area.bayFrontZ + 0.35],
  };
}

export function slotFocusBox(slot: StockroomSlot): {
  min: [number, number, number];
  max: [number, number, number];
} {
  // Keep the neighbouring boxes in frame so the piece reads in context.
  const padX = BOX_W * 2.6;
  const padY = BOX_H * 1.6;
  return {
    min: [slot.x - padX, Math.max(0, slot.y - padY), slot.z - BOX_D / 2],
    max: [slot.x + padX, slot.y + padY, slot.z + BOX_D / 2],
  };
}

/** Header sign above the bays. */
export const SIGN_H = 0.62;
export const SIGN_Y = BAY_H + 0.08 + SIGN_H / 2;
export const SIGN_TOP_Y = SIGN_Y + SIGN_H / 2;
/** Tilt the sign back so its face points up toward the iso camera. */
export const SIGN_TILT = -(32 * Math.PI) / 180;
