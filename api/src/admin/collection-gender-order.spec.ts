import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';
import { tempSortOrder } from './membership-order';

const FEM = '11111111-1111-4111-8111-111111111111';
const UNI = '22222222-2222-4222-8222-222222222222';
const MAS = '33333333-3333-4333-8333-333333333333';
const EXTRA = '44444444-4444-4444-8444-444444444444';

function collectionWithMembers() {
  return {
    id: 'col-teste',
    slug: 'teste-ordem',
    products: [
      {
        productId: FEM,
        sortOrder: 2,
        product: { id: FEM, archivedAt: null, category: { slug: 'feminino' } },
      },
      {
        productId: UNI,
        sortOrder: 0,
        product: { id: UNI, archivedAt: null, category: { slug: 'unissex' } },
      },
      {
        productId: MAS,
        sortOrder: 1,
        product: { id: MAS, archivedAt: null, category: { slug: 'masculino' } },
      },
    ],
    genderOrders: [
      { productId: FEM, gender: 'feminino', sortOrder: 0 },
    ],
  };
}

describe('AdminCollectionsService gender order', () => {
  function make() {
    const members = collectionWithMembers();
    const tx = {
      collection: {
        findUnique: jest.fn().mockResolvedValue(members),
      },
      collectionGenderOrder: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue(
          members.genderOrders.map((row) => ({ ...row, collectionId: members.id })),
        ),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      productCollection: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      collection: {
        findUnique: jest.fn().mockResolvedValue(members),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      collectionGenderOrder: tx.collectionGenderOrder,
      product: tx.product,
    };
    return { service: new AdminCollectionsService(prisma as never), prisma, tx };
  }

  it('GET feminino follows product_collections.sortOrder, not the gender table', async () => {
    const { service } = make();
    const result = await service.getGenderOrder('teste-ordem', 'feminino');
    expect(result).toEqual({
      collection: 'teste-ordem',
      gender: 'feminino',
      productIds: [UNI, FEM],
    });
  });

  it('GET masculino includes unissex in membership order', async () => {
    const { service } = make();
    const result = await service.getGenderOrder('teste-ordem', 'masculino');
    expect(result.productIds).toEqual([UNI, MAS]);
  });

  it('GET rejects missing or invalid gender', async () => {
    const { service } = make();
    await expect(service.getGenderOrder('teste-ordem', undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.getGenderOrder('teste-ordem', 'unissex')).rejects.toThrow(
      'gender is required and must be feminino or masculino.',
    );
  });

  it('GET 404s when the collection is missing', async () => {
    const { service, prisma } = make();
    prisma.collection.findUnique.mockResolvedValue(null);
    await expect(service.getGenderOrder('sumiu', 'feminino')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('PUT writes the one membership order and a derived gender shadow', async () => {
    const { service, tx } = make();
    const result = await service.setGenderOrder('teste-ordem', 'feminino', [
      FEM,
      UNI,
    ]);
    expect(result).toEqual({
      collection: 'teste-ordem',
      gender: 'feminino',
      productIds: [FEM, UNI],
    });
    expect(tx.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.productCollection.createMany).not.toHaveBeenCalled();
    expectTwoPhaseMembershipUpdates(tx.productCollection.update, 'col-teste', [
      { productId: FEM, sortOrder: 0 },
      { productId: UNI, sortOrder: 2 },
    ]);
    expect(tx.collectionGenderOrder.deleteMany).not.toHaveBeenCalled();
    expect(tx.collectionGenderOrder.createMany).not.toHaveBeenCalled();
    expect(tx.collectionGenderOrder.findMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste' },
    });
    expect(tx.collectionGenderOrder.create).toHaveBeenCalledTimes(3);
  });

  it('reads membership inside $transaction with a 15s timeout', async () => {
    const { service, prisma, tx } = make();
    await service.setGenderOrder('teste-ordem', 'feminino', [FEM, UNI]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 15_000 });
    expect(tx.collection.findUnique).toHaveBeenCalled();
    expect(prisma.collection.findUnique).not.toHaveBeenCalled();
  });

  it('PUT rejects duplicates', async () => {
    const { service, tx } = make();
    await expect(
      service.setGenderOrder('teste-ordem', 'feminino', [FEM, FEM]),
    ).rejects.toThrow('A lista de peças contém itens repetidos.');
    expect(tx.productCollection.update).not.toHaveBeenCalled();
  });

  it('PUT rejects ids that are not in the collection', async () => {
    const { service } = make();
    await expect(
      service.setGenderOrder('teste-ordem', 'feminino', [FEM, UNI, EXTRA]),
    ).rejects.toThrow(
      `Peças que não pertencem a esta coleção: ${EXTRA}`,
    );
  });

  it('PUT rejects a masculino piece on the feminino list', async () => {
    const { service } = make();
    await expect(
      service.setGenderOrder('teste-ordem', 'feminino', [FEM, UNI, MAS]),
    ).rejects.toThrow(
      `Peças fora do filtro feminino (aceita feminino ou unissex): ${MAS}`,
    );
  });

  it('PUT rejects a list that is missing a matching product', async () => {
    const { service } = make();
    await expect(
      service.setGenderOrder('teste-ordem', 'feminino', [FEM]),
    ).rejects.toThrow(
      `A ordem deve conter exatamente as peças ativas feminino (incluindo unissex) desta coleção (faltando ${UNI}).`,
    );
  });

  it('two concurrent PUTs commit without throwing and keep unique sortOrders', async () => {
    const { service, store } = makeTransactional();
    await Promise.all([
      service.setGenderOrder('teste-ordem', 'feminino', [FEM, UNI]),
      service.setGenderOrder('teste-ordem', 'feminino', [UNI, FEM]),
    ]);
    const orders = store.membership.map((row) => row.sortOrder).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2]);
    expect(new Set(store.membership.map((row) => row.productId)).size).toBe(3);
    expect(store.membership).toHaveLength(3);
  });

  it('rolls back membership when the derived copy rewrite throws (Lista PUT)', async () => {
    const { service, store } = makeTransactional({ throwOnGenderCreate: true });
    const before = snapshotStore(store);
    await expect(
      service.setGenderOrder('teste-ordem', 'feminino', [FEM, UNI]),
    ).rejects.toThrow('derived copy failed');
    expect(store).toEqual(before);
  });

  it('rolls back membership when the derived copy rewrite throws (3D PUT)', async () => {
    const { service, store, productFindMany } = makeTransactional({ throwOnGenderCreate: true });
    productFindMany.mockResolvedValue([
      { id: FEM, slug: 'teste-fem', category: { slug: 'feminino' } },
      { id: UNI, slug: 'teste-uni', category: { slug: 'unissex' } },
      { id: MAS, slug: 'teste-masc', category: { slug: 'masculino' } },
    ]);
    const before = snapshotStore(store);
    await expect(
      service.setProducts('teste-ordem', ['teste-fem', 'teste-uni', 'teste-masc']),
    ).rejects.toThrow('derived copy failed');
    expect(store).toEqual(before);
  });

  it('keepMissing merges live slugs and syncs only changed rows in the same transaction', async () => {
    const { service, tx, prisma } = make();
    tx.productCollection.findMany.mockResolvedValue([
      { productId: 'id-arquivo', sortOrder: 0, product: { slug: 'teste-arquivo' } },
      { productId: 'id-a', sortOrder: 1, product: { slug: 'teste-a' } },
      { productId: 'id-b', sortOrder: 2, product: { slug: 'teste-b' } },
      { productId: 'id-c', sortOrder: 3, product: { slug: 'teste-c' } },
    ]);
    tx.product.findMany.mockResolvedValue([
      { id: 'id-arquivo', slug: 'teste-arquivo', category: { slug: 'feminino' } },
      { id: 'id-a', slug: 'teste-a', category: { slug: 'feminino' } },
      { id: 'id-b', slug: 'teste-b', category: { slug: 'feminino' } },
      { id: 'id-c', slug: 'teste-c', category: { slug: 'feminino' } },
    ]);

    const result = await service.setProducts('teste-ordem', ['teste-c', 'teste-a', 'teste-b'], true);

    expect(result.productSlugs).toEqual([
      'teste-arquivo',
      'teste-c',
      'teste-a',
      'teste-b',
    ]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 15_000 });
    expect(tx.collection.findUnique).toHaveBeenCalled();
    expect(prisma.collection.findUnique).not.toHaveBeenCalled();
    expect(tx.productCollection.findMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste' },
      orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
      include: { product: { select: { slug: true } } },
    });
    expect(tx.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.productCollection.createMany).not.toHaveBeenCalled();
    expectTwoPhaseMembershipUpdates(tx.productCollection.update, 'col-teste', [
      { productId: 'id-c', sortOrder: 1 },
      { productId: 'id-a', sortOrder: 2 },
      { productId: 'id-b', sortOrder: 3 },
    ]);
    expect(tx.collectionGenderOrder.deleteMany).not.toHaveBeenCalled();
    expect(tx.collectionGenderOrder.createMany).not.toHaveBeenCalled();
    expect(tx.collectionGenderOrder.findMany).toHaveBeenCalled();
  });

  it('does not delete or recreate existing product_collections members on the 3D PUT', async () => {
    const { service, tx } = make();
    tx.productCollection.findMany.mockResolvedValue([
      { productId: 'id-arquivo', sortOrder: 0, product: { slug: 'teste-arquivo' } },
      { productId: 'id-a', sortOrder: 1, product: { slug: 'teste-a' } },
      { productId: 'id-b', sortOrder: 2, product: { slug: 'teste-b' } },
    ]);
    tx.product.findMany.mockResolvedValue([
      { id: 'id-a', slug: 'teste-a', category: { slug: 'feminino' } },
      { id: 'id-b', slug: 'teste-b', category: { slug: 'feminino' } },
      { id: 'id-novo', slug: 'teste-novo', category: { slug: 'feminino' } },
    ]);

    const result = await service.setProducts('teste-ordem', [
      'teste-b',
      'teste-novo',
      'teste-a',
    ]);

    expect(result.productSlugs).toEqual(['teste-b', 'teste-novo', 'teste-a']);
    expect(tx.productCollection.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.productCollection.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste', productId: { in: ['id-arquivo'] } },
    });
    expectTwoPhaseMembershipUpdates(tx.productCollection.update, 'col-teste', [
      { productId: 'id-b', sortOrder: 0 },
      { productId: 'id-a', sortOrder: 2 },
    ]);
    expect(tx.productCollection.createMany).toHaveBeenCalledTimes(1);
    expect(tx.productCollection.createMany).toHaveBeenCalledWith({
      data: [{ collectionId: 'col-teste', productId: 'id-novo', sortOrder: 1 }],
    });
    const createdIds = tx.productCollection.createMany.mock.calls.flatMap(
      (call: [{ data: { productId: string }[] }]) => call[0].data.map((row) => row.productId),
    );
    const deletedIds =
      (tx.productCollection.deleteMany.mock.calls[0]?.[0] as {
        where: { productId: { in: string[] } };
      })?.where.productId.in ?? [];
    expect(createdIds).not.toEqual(expect.arrayContaining(['id-a', 'id-b']));
    expect(deletedIds).not.toEqual(expect.arrayContaining(['id-a', 'id-b']));
  });

  it('names a missing slug with 400 instead of crashing on find!', async () => {
    const { service, tx } = make();
    tx.product.findMany.mockResolvedValue([
      { id: FEM, slug: 'teste-fem', category: { slug: 'feminino' } },
      { id: UNI, slug: 'teste-uni', category: { slug: 'unissex' } },
    ]);
    await expect(
      service.setProducts('teste-ordem', ['teste-fem', 'teste-sumiu']),
    ).rejects.toThrow('Unknown product slug: teste-sumiu');
  });

  it('reorders draft TESTE-O1/O2 with keepMissing without recreating their joins', async () => {
    const { service, tx } = make();
    tx.productCollection.findMany.mockResolvedValue([
      { productId: 'id-o1', sortOrder: 0, product: { slug: 'teste-o1' } },
      { productId: 'id-o2', sortOrder: 1, product: { slug: 'teste-o2' } },
    ]);
    tx.product.findMany.mockResolvedValue([
      { id: 'id-o1', slug: 'teste-o1', status: 'draft', category: { slug: 'feminino' } },
      { id: 'id-o2', slug: 'teste-o2', status: 'draft', category: { slug: 'feminino' } },
    ]);

    const result = await service.setProducts('teste-ordem', ['teste-o2', 'teste-o1'], true);

    expect(result.productSlugs).toEqual(['teste-o2', 'teste-o1']);
    expect(tx.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.productCollection.createMany).not.toHaveBeenCalled();
    expectTwoPhaseMembershipUpdates(tx.productCollection.update, 'col-teste', [
      { productId: 'id-o2', sortOrder: 0 },
      { productId: 'id-o1', sortOrder: 1 },
    ]);
    expect(tx.collectionGenderOrder.deleteMany).not.toHaveBeenCalled();
    expect(tx.collectionGenderOrder.createMany).not.toHaveBeenCalled();
  });

  it('swaps two pieces A<->B without colliding sortOrder (setProducts)', async () => {
    const { service, store, productFindMany } = makeTransactional();
    productFindMany.mockResolvedValue([
      { id: 'id-a', slug: 'teste-a', category: { slug: 'feminino' } },
      { id: 'id-b', slug: 'teste-b', category: { slug: 'feminino' } },
    ]);
    store.membership = [
      { collectionId: 'col-teste', productId: 'id-a', sortOrder: 0 },
      { collectionId: 'col-teste', productId: 'id-b', sortOrder: 1 },
    ];
    store.genderOrders = [
      { collectionId: 'col-teste', productId: 'id-a', gender: 'feminino', sortOrder: 0 },
      { collectionId: 'col-teste', productId: 'id-b', gender: 'feminino', sortOrder: 1 },
    ];

    const result = await service.setProducts('teste-ordem', ['teste-b', 'teste-a'], true);

    expect(result.productSlugs).toEqual(['teste-b', 'teste-a']);
    expect(sortedMembership(store)).toEqual([
      { productId: 'id-b', sortOrder: 0 },
      { productId: 'id-a', sortOrder: 1 },
    ]);
    expect(uniqueSortOrders(store.membership)).toEqual([0, 1]);
    expect(sortedGender(store, 'feminino')).toEqual([
      { productId: 'id-b', sortOrder: 0 },
      { productId: 'id-a', sortOrder: 1 },
    ]);
  });

  it('rotates three pieces A->B->C->A without colliding sortOrder (setProducts)', async () => {
    const { service, store, productFindMany } = makeTransactional();
    productFindMany.mockResolvedValue([
      { id: 'id-a', slug: 'teste-a', category: { slug: 'feminino' } },
      { id: 'id-b', slug: 'teste-b', category: { slug: 'feminino' } },
      { id: 'id-c', slug: 'teste-c', category: { slug: 'feminino' } },
    ]);
    store.membership = [
      { collectionId: 'col-teste', productId: 'id-a', sortOrder: 0 },
      { collectionId: 'col-teste', productId: 'id-b', sortOrder: 1 },
      { collectionId: 'col-teste', productId: 'id-c', sortOrder: 2 },
    ];
    store.genderOrders = [
      { collectionId: 'col-teste', productId: 'id-a', gender: 'feminino', sortOrder: 0 },
      { collectionId: 'col-teste', productId: 'id-b', gender: 'feminino', sortOrder: 1 },
      { collectionId: 'col-teste', productId: 'id-c', gender: 'feminino', sortOrder: 2 },
    ];

    const result = await service.setProducts(
      'teste-ordem',
      ['teste-c', 'teste-a', 'teste-b'],
      true,
    );

    expect(result.productSlugs).toEqual(['teste-c', 'teste-a', 'teste-b']);
    expect(sortedMembership(store)).toEqual([
      { productId: 'id-c', sortOrder: 0 },
      { productId: 'id-a', sortOrder: 1 },
      { productId: 'id-b', sortOrder: 2 },
    ]);
    expect(uniqueSortOrders(store.membership)).toEqual([0, 1, 2]);
    expect(sortedGender(store, 'feminino')).toEqual([
      { productId: 'id-c', sortOrder: 0 },
      { productId: 'id-a', sortOrder: 1 },
      { productId: 'id-b', sortOrder: 2 },
    ]);
  });

  it('swaps two pieces A<->B without colliding sortOrder (setGenderOrder)', async () => {
    const { service, store } = makeTransactional();
    await service.setGenderOrder('teste-ordem', 'feminino', [FEM, UNI]);
    expect(sortedMembership(store)).toEqual([
      { productId: FEM, sortOrder: 0 },
      { productId: MAS, sortOrder: 1 },
      { productId: UNI, sortOrder: 2 },
    ]);
    expect(uniqueSortOrders(store.membership)).toEqual([0, 1, 2]);
  });

  it('two concurrent 3D PUTs commit without throwing and keep unique sortOrders', async () => {
    const { service, store, productFindMany } = makeTransactional();
    productFindMany.mockResolvedValue([
      { id: FEM, slug: 'teste-o1', status: 'draft', category: { slug: 'feminino' } },
      { id: UNI, slug: 'teste-o2', status: 'draft', category: { slug: 'unissex' } },
      { id: MAS, slug: 'teste-masc', status: 'published', category: { slug: 'masculino' } },
    ]);
    await Promise.all([
      service.setProducts('teste-ordem', ['teste-o1', 'teste-o2'], true),
      service.setProducts('teste-ordem', ['teste-o2', 'teste-o1'], true),
    ]);
    const orders = store.membership.map((row) => row.sortOrder).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2]);
    expect(new Set(store.membership.map((row) => row.productId)).size).toBe(3);
    expect(store.membership).toHaveLength(3);
  });

  it('append inserts only the newcomer and never rewrites other product_collections rows', async () => {
    const { service, tx } = make();
    tx.productCollection.findMany.mockResolvedValue([
      { productId: 'id-a', sortOrder: 0, product: { slug: 'teste-a', category: { slug: 'feminino' } } },
      { productId: 'id-b', sortOrder: 1, product: { slug: 'teste-b', category: { slug: 'feminino' } } },
    ]);
    tx.product.findMany.mockResolvedValue([
      { id: 'id-novo', slug: 'teste-o1', status: 'draft', category: { slug: 'feminino' } },
    ]);

    const result = await service.appendProducts('teste-ordem', ['teste-o1']);

    expect(result.productSlugs).toEqual(['teste-a', 'teste-b', 'teste-o1']);
    expect(tx.productCollection.update).not.toHaveBeenCalled();
    expect(tx.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.productCollection.delete).not.toHaveBeenCalled();
    expect(tx.productCollection.createMany).toHaveBeenCalledTimes(1);
    expect(tx.productCollection.createMany).toHaveBeenCalledWith({
      data: [{ collectionId: 'col-teste', productId: 'id-novo', sortOrder: 2 }],
    });
  });

  it('remove deletes only that piece row and leaves the others untouched', async () => {
    const { service, tx } = make();
    tx.product.findUnique.mockResolvedValue({ id: 'id-b' });
    tx.productCollection.findUnique.mockResolvedValue({
      productId: 'id-b',
      collectionId: 'col-teste',
      sortOrder: 1,
    });
    tx.productCollection.findMany.mockResolvedValue([
      { productId: 'id-a', sortOrder: 0, product: { slug: 'teste-a' } },
      { productId: 'id-c', sortOrder: 2, product: { slug: 'teste-c' } },
    ]);

    const result = await service.removeProduct('teste-ordem', 'teste-b');

    expect(result.productSlugs).toEqual(['teste-a', 'teste-c']);
    expect(tx.productCollection.delete).toHaveBeenCalledTimes(1);
    expect(tx.productCollection.delete).toHaveBeenCalledWith({
      where: { productId_collectionId: { productId: 'id-b', collectionId: 'col-teste' } },
    });
    expect(tx.productCollection.update).not.toHaveBeenCalled();
    expect(tx.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.productCollection.createMany).not.toHaveBeenCalled();
    expect(tx.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste', productId: 'id-b' },
    });
  });
});

