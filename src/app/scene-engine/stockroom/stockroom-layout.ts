/**
 * Pure floor-plan math for the stockroom scenes (`?cc0=1`, `?sketchfab=1`). No three.js.
 * One area per collection: a rug, N bays at the back (bookcases in option A, wall
 * rails in option B), one slot per piece, and the collection name on a header sign.
 * Bay geometry comes from a `StockroomBaySpec`; option A's is the default.
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

/** Shape of one bay and of the pieces it holds. */
export interface StockroomBaySpec {
  width: number;
  height: number;
  /** Back face → front face of the bay. */
  depth: number;
  /** Piece centre heights, top level first. */
  levelY: readonly number[];
  perLevel: number;
  /** Centre-to-centre distance of neighbouring pieces on one level. */
  columnPitch: number;
  piece: { w: number; h: number; d: number };
  /** Piece centre measured back from the bay front face. */
  pieceInset: number;
  /** Area zoom crops the floor below this height (default 0: bays from the floor up). */
  focusMinY?: number;
}

/** Option A: open bookcase, two cardboard boxes per shelf. */
export const CC0_BAY: StockroomBaySpec = {
  width: BAY_W,
  height: BAY_H,
  depth: BAY_D,
  levelY: BAY_LEVEL_Y.map((y) => y + BOX_H / 2),
  perLevel: BOXES_PER_LEVEL,
  columnPitch: BOX_COLUMN_OFFSET * 2,
  piece: { w: BOX_W, h: BOX_H, d: BOX_D },
  pieceInset: BOX_D / 2,
};

export function slotsPerBay(spec: StockroomBaySpec): number {
  return spec.levelY.length * spec.perLevel;
}

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
  bay: StockroomBaySpec;
  areas: StockroomArea[];
  /** Union of area footprints. */
  bounds: StockroomBounds;
  /** Floor / wall extent: bounds plus `ROOM_MARGIN`. */
  room: StockroomBounds;
}

export function bayCount(pieces: number, spec: StockroomBaySpec = CC0_BAY): number {
  return Math.max(1, Math.ceil(Math.max(0, pieces) / slotsPerBay(spec)));
}

export function areaWidth(pieces: number, spec: StockroomBaySpec = CC0_BAY): number {
  return bayCount(pieces, spec) * spec.width + AREA_PAD_X * 2;
}

/** Fill order: bay by bay, top level first, left to right. */
export function slotCell(
  index: number,
  spec: StockroomBaySpec = CC0_BAY,
): { bay: number; level: number; column: number } {
  const perBay = slotsPerBay(spec);
  const bay = Math.floor(index / perBay);
  const within = index % perBay;
  return {
    bay,
    level: Math.floor(within / spec.perLevel),
    column: within % spec.perLevel,
  };
}

/** Piece centre x relative to the bay centre. */
export function columnOffset(column: number, spec: StockroomBaySpec = CC0_BAY): number {
  return (column - (spec.perLevel - 1) / 2) * spec.columnPitch;
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
  spec: StockroomBaySpec = CC0_BAY,
): StockroomPlan {
  const widths = units.map((u) => areaWidth(u.hangers.length, spec));
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
      areas.push(buildArea(unit, i, r, cursor + width / 2, z, width, spec));
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
    bay: spec,
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
  spec: StockroomBaySpec,
): StockroomArea {
  const bays = bayCount(unit.hangers.length, spec);
  const firstBayX = x - (bays * spec.width) / 2 + spec.width / 2;
  const bayX = Array.from({ length: bays }, (_, b) => firstBayX + b * spec.width);
  const bayBackZ = z - AREA_DEPTH / 2 + AREA_BACK_INSET;
  const bayFrontZ = bayBackZ + spec.depth;
  const slots = unit.hangers.map((hanger, i): StockroomSlot => {
    const cell = slotCell(i, spec);
    return {
      slug: hanger.slug,
      index: i,
      ...cell,
      x: bayX[cell.bay] + columnOffset(cell.column, spec),
      y: spec.levelY[cell.level],
      z: bayFrontZ - spec.pieceInset,
    };
  });
  return { id: unit.id, name: unit.name, index, row, x, z, width, depth: AREA_DEPTH, bayX, bayFrontZ, slots };
}

