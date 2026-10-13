import { HANGER_USER_DATA } from './garment-hanger';

/** 12px — the closer #33 camera made the old 6px slop treat real clicks as orbits. */
export const DRAG_SLOP_SQ = 144;

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

/** Click → piece slug for the edit modal. Prefer the pointerdown pick (pre-orbit). */
export function resolveHangerClick(input: {
  pointerDownSlug: string | null;
  pointerUpSlug: string | null;
  hoverSlug: string | null;
  dx: number;
  dy: number;
}): string | null {
  if (!isPointerClick(input.dx, input.dy)) return null;
  return input.pointerDownSlug ?? input.pointerUpSlug ?? input.hoverSlug;
}
