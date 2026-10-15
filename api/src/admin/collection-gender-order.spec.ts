import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

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
    const tx = {
      collectionGenderOrder: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      productCollection: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      collection: {
        findUnique: jest.fn().mockResolvedValue(collectionWithMembers()),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
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
    expect(tx.productCollection.update).toHaveBeenCalledTimes(3);
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(1, {
      where: { productId_collectionId: { productId: FEM, collectionId: 'col-teste' } },
      data: { sortOrder: 0 },
    });
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(2, {
      where: { productId_collectionId: { productId: MAS, collectionId: 'col-teste' } },
      data: { sortOrder: 1 },
    });
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(3, {
      where: { productId_collectionId: { productId: UNI, collectionId: 'col-teste' } },
      data: { sortOrder: 2 },
    });
    expect(tx.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste' },
    });
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

  it('keepMissing merges live slugs and rewrites the copy in the same transaction', async () => {
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
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.productCollection.findMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste' },
      orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
      include: { product: { select: { slug: true } } },
    });
    expect(tx.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.productCollection.createMany).not.toHaveBeenCalled();
    expect(tx.productCollection.update).toHaveBeenCalledTimes(4);
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(1, {
      where: { productId_collectionId: { productId: 'id-arquivo', collectionId: 'col-teste' } },
      data: { sortOrder: 0 },
    });
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(2, {
      where: { productId_collectionId: { productId: 'id-c', collectionId: 'col-teste' } },
      data: { sortOrder: 1 },
    });
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(3, {
      where: { productId_collectionId: { productId: 'id-a', collectionId: 'col-teste' } },
      data: { sortOrder: 2 },
    });
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(4, {
      where: { productId_collectionId: { productId: 'id-b', collectionId: 'col-teste' } },
      data: { sortOrder: 3 },
    });
    expect(tx.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-teste' },
    });
    expect(tx.collectionGenderOrder.createMany).toHaveBeenCalled();
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
    expect(tx.productCollection.update).toHaveBeenCalledTimes(2);
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(1, {
      where: { productId_collectionId: { productId: 'id-b', collectionId: 'col-teste' } },
      data: { sortOrder: 0 },
    });
    expect(tx.productCollection.update).toHaveBeenNthCalledWith(2, {
      where: { productId_collectionId: { productId: 'id-a', collectionId: 'col-teste' } },
      data: { sortOrder: 2 },
    });
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

function snapshotStore(store: OrderStore): OrderStore {
  return {
    membership: store.membership.map((row) => ({ ...row })),
    genderOrders: store.genderOrders.map((row) => ({ ...row })),
  };
}

/** In-memory $transaction: commit only if the callback finishes. */
function makeTransactional(opts: { throwOnGenderCreate?: boolean } = {}) {
  const productFindMany = jest.fn().mockResolvedValue([]);
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
            if (row) row.sortOrder = data.sortOrder;
            return row;
          },
        ),
        findMany: jest.fn(async ({ where }: { where: { collectionId: string } }) =>
          working.membership.filter((row) => row.collectionId === where.collectionId),
        ),
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
      },
      product: { findMany: productFindMany },
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
