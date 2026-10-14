/** In-memory + sessionStorage so admin lists paint immediately, then refresh. */

const MEMORY = new Map<string, unknown>();

export const ADMIN_LIST_CACHE_PREFIX = 'lc-admin-list:';
export const ADMIN_LIST_SKELETON_ROWS = 6;

export function adminListCacheKey(
  kind: 'products' | 'collections' | 'collection-detail',
  archivedOrSlug: boolean | string,
): string {
  if (kind === 'collection-detail') return `${kind}:${archivedOrSlug}`;
  return `${kind}:${archivedOrSlug ? 'archived' : 'live'}`;
}

export function readAdminCache<T>(key: string): T | null {
  if (MEMORY.has(key)) return MEMORY.get(key) as T;
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ADMIN_LIST_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    MEMORY.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminCache<T>(key: string, value: T): void {
  MEMORY.set(key, value);
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(ADMIN_LIST_CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function readAdminListCache<T>(key: string): T[] | null {
  const value = readAdminCache<T[]>(key);
  return Array.isArray(value) ? value : null;
}

export function writeAdminListCache<T>(key: string, items: T[]): void {
  writeAdminCache(key, items);
}

export function clearAdminListCache(key?: string): void {
  if (key) {
    MEMORY.delete(key);
    try {
      sessionStorage?.removeItem(ADMIN_LIST_CACHE_PREFIX + key);
    } catch {
      /* ignore */
    }
    return;
  }
  MEMORY.clear();
}

/** Public catalog 404s archived (and unpublished) collections. Admin must not hit it. */
export function shouldRequestPublicCollection(collection: {
  archivedAt?: string | Date | null;
} | null): boolean {
  if (!collection) return false;
  const archived = collection.archivedAt;
  return archived == null || archived === '';
}
