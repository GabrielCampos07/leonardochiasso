import { CollectionGender, Prisma } from '@prisma/client';
import {
  GenderList,
  listsForProductGender,
} from '../catalog/gender';

type Db = Prisma.TransactionClient | PrismaServiceLike;

type PrismaServiceLike = {
  product: Prisma.ProductDelegate;
  collectionGenderOrder: Prisma.CollectionGenderOrderDelegate;
};

/**
 * After membership or gender changes: drop rows the product no longer
 * matches; append missing rows at the end of each matching list.
 */
export async function syncProductGenderOrders(
  db: Db,
  productId: string,
): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { category: true, collections: true },
  });
  if (!product) return;

  const wantedKeys = new Set<string>();
  const wanted: { collectionId: string; gender: GenderList }[] = [];
  for (const pc of product.collections) {
    for (const gender of listsForProductGender(product.category.slug)) {
      const key = `${pc.collectionId}:${gender}`;
      if (wantedKeys.has(key)) continue;
      wantedKeys.add(key);
      wanted.push({ collectionId: pc.collectionId, gender });
    }
  }

  const existing = await db.collectionGenderOrder.findMany({
    where: { productId },
  });

  const stale = existing.filter(
    (row) => !wantedKeys.has(`${row.collectionId}:${row.gender}`),
  );
  if (stale.length > 0) {
    await db.collectionGenderOrder.deleteMany({
      where: {
        productId,
        OR: stale.map((row) => ({
          collectionId: row.collectionId,
          gender: row.gender,
        })),
      },
    });
  }

  const have = new Set(
    existing.map((row) => `${row.collectionId}:${row.gender}`),
  );
  for (const row of wanted) {
    if (have.has(`${row.collectionId}:${row.gender}`)) continue;
    const max = await db.collectionGenderOrder.aggregate({
      where: { collectionId: row.collectionId, gender: row.gender },
      _max: { sortOrder: true },
    });
    await db.collectionGenderOrder.create({
      data: {
        collectionId: row.collectionId,
        productId,
        gender: row.gender,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }
}

/**
 * After replacing a collection's members: drop orders for products that
 * left (or no longer match a list); append newcomers at the end.
 */
export async function syncCollectionGenderOrders(
  db: Db,
  collectionId: string,
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) {
    await db.collectionGenderOrder.deleteMany({ where: { collectionId } });
    return;
  }

  await db.collectionGenderOrder.deleteMany({
    where: { collectionId, productId: { notIn: productIds } },
  });

  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });

  const wantedKeys = new Set<string>();
  const wanted: { productId: string; gender: GenderList }[] = [];
  for (const product of products) {
    for (const gender of listsForProductGender(product.category.slug)) {
      const key = `${product.id}:${gender}`;
      wantedKeys.add(key);
      wanted.push({ productId: product.id, gender });
    }
  }

  const existing = await db.collectionGenderOrder.findMany({
    where: { collectionId },
  });

  const stale = existing.filter(
    (row) => !wantedKeys.has(`${row.productId}:${row.gender}`),
  );
  if (stale.length > 0) {
    await db.collectionGenderOrder.deleteMany({
      where: {
        collectionId,
        OR: stale.map((row) => ({
          productId: row.productId,
          gender: row.gender,
        })),
      },
    });
  }

  const have = new Set(existing.map((row) => `${row.productId}:${row.gender}`));
  const maxByGender: Record<GenderList, number> = {
    feminino: -1,
    masculino: -1,
  };
  for (const row of existing) {
    if (!wantedKeys.has(`${row.productId}:${row.gender}`)) continue;
    const g = row.gender as GenderList;
    if (row.sortOrder > maxByGender[g]) maxByGender[g] = row.sortOrder;
  }

  const toCreate: {
    collectionId: string;
    productId: string;
    gender: CollectionGender;
    sortOrder: number;
  }[] = [];
  for (const row of wanted) {
    if (have.has(`${row.productId}:${row.gender}`)) continue;
    maxByGender[row.gender] += 1;
    toCreate.push({
      collectionId,
      productId: row.productId,
      gender: row.gender,
      sortOrder: maxByGender[row.gender],
    });
  }
  if (toCreate.length > 0) {
    await db.collectionGenderOrder.createMany({ data: toCreate });
  }
}
