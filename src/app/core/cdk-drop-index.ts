/** Minimal CDK drop payload used to recover the index after auto-scroll. */
export interface CdkDropIndexEvent {
  previousIndex: number;
  currentIndex: number;
  distance?: { x?: number; y?: number };
  dropPoint?: { x?: number; y?: number };
}

const STALE_TRAVEL_PX = 16;

function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(index)));
}

/** Midpoints of each row, top → bottom, in the list's data order. */
export function itemMidpoints(
  rects: ReadonlyArray<{ top: number; bottom?: number; height?: number }>,
): number[] {
  return rects.map((rect) => {
    if (Number.isFinite(rect.bottom)) return (rect.top + (rect.bottom as number)) / 2;
    return rect.top + (rect.height ?? 0) / 2;
  });
}

export function indexFromClientY(clientY: number, mids: readonly number[]): number {
  if (!mids.length) return 0;
  let index = 0;
  for (let i = 0; i < mids.length; i++) {
    if (clientY >= mids[i]!) index = i;
  }
  return index;
}

/**
 * CDK `currentIndex` often equals `previousIndex` after a long drag + auto-scroll
 * even when the pointer is over another row. Prefer the pointer vs row midpoints
 * whenever the reported index looks stale.
 */
export function resolveCdkDropIndex(
  event: CdkDropIndexEvent,
  count: number,
  mids: readonly number[] = [],
): number {
  if (count <= 0) return 0;
  const fromEvent = clampIndex(event.currentIndex, count);
  const traveled = Math.abs(event.distance?.y ?? 0);
  const pointY = event.dropPoint?.y;
  const stale =
    fromEvent === clampIndex(event.previousIndex, count) && traveled >= STALE_TRAVEL_PX;

  if (mids.length && Number.isFinite(pointY) && (stale || fromEvent < 0 || fromEvent >= count)) {
    return clampIndex(indexFromClientY(pointY as number, mids), count);
  }
  return fromEvent;
}
