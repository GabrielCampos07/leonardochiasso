/** `?archived=true` (or `1`) lists archived rows. Anything else is the live list. */
export function parseArchivedFlag(value?: string | string[]): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'true' || raw === '1';
}

export function archivedAtWhere(archived: boolean): {
  archivedAt: null | { not: null };
} {
  return archived ? { archivedAt: { not: null } } : { archivedAt: null };
}
