/** Membership `product_collections.sortOrder` for this collection slug. */
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

export function sortByMembershipSortOrder<
  T extends { id: string; collections?: { slug: string; sortOrder?: number }[] | null },
>(items: readonly T[], collectionSlug: string): T[] {
  return [...items].sort((a, b) => compareMembershipSortOrder(a, b, collectionSlug));
}
