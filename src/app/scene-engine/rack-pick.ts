export interface RackPickObject {
  userData?: Record<string, unknown> | null;
  parent?: RackPickObject | null;
}

export interface RackPickHit {
  object: RackPickObject;
}

const UNIT_KINDS = new Set(['rack', 'vitrine', 'hanger', 'rug']);
const ROOM_SURFACE_NAMES = new Set(['floor', 'wall', 'ceiling', 'wainscot', 'skirting', 'chair-rail']);

function isBlockingRoomSurface(object: RackPickObject | null | undefined): boolean {
  let current: RackPickObject | null | undefined = object;
  while (current) {
    const name = String((current as { name?: string }).name ?? '');
    const kind = String(current.userData?.['kind'] ?? '');
    if (kind === 'rug') return false;
    if (ROOM_SURFACE_NAMES.has(name) || kind === 'floor' || kind === 'wall' || kind === 'ceiling') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** Walk toward the unit group — frame, hangers, and the rug under the rack. */
export function rackIdFromObject(object: RackPickObject | null | undefined): string | null {
  let current: RackPickObject | null | undefined = object;
  while (current) {
    const kind = String(current.userData?.['kind'] ?? '');
    const rackId = current.userData?.['rackId'];
    if (typeof rackId === 'string' && rackId && (UNIT_KINDS.has(kind) || kind === 'hanger')) return rackId;
    current = current.parent;
  }
  return null;
}

/** Closest-first hits → collection / vitrine id for overview click-to-zoom. */
export function rackIdFromHits(hits: readonly RackPickHit[]): string | null {
  if (isBlockingRoomSurface(hits[0]?.object)) return null;
  for (const hit of hits) {
    const id = rackIdFromObject(hit.object);
    if (id) return id;
  }
  return null;
}

/**
 * Ver todas: click a rack to zoom in. A drag / floor click / rack-pan never
 * starts that tween — including pointerup after a floor drag that still
 * raycasts a hanger behind the wood.
 */
export function rackFocusIdAfterPointer(input: {
  overview: boolean;
  wasPanning: boolean;
  isClick: boolean;
  hits: readonly RackPickHit[];
}): string | null {
  if (!input.overview || input.wasPanning || !input.isClick) return null;
  return rackIdFromHits(input.hits);
}
