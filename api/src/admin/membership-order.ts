import { CollectionGender } from '@prisma/client';
import { GenderList, listsForProductGender } from '../catalog/gender';

/**
 * Reorder only the live subset; keep every other member (other gender,
 * archived, not in the payload) in its existing slot.
 * Same rule the 3D hangers use on the front.
 */
export function mergeLiveOrderIntoMembership(
  membership: readonly string[],
  liveOrdered: readonly string[],
): string[] {
  const live = uniqueIds(liveOrdered);
  const liveSet = new Set(live);
  const next: string[] = [];
  const seen = new Set<string>();
  let i = 0;
  for (const raw of membership) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    if (liveSet.has(id)) {
      const take = live[i++];
      if (!take || seen.has(take)) continue;
      seen.add(take);
      next.push(take);
    } else {
      seen.add(id);
      next.push(id);
    }
  }
  while (i < live.length) {
    const take = live[i++];
    if (!take || seen.has(take)) continue;
    seen.add(take);
    next.push(take);
  }
  return next;
}

function uniqueIds(ids: readonly string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function sortMembersBySortOrder<
  T extends { sortOrder: number; productId: string },
>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => {
    const byOrder = a.sortOrder - b.sortOrder;
    if (byOrder !== 0) return byOrder;
    return a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0;
  });
}

type GenderOrderDb = {
  collectionGenderOrder: {
    deleteMany: (args: { where: { collectionId: string } }) => Promise<unknown>;
    createMany: (args: { data: unknown[] }) => Promise<unknown>;
  };
};

/**
 * Derived copy of the one membership order into collection_gender_orders.
 * Gabriel: keep the table as a shadow (“mantém a cópia”). It is rewritten on
 * every membership save and is not read by 3D, Lista, or the public site.
 */
export async function rewriteDerivedGenderOrders(
  db: GenderOrderDb,
  collectionId: string,
  members: readonly { productId: string; gender: string }[],
): Promise<void> {
  await db.collectionGenderOrder.deleteMany({ where: { collectionId } });
  const rows: {
    collectionId: string;
    productId: string;
    gender: CollectionGender;
    sortOrder: number;
  }[] = [];
  const lists: GenderList[] = ['feminino', 'masculino'];
  for (const gender of lists) {
    let index = 0;
    for (const member of members) {
      if (!listsForProductGender(member.gender).includes(gender)) continue;
      rows.push({
        collectionId,
        productId: member.productId,
        gender,
        sortOrder: index++,
      });
    }
  }
  if (rows.length > 0) {
    await db.collectionGenderOrder.createMany({ data: rows });
  }
}