/** Bays + sign of an area (the rug in front is left out) for camera fitting. */
export function areaFocusBox(
  area: StockroomArea,
  spec: StockroomBaySpec = CC0_BAY,
): {
  min: [number, number, number];
  max: [number, number, number];
} {
  const bayHalf = (area.bayX.length * spec.width) / 2;
  const halfW = Math.max(bayHalf + 0.2, Math.min(area.width / 2, 1.6));
  return {
    min: [area.x - halfW, spec.focusMinY ?? 0, area.bayFrontZ - spec.depth],
    max: [area.x + halfW, signTopY(spec), area.bayFrontZ + 0.35],
  };
}

/** Consecutive bays `[start, start + count)` of an area, clamped to the bays it has. */
export function clampBayWindow(area: StockroomArea, start: number, count: number): { start: number; count: number } {
  const total = Math.max(1, area.bayX.length);
  const n = Math.min(total, Math.max(1, Math.floor(count)));
  return { start: Math.min(total - n, Math.max(0, Math.floor(start))), count: n };
}

/**
 * Camera box for a window of bays: just the piece fronts, lowest to highest level
 * (frame tops and the floor are cropped). The collection name is an HTML label
 * above it, so no sign height.
 */
export function bayWindowBox(
  area: StockroomArea,
  start: number,
  count: number,
  spec: StockroomBaySpec = CC0_BAY,
): {
  min: [number, number, number];
  max: [number, number, number];
} {
  const w = clampBayWindow(area, start, count);
  const first = area.bayX[w.start] ?? area.x;
  const last = area.bayX[w.start + w.count - 1] ?? area.x;
  const front = area.bayFrontZ - spec.pieceInset + spec.piece.d / 2;
  const half = spec.piece.h / 2 + BAY_WINDOW_PAD_Y;
  return {
    min: [first - spec.width / 2 - 0.08, Math.min(...spec.levelY) - half, front - 0.05],
    max: [last + spec.width / 2 + 0.08, Math.max(...spec.levelY) + half, front + 0.05],
  };
}

export const BAY_WINDOW_PAD_Y = 0.06;

/** Slugs of the pieces stored in bays `[start, start + count)`. */
export function slotsInWindow(area: StockroomArea, start: number, count: number): StockroomSlot[] {
  return area.slots.filter((s) => s.bay >= start && s.bay < start + count);
}

export function slotFocusBox(
  slot: StockroomSlot,
  spec: StockroomBaySpec = CC0_BAY,
): {
  min: [number, number, number];
  max: [number, number, number];
} {
  // Keep the neighbouring pieces in frame so the piece reads in context.
  const { w, h, d } = spec.piece;
  const padX = w * 2.6;
  const padY = h * 1.6;
  return {
    min: [slot.x - padX, Math.max(0, slot.y - padY), slot.z - d / 2],
    max: [slot.x + padX, slot.y + padY, slot.z + d / 2],
  };
}

/** Header sign above the bays. */
export const SIGN_H = 0.62;

export function signY(spec: StockroomBaySpec = CC0_BAY): number {
  return spec.height + 0.08 + SIGN_H / 2;
}

export function signTopY(spec: StockroomBaySpec = CC0_BAY): number {
  return signY(spec) + SIGN_H / 2;
}

export const SIGN_Y = signY(CC0_BAY);
export const SIGN_TOP_Y = signTopY(CC0_BAY);
/** Tilt the sign back so its face points up toward the iso camera. */
export const SIGN_TILT = -(32 * Math.PI) / 180;