type OrderStore = {
  membership: { collectionId: string; productId: string; sortOrder: number }[];
  genderOrders: {
    collectionId: string;
    productId: string;
    gender: string;
    sortOrder: number;
  }[];
};

const SLUG_BY_ID: Record<string, string> = {
  [FEM]: 'teste-o1',
  [UNI]: 'teste-o2',
  [MAS]: 'teste-masc',
  'id-a': 'teste-a',
  'id-b': 'teste-b',
  'id-c': 'teste-c',
};

function expectTwoPhaseMembershipUpdates(
  update: jest.Mock,
  collectionId: string,
  finals: { productId: string; sortOrder: number }[],
) {
  expect(update).toHaveBeenCalledTimes(finals.length * 2);
  finals.forEach((change, i) => {
    expect(update).toHaveBeenNthCalledWith(i + 1, {
      where: { productId_collectionId: { productId: change.productId, collectionId } },
      data: { sortOrder: tempSortOrder(change.sortOrder) },
    });
    expect(update).toHaveBeenNthCalledWith(finals.length + i + 1, {
      where: { productId_collectionId: { productId: change.productId, collectionId } },
      data: { sortOrder: change.sortOrder },
    });
  });
}

function sortedMembership(store: OrderStore) {
  return [...store.membership]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.productId.localeCompare(b.productId))
    .map((row) => ({ productId: row.productId, sortOrder: row.sortOrder }));
}

