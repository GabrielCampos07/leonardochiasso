import {
  HANGER_SPACING,
  RACK_FRAME_COLUMNS,
  hangersPerRow,
  rackFrameWidth,
  rackPanRange,
} from './collection-rack';

/** How much of the overflowing edge hanger is clipped so continuation is obvious. */
export const RACK_EDGE_CUT = HANGER_SPACING * 0.46;

export interface RackPanProgress {
  first: number;
  last: number;
  total: number;
  label: string;
  canPrev: boolean;
  canNext: boolean;
  showChrome: boolean;
}

export const EMPTY_RACK_PAN: RackPanProgress = {
  first: 0,
  last: 0,
  total: 0,
  label: '',
  canPrev: false,
  canNext: false,
  showChrome: false,
};

export function clampRackPan(panX: number, range: number): number {
  if (range <= 0) return 0;
  return Math.min(range, Math.max(-range, panX));
}

/** Start at the left of a long rack so the first pieces are readable. */
export function rackStartPanX(hangerCount: number, frameColumns = RACK_FRAME_COLUMNS): number {
  return -rackPanRange(hangerCount, frameColumns);
}

export function rackPanLabel(last: number, total: number): string {
  if (total <= 0) return '';
  return `${last} de ${total}`;
}

/**
 * Window along a long rack. At rest a 19-piece rail reads "8 de 19";
 * the last step lands on "19 de 19".
 */
export function rackPanProgress(
  hangerCount: number,
  panX = 0,
  frameColumns = RACK_FRAME_COLUMNS,
): RackPanProgress {
  const total = Math.max(0, hangerCount);
  if (total <= 0) return { ...EMPTY_RACK_PAN };
  const frame = Math.min(hangersPerRow(total), frameColumns);
  const range = rackPanRange(total, frameColumns);
  const x = clampRackPan(panX, range);
  const showChrome = range > 0.001;
  const canPrev = showChrome && x > -range + 0.001;
  const canNext = showChrome && x < range - 0.001;
  const fromLeft = range <= 0 ? 0 : (x + range) / HANGER_SPACING;
  const first = Math.min(total, Math.floor(fromLeft + 1e-4) + 1);
  let last = Math.min(total, Math.max(first, Math.round(fromLeft + frame)));
  if (showChrome && !canNext) last = total;
  return {
    first,
    last,
    total,
    label: rackPanLabel(last, total),
    canPrev,
    canNext,
    showChrome,
  };
}

/** Camera window: clip the overflowing side so the last visible piece is cut. */
export function rackLookFrame(
  hangerCount: number,
  panX: number,
  frameColumns = RACK_FRAME_COLUMNS,
): { offset: number; halfW: number } {
  const frameW = rackFrameWidth(hangerCount, frameColumns);
  const range = rackPanRange(hangerCount, frameColumns);
  if (range <= 0.001) return { offset: 0, halfW: frameW / 2 };
  const x = clampRackPan(panX, range);
  const atStart = x <= -range + 0.001;
  const atEnd = x >= range - 0.001;
  const halfW = (frameW - RACK_EDGE_CUT) / 2;
  const bias = atStart ? -RACK_EDGE_CUT / 2 : atEnd ? RACK_EDGE_CUT / 2 : 0;
  return { offset: x + bias, halfW };
}

export function wheelPanPixels(event: { deltaX: number; deltaY: number; deltaMode?: number }): number {
  const raw = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const mode = event.deltaMode ?? 0;
  return mode === 1 ? raw * 16 : mode === 2 ? raw * 800 : raw;
}

/** 0-based rail columns currently inside the framed window (including the cut edge). */
export function rackVisibleColumnRange(
  hangerCount: number,
  panX = 0,
  frameColumns = RACK_FRAME_COLUMNS,
): { firstCol: number; lastCol: number } {
  const cols = Math.max(1, hangersPerRow(hangerCount));
  const frame = Math.min(cols, frameColumns);
  const range = rackPanRange(hangerCount, frameColumns);
  const x = clampRackPan(panX, range);
  const fromLeft = range <= 0 ? 0 : (x + range) / HANGER_SPACING;
  const firstCol = Math.max(0, Math.floor(fromLeft + 1e-4));
  const lastCol = Math.min(cols - 1, Math.max(firstCol, Math.floor(fromLeft + frame - 1e-4)));
  return { firstCol, lastCol };
}

export function hangerInVisibleWindow(
  index: number,
  hangerCount: number,
  panX = 0,
  frameColumns = RACK_FRAME_COLUMNS,
): boolean {
  const cols = Math.max(1, hangersPerRow(hangerCount));
  const col = index % cols;
  const { firstCol, lastCol } = rackVisibleColumnRange(hangerCount, panX, frameColumns);
  return col >= firstCol && col <= lastCol;
}

export function rackArrowDelta(key: string): -1 | 1 | 0 {
  if (key === 'ArrowLeft') return -1;
  if (key === 'ArrowRight') return 1;
  return 0;
}

/**
 * Wheel vs zoom:
 * 1. Wheel over ANY rack (frame / hangers / photos / rug) → never zoom,
 *    even when that rack cannot pan. Capture-phase stop + enableZoom off.
 * 2. Wheel elsewhere (floor, wall, empty) → zoom.
 * 3. Ctrl+wheel / trackpad pinch (`ctrlKey`, also meta) → zoom toward the
 *    cursor anywhere, including over a rack, so a piece can go close-up.
 */
export function isPinchZoomEvent(event: { ctrlKey?: boolean; metaKey?: boolean }): boolean {
  return Boolean(event.ctrlKey || event.metaKey);
}

/** Wheel on a rack must not reach OrbitControls (unless pinch). */
export function shouldBlockWheelZoom(input: { overRack: boolean; pinch: boolean }): boolean {
  return input.overRack && !input.pinch;
}

/** True only when the rack can actually scroll pieces. */
export function shouldPanRackOnWheel(input: {
  overRack: boolean;
  pinch: boolean;
  panRange: number;
}): boolean {
  return shouldBlockWheelZoom(input) && input.panRange > 0;
}
