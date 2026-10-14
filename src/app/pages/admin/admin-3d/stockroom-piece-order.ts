import type { SceneHanger, SceneLayout } from '../../../scene-engine/types';

/** Long collections page sideways; start auto-pan once we have this many pieces. */
export const REORDER_AUTOSCROLL_MIN_PIECES = 10;
export const REORDER_DRAG_THRESHOLD_PX = 8;
export const REORDER_EDGE_PX = 80;
export const REORDER_AUTOSCROLL_MS = 420;
export const PIECE_ORDER_SAVE_ERROR = 'Não foi possível salvar a ordem.';

export interface PieceRect {
  slug: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function moveSlug(slugs: readonly string[], from: number, to: number): string[] {
  const next = [...slugs];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function moveSlugById(slugs: readonly string[], slug: string, delta: -1 | 1): string[] | null {
  const from = slugs.indexOf(slug);
  if (from < 0) return null;
  const to = from + delta;
  if (to < 0 || to >= slugs.length) return null;
  return moveSlug(slugs, from, to);
}

/** Closest piece under the pointer (canvas-local coords). */
export function dropTargetSlug(x: number, y: number, rects: readonly PieceRect[], skip?: string): string | null {
  let best: { slug: string; d: number } | null = null;
  for (const r of rects) {
    if (r.slug === skip) continue;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const inside = x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (inside && (!best || d < best.d)) best = { slug: r.slug, d };
  }
  return best?.slug ?? null;
}

export function dropIndexForSlug(slugs: readonly string[], over: string | null): number | null {
  if (!over) return null;
  const i = slugs.indexOf(over);
  return i < 0 ? null : i;
}

export function autoScrollDelta(
  clientX: number,
  stageLeft: number,
  stageWidth: number,
  pieces: number,
  canPrev: boolean,
  canNext: boolean,
  edge = REORDER_EDGE_PX,
  minPieces = REORDER_AUTOSCROLL_MIN_PIECES,
): -1 | 1 | 0 {
  if (pieces < minPieces || stageWidth <= 0) return 0;
  const x = clientX - stageLeft;
  if (canPrev && x <= edge) return -1;
  if (canNext && x >= stageWidth - edge) return 1;
  return 0;
}

export function applyHangerOrder(hangers: readonly SceneHanger[], slugs: readonly string[]): SceneHanger[] | null {
  if (hangers.length !== slugs.length) return null;
  const bySlug = new Map(hangers.map((h) => [h.slug, h]));
  const next: SceneHanger[] = [];
  for (const slug of slugs) {
    const hanger = bySlug.get(slug);
    if (!hanger) return null;
    next.push(hanger);
  }
  return next;
}

export function reorderRackHangers(
  layout: SceneLayout,
  rackId: string,
  slugs: readonly string[],
): SceneLayout | null {
  const rack = layout.racks.find((r) => r.id === rackId);
  if (!rack) return null;
  const hangers = applyHangerOrder(rack.hangers, slugs);
  if (!hangers) return null;
  return {
    racks: layout.racks.map((r) => (r.id === rackId ? { ...r, hangers } : r)),
  };
}

export function sameSlugOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((slug, i) => slug === b[i]);
}
