/**
 * Shared membership order: `product_collections.sortOrder`, then `productId`.
 * Same rule as the public API (`api/src/catalog/membership-sort.ts`) and 3D.
 */

export function membershipSortOrder(
  product: { collections?: { slug: string; sortOrder?: number }[] | null },
  collectionSlug: string,
): number {
  const hit = product.collections?.find((row) => row.slug === collectionSlug);
  if (hit != null && Number.isFinite(hit.sortOrder)) return Number(hit.sortOrder);
  return Number.MAX_SAFE_INTEGER;
}

/** sortOrder first; productId when two members share a sortOrder. */
export function compareMembershipSortOrder(
  a: { id: string; collections?: { slug: string; sortOrder?: number }[] | null },
  b: { id: string; collections?: { slug: string; sortOrder?: number }[] | null },
  collectionSlug: string,
): number {
  const byOrder = membershipSortOrder(a, collectionSlug) - membershipSortOrder(b, collectionSlug);
  if (byOrder !== 0) return byOrder;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Lista / public-API order for the same product DTOs. */
export function sortByMembershipSortOrder<
  T extends { id: string; collections?: { slug: string; sortOrder?: number }[] | null },
>(items: readonly T[], collectionSlug: string): T[] {
  return [...items].sort((a, b) => compareMembershipSortOrder(a, b, collectionSlug));
}

/**
 * Lista reorder (Subir / Descer / drag).
 * Set to `true` to re-enable those controls. Leave `false` so the Lista
 * only displays `product_collections.sortOrder` + productId (same as 3D/site).
 */
export const LISTA_REORDER_ENABLED = false;

/**
 * 3D hanger drag and Shift+←/→. Same notice as the Lista.
 * Set to `true` together with `LISTA_REORDER_ENABLED` when order is writable again.
 */
export const STOCKROOM_REORDER_ENABLED = false;

export const LISTA_ORDER_MAINTENANCE_NOTICE = 'Ordem em manutenção';
