export interface RackPickObject {
  userData?: Record<string, unknown> | null;
  parent?: RackPickObject | null;
}

export interface RackPickHit {
  object: RackPickObject;
}

const UNIT_KINDS = new Set(['rack', 'vitrine']);

/** Walk toward the unit group. Hanger clicks are resolved separately. */
export function rackIdFromObject(object: RackPickObject | null | undefined): string | null {
  let current: RackPickObject | null | undefined = object;
  while (current) {
    const kind = String(current.userData?.['kind'] ?? '');
    const rackId = current.userData?.['rackId'];
    if (UNIT_KINDS.has(kind) && typeof rackId === 'string' && rackId) return rackId;
    current = current.parent;
  }
  return null;
}

/** Closest-first hits → collection / vitrine id for overview click-to-zoom. */
export function rackIdFromHits(hits: readonly RackPickHit[]): string | null {
  for (const hit of hits) {
    const id = rackIdFromObject(hit.object);
    if (id) return id;
  }
  return null;
}