function sortedGender(store: OrderStore, gender: string) {
  return store.genderOrders
    .filter((row) => row.gender === gender)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.productId.localeCompare(b.productId))
    .map((row) => ({ productId: row.productId, sortOrder: row.sortOrder }));
}

function uniqueSortOrders(
  rows: { collectionId: string; sortOrder: number; gender?: string }[],
  gender?: string,
) {
  const scoped = rows.filter((row) => (gender ? row.gender === gender : true));
  const orders = scoped.map((row) => row.sortOrder).sort((a, b) => a - b);
  expect(new Set(orders).size).toBe(orders.length);
  return orders;
}

function assertUniqueSort(
  rows: { collectionId: string; productId: string; sortOrder: number; gender?: string }[],
  row: { collectionId: string; productId: string; sortOrder: number; gender?: string },
  nextSort: number,
  byGender: boolean,
) {
  const clash = rows.some(
    (item) =>
      item !== row &&
      item.collectionId === row.collectionId &&
      item.sortOrder === nextSort &&
      (!byGender || item.gender === row.gender),
  );
  if (clash) {
    throw new Error(
      byGender
        ? `unique_sort_order: collection_gender_orders (collectionId, gender, sortOrder)`
        : `unique_sort_order: product_collections (collectionId, sortOrder)=(${row.collectionId},${nextSort})`,
    );
  }
}

