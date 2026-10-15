import { CollectionGender, Prisma } from '@prisma/client';
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

export type DerivedGenderRow = {
  collectionId: string;
  productId: string;
  gender: CollectionGender;
  sortOrder: number;
};

function genderRowKey(row: { gender: string; productId: string }): string {
  return `${row.gender}:${row.productId}`;
}

export function derivedGenderRows(
  collectionId: string,
  members: readonly { productId: string; gender: string }[],
): DerivedGenderRow[] {
  const rows: DerivedGenderRow[] = [];
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
  return rows;
}

/** Prisma `$transaction` client, or a structural mock in tests. */
export type GenderOrderDb =
  | Prisma.TransactionClient
  | {
      collectionGenderOrder: {
        deleteMany(args: { where: { collectionId: string } }): Promise<unknown>;
        createMany(args: { data: unknown[] }): Promise<unknown>;
      };
    };

export type SyncGenderOrderDb =
  | Prisma.TransactionClient
  | {
      collectionGenderOrder: {
        findMany(args: { where: { collectionId: string } }): Promise<
          { productId: string; gender: string; sortOrder: number }[]
        >;
        create(args: { data: DerivedGenderRow }): Promise<unknown>;
        update(args: {
          where: {
            collectionId_gender_productId: {
              collectionId: string;
              gender: CollectionGender;
              productId: string;
            };
          };
          data: { sortOrder: number };
        }): Promise<unknown>;
        delete(args: {
          where: {
            collectionId_gender_productId: {
              collectionId: string;
              gender: CollectionGender;
              productId: string;
            };
          };
        }): Promise<unknown>;
      };
    };

export type MembershipSortDb = {
  productCollection: {
    update(args: {
      where: {
        productId_collectionId: { productId: string; collectionId: string };
      };
      data: { sortOrder: number };
    }): Promise<unknown>;
  };
};

export type MembershipSortChange = {
  productId: string;
  sortOrder: number;
};

/**
 * Temporary sortOrder that cannot collide with any compact 0..n-1 final
 * (or with another in-flight change). Used when a leftover unique on
 * (collectionId, sortOrder) would reject A↔B in a single pass.
 */
export function tempSortOrder(finalSortOrder: number): number {
  return -(finalSortOrder + 1);
}

async function applySortOrdersTwoPhase<T>(
  changes: readonly T[],
  apply: (item: T, sortOrder: number) => Promise<unknown>,
  sortOrderOf: (item: T) => number,
): Promise<void> {
  if (changes.length === 0) return;
  for (const change of changes) {
    await apply(change, tempSortOrder(sortOrderOf(change)));
  }
  for (const change of changes) {
    await apply(change, sortOrderOf(change));
  }
}

/** Two-phase rewrite of `product_collections.sortOrder` inside the caller tx. */
export async function applyMembershipSortOrdersTwoPhase(
  db: MembershipSortDb,
  collectionId: string,
  changes: readonly MembershipSortChange[],
): Promise<void> {
  await applySortOrdersTwoPhase(
    changes,
    (change, sortOrder) =>
      db.productCollection.update({
        where: {
          productId_collectionId: { productId: change.productId, collectionId },
        },
        data: { sortOrder },
      }),
    (change) => change.sortOrder,
  );
}

/** Two-phase rewrite of `collection_gender_orders.sortOrder` inside the caller tx. */
export async function applyGenderSortOrdersTwoPhase(
  db: SyncGenderOrderDb,
  collectionId: string,
  changes: readonly DerivedGenderRow[],
): Promise<void> {
  await applySortOrdersTwoPhase(
    changes,
    (row, sortOrder) =>
      db.collectionGenderOrder.update({
        where: {
          collectionId_gender_productId: {
            collectionId,
            gender: row.gender,
            productId: row.productId,
          },
        },
        data: { sortOrder },
      }),
    (row) => row.sortOrder,
  );
}

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
  const rows = derivedGenderRows(collectionId, members);
  if (rows.length > 0) {
    await db.collectionGenderOrder.createMany({ data: rows });
  }
}

/** Update / create / delete only the derived rows that actually changed. */
export async function syncDerivedGenderOrders(
  db: SyncGenderOrderDb,
  collectionId: string,
  members: readonly { productId: string; gender: string }[],
): Promise<void> {
  const desired = derivedGenderRows(collectionId, members);
  const existing = await db.collectionGenderOrder.findMany({ where: { collectionId } });
  const want = new Map(desired.map((row) => [genderRowKey(row), row]));
  const have = new Map(existing.map((row) => [genderRowKey(row), row]));

  const toCreate: DerivedGenderRow[] = [];
  const toUpdate: DerivedGenderRow[] = [];
  for (const [key, row] of want) {
    const prev = have.get(key);
    if (!prev) {
      toCreate.push(row);
      continue;
    }
    if (prev.sortOrder === row.sortOrder) continue;
    toUpdate.push(row);
  }

  for (const row of existing) {
    if (want.has(genderRowKey(row))) continue;
    await db.collectionGenderOrder.delete({
      where: {
        collectionId_gender_productId: {
          collectionId,
          gender: row.gender as CollectionGender,
          productId: row.productId,
        },
      },
    });
  }

  await applyGenderSortOrdersTwoPhase(db, collectionId, toUpdate);

  for (const row of toCreate) {
    await db.collectionGenderOrder.create({ data: row });
  }
}
