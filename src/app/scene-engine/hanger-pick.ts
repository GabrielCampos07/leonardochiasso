import { HANGER_USER_DATA } from './garment-hanger';

/** 5px — a rack pan / orbit must not count as a piece click. */
export const CLICK_SLOP_PX = 5;
/** Finger wobble on the first iOS tap is larger than a mouse click. */
export const TOUCH_CLICK_SLOP_PX = 16;
export const DRAG_SLOP_SQ = CLICK_SLOP_PX * CLICK_SLOP_PX;
export const TOUCH_DRAG_SLOP_SQ = TOUCH_CLICK_SLOP_PX * TOUCH_CLICK_SLOP_PX;
/** Finger-down longer than this is a hold / drag, even if it barely moved. */
export const CLICK_MAX_MS = 300;

const IGNORE_PICK_KINDS = new Set([
  'room',
  'plant',
  'mannequin',
  'glass',
  'draft',
  'rug',
  'rack-decor',
  'vitrine-decor',
]);

/** Floor / wall / ceiling — looking through these was opening a piece or refitting the rack. */
const ROOM_SURFACE_NAMES = new Set([
  'floor',
  'wall',
  'ceiling',
  'wainscot',
  'skirting',
  'chair-rail',
]);

const ROOM_SURFACE_KINDS = new Set(['floor', 'wall', 'ceiling', 'room-surface']);

export interface PickObject {
  userData?: Record<string, unknown> | null;
  parent?: PickObject | null;
}

export interface NamedPickObject extends PickObject {
  name?: string;
}

export interface PickHit {
  object: NamedPickObject;
}

export function isIgnoredPick(object: PickObject | null | undefined): boolean {
  if (!object) return false;
  if (object.userData?.['ignorePick'] === true) return true;
  return IGNORE_PICK_KINDS.has(String(object.userData?.['kind'] ?? ''));
}

/** Closest floor / wall / ceiling hit — do not look through it to a hanger or empty rack. */
export function isRoomSurface(object: NamedPickObject | null | undefined): boolean {
  let current: NamedPickObject | null | undefined = object;
  while (current) {
    if (ROOM_SURFACE_NAMES.has(String(current.name ?? ''))) return true;
    if (ROOM_SURFACE_KINDS.has(String(current.userData?.['kind'] ?? ''))) return true;
    current = current.parent;
  }
  return false;
}

/** Walk toward the hanger group. Props / glass / decor abort this hit. */
export function hangerSlugFromObject(object: PickObject | null | undefined): string | null {
  let current: PickObject | null | undefined = object;
  while (current) {
    if (isIgnoredPick(current)) return null;
    const kind = current.userData?.['kind'];
    const slug = current.userData?.['slug'];
    if (kind === HANGER_USER_DATA && typeof slug === 'string' && slug) return slug;
    current = current.parent;
  }
  return null;
}

/**
 * Closest-first hits. Name plates / frames / photos map via ancestry.
 * Rugs, glass, mannequins and other props never steal a piece behind them.
 */
export function hangerSlugFromHits(hits: readonly PickHit[]): string | null {
  if (isRoomSurface(hits[0]?.object)) return null;
  for (const hit of hits) {
    const slug = hangerSlugFromObject(hit.object);
    if (slug) return slug;
  }
  return null;
}

export function isPointerClick(dx: number, dy: number, slopSq = DRAG_SLOP_SQ): boolean {
  return dx * dx + dy * dy <= slopSq;
}

export function slopSqForPointer(pointerType?: string): number {
  return pointerType === 'touch' ? TOUCH_DRAG_SLOP_SQ : DRAG_SLOP_SQ;
}

/** Overview tap / piece click — touch gets a wider slop so the first tap counts. */
export function isTap(dx: number, dy: number, pointerType?: string): boolean {
  return isPointerClick(dx, dy, slopSqForPointer(pointerType));
}

/** Click → piece slug for the edit modal. Prefer the pointerdown pick (pre-orbit). */
export function resolveHangerClick(input: {
  pointerDownSlug: string | null;
  pointerUpSlug: string | null;
  hoverSlug: string | null;
  dx: number;
  dy: number;
  durationMs?: number;
  pointerType?: string;
}): string | null {
  if (!isTap(input.dx, input.dy, input.pointerType)) return null;
  if (input.durationMs != null && input.durationMs > CLICK_MAX_MS) return null;
  return input.pointerDownSlug ?? input.pointerUpSlug ?? input.hoverSlug;
}