function snapshotStore(store: OrderStore): OrderStore {
  return {
    membership: store.membership.map((row) => ({ ...row })),
    genderOrders: store.genderOrders.map((row) => ({ ...row })),
  };
}

/** In-memory $transaction: commit only if the callback finishes. */
function makeTransactional(opts: { throwOnGenderCreate?: boolean } = {}) {
  const productFindMany = jest.fn().mockResolvedValue([
    { id: FEM, slug: 'teste-o1', status: 'draft', category: { slug: 'feminino' } },
    { id: UNI, slug: 'teste-o2', status: 'draft', category: { slug: 'unissex' } },
    { id: MAS, slug: 'teste-masc', status: 'published', category: { slug: 'masculino' } },
  ]);
  const store: OrderStore = {
    membership: [
      { collectionId: 'col-teste', productId: UNI, sortOrder: 0 },
      { collectionId: 'col-teste', productId: MAS, sortOrder: 1 },
      { collectionId: 'col-teste', productId: FEM, sortOrder: 2 },
    ],
    genderOrders: [
      { collectionId: 'col-teste', productId: FEM, gender: 'feminino', sortOrder: 0 },
    ],
  };

  function txFor(working: OrderStore) {
    return {
      productCollection: {
        deleteMany: jest.fn(
          async ({
            where,
          }: {
            where: { collectionId: string; productId?: { in?: string[] } };
          }) => {
            const leaving = where.productId?.in;
            working.membership = working.membership.filter((row) => {
              if (row.collectionId !== where.collectionId) return true;
              if (leaving) return !leaving.includes(row.productId);
              return false;
            });
            return { count: 0 };
          },
        ),
        createMany: jest.fn(async ({ data }: { data: OrderStore['membership'] }) => {
          working.membership.push(...data);
          return { count: data.length };
        }),
        create: jest.fn(async ({ data }: { data: OrderStore['membership'][number] }) => {
          working.membership.push(data);
          return data;
        }),
        delete: jest.fn(
          async ({
            where,
          }: {
            where: { productId_collectionId: { productId: string; collectionId: string } };
          }) => {
            working.membership = working.membership.filter(
              (row) =>
                !(
                  row.productId === where.productId_collectionId.productId &&
                  row.collectionId === where.productId_collectionId.collectionId
                ),
            );
            return { count: 1 };
          },
        ),
        findUnique: jest.fn(
          async ({
            where,
          }: {
            where: { productId_collectionId: { productId: string; collectionId: string } };
          }) =>
            working.membership.find(
              (row) =>
                row.productId === where.productId_collectionId.productId &&
                row.collectionId === where.productId_collectionId.collectionId,
            ) ?? null,
        ),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { productId_collectionId: { productId: string; collectionId: string } };
            data: { sortOrder: number };
          }) => {
            const row = working.membership.find(
              (item) =>
                item.productId === where.productId_collectionId.productId &&
                item.collectionId === where.productId_collectionId.collectionId,
            );
            if (!row) return null;
            assertUniqueSort(working.membership, row, data.sortOrder, false);
            row.sortOrder = data.sortOrder;
            return row;
          },
        ),
        findMany: jest.fn(async ({ where }: { where: { collectionId: string } }) =>
          working.membership
            .filter((row) => row.collectionId === where.collectionId)
            .slice()
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder || a.productId.localeCompare(b.productId),
            )
            .map((row) => ({
              ...row,
              product: { slug: SLUG_BY_ID[row.productId] ?? row.productId },
            })),
        ),
      },
      collection: {
        findUnique: jest.fn(async () => {
          const base = collectionWithMembers();
          return {
            ...base,
            products: base.products.map((pc) => ({
              ...pc,
              sortOrder:
                working.membership.find((row) => row.productId === pc.productId)?.sortOrder ??
                pc.sortOrder,
            })),
          };
        }),
      },
      collectionGenderOrder: {
        deleteMany: jest.fn(async ({ where }: { where: { collectionId: string } }) => {
          working.genderOrders = working.genderOrders.filter(
            (row) => row.collectionId !== where.collectionId,
          );
          return { count: 0 };
        }),
        createMany: jest.fn(async ({ data }: { data: OrderStore['genderOrders'] }) => {
          if (opts.throwOnGenderCreate) throw new Error('derived copy failed');
          working.genderOrders.push(...data);
          return { count: data.length };
        }),
        findMany: jest.fn(async ({ where }: { where: { collectionId: string } }) =>
          working.genderOrders.filter((row) => row.collectionId === where.collectionId),
        ),
        create: jest.fn(async ({ data }: { data: OrderStore['genderOrders'][number] }) => {
          if (opts.throwOnGenderCreate) throw new Error('derived copy failed');
          working.genderOrders.push(data);
          return data;
        }),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: {
              collectionId_gender_productId: {
                collectionId: string;
                gender: string;
                productId: string;
              };
            };
            data: { sortOrder: number };
          }) => {
            const row = working.genderOrders.find(
              (item) =>
                item.collectionId === where.collectionId_gender_productId.collectionId &&
                item.gender === where.collectionId_gender_productId.gender &&
                item.productId === where.collectionId_gender_productId.productId,
            );
            if (!row) return null;
            assertUniqueSort(working.genderOrders, row, data.sortOrder, true);
            row.sortOrder = data.sortOrder;
            return row;
          },
        ),
        delete: jest.fn(
          async ({
            where,
          }: {
            where: {
              collectionId_gender_productId: {
                collectionId: string;
                gender: string;
                productId: string;
              };
            };
          }) => {
            working.genderOrders = working.genderOrders.filter(
              (row) =>
                !(
                  row.collectionId === where.collectionId_gender_productId.collectionId &&
                  row.gender === where.collectionId_gender_productId.gender &&
                  row.productId === where.collectionId_gender_productId.productId
                ),
            );
            return { count: 1 };
          },
        ),
      },
      product: {
        findMany: productFindMany,
        findUnique: jest.fn(async ({ where }: { where: { slug?: string; id?: string } }) => {
          const products = await productFindMany();
          return (
            products.find(
              (item: { id: string; slug: string }) =>
                item.slug === where.slug || item.id === where.id,
            ) ?? null
          );
        }),
      },
    };
  }

  const prisma = {
    collection: {
      findUnique: jest.fn().mockResolvedValue(collectionWithMembers()),
    },
    product: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (fn: (t: ReturnType<typeof txFor>) => Promise<unknown>) => {
      const working = snapshotStore(store);
      const result = await fn(txFor(working));
      store.membership = working.membership;
      store.genderOrders = working.genderOrders;
      return result;
    }),
  };
  return { service: new AdminCollectionsService(prisma as never), prisma, store, productFindMany };
}
