import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { AdminProductsService } from './admin-products.service';

function productRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'vestido',
    name: 'Vestido',
    description: '',
    details: [],
    shippingCopy: null,
    priceCents: 720000,
    currency: 'BRL',
    color: null,
    size: null,
    fabric: null,
    season: null,
    status: ProductStatus.published,
    stockQty: 2,
    categoryId: 'c1',
    pieces: [],
    colorVariants: [],
    imageBindings: [],
    artCouture: false,
    recommendOrder: 0,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { slug: 'feminino' },
    collections: [],
    media: [],
    ...over,
  };
}

describe('AdminProductsService archive', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new AdminProductsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists live products by default and archived when asked', async () => {
    prisma.product.findMany.mockResolvedValue([productRow()]);
    await service.list(false);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: null } }),
    );

    prisma.product.findMany.mockResolvedValue([
      productRow({ archivedAt: new Date('2026-10-12T12:00:00Z') }),
    ]);
    const archived = await service.list(true);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: { not: null } } }),
    );
    expect(archived[0]?.archivedAt).toBe('2026-10-12T12:00:00.000Z');
  });

  it('archives without deleting the product', async () => {
    const now = new Date('2026-10-12T15:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', slug: 'vestido' });
    prisma.product.update.mockResolvedValue(
      productRow({ archivedAt: now }),
    );

    const dto = await service.archive('vestido');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'vestido' },
        data: { archivedAt: now },
      }),
    );
    expect(dto.archivedAt).toBe(now.toISOString());
    expect(prisma.product.findUnique).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('restores by clearing archivedAt', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', slug: 'vestido' });
    prisma.product.update.mockResolvedValue(productRow({ archivedAt: null }));
    const dto = await service.restore('vestido');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'vestido' },
        data: { archivedAt: null },
      }),
    );
    expect(dto.archivedAt).toBeNull();
  });

  it('404s when the slug is missing', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.archive('sumiu')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

describe('AdminProductsService create (otimizado, lookups em paralelo)', () => {
  function makePrisma() {
    return {
      category: { findUnique: jest.fn() },
      collection: { findUnique: jest.fn() },
      product: { findUnique: jest.fn(), create: jest.fn() },
      productCollection: { aggregate: jest.fn() },
      collectionGenderOrder: { groupBy: jest.fn().mockResolvedValue([]) },
    };
  }
  const dto = {
    name: 'Vestido',
    slug: 'vestido',
    category: 'feminino',
    collectionSlug: 'verao',
    priceCents: 720000,
  } as never;

  it('cria com link de coleção em um único nested create (sortOrder = max+1)', async () => {
    const prisma = makePrisma();
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', slug: 'feminino' });
    prisma.collection.findUnique.mockResolvedValue({ id: 'col1', slug: 'verao' });
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.productCollection.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
    prisma.product.create.mockResolvedValue(productRow());

    const service = new AdminProductsService(prisma as never);
    await service.create(dto);

    // aggregate filtrado pela relação (não depende do id da coleção)
    expect(prisma.productCollection.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collection: { slug: 'verao' } } }),
    );
    // único create aninhado com o link e sortOrder = 4 + 1
    expect(prisma.product.create).toHaveBeenCalledTimes(1);
    const arg = prisma.product.create.mock.calls[0][0];
    expect(arg.data.collections.create).toEqual(
      expect.objectContaining({ collectionId: 'col1', sortOrder: 5 }),
    );
    expect(arg.data.genderOrders.create).toEqual([
      { collectionId: 'col1', gender: 'feminino', sortOrder: 0 },
    ]);
  });

  it('unissex entra nas duas listas de gênero da coleção', async () => {
    const prisma = makePrisma();
    prisma.category.findUnique.mockResolvedValue({ id: 'c3', slug: 'unissex' });
    prisma.collection.findUnique.mockResolvedValue({ id: 'col1', slug: 'verao' });
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.productCollection.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    prisma.collectionGenderOrder.groupBy.mockResolvedValue([
      { gender: 'feminino', _max: { sortOrder: 2 } },
      { gender: 'masculino', _max: { sortOrder: 1 } },
    ]);
    prisma.product.create.mockResolvedValue(productRow({ category: { slug: 'unissex' } }));

    const service = new AdminProductsService(prisma as never);
    await service.create({ ...dto, category: 'unissex' });

    const arg = prisma.product.create.mock.calls[0][0];
    expect(arg.data.genderOrders.create).toEqual([
      { collectionId: 'col1', gender: 'feminino', sortOrder: 3 },
      { collectionId: 'col1', gender: 'masculino', sortOrder: 2 },
    ]);
  });

  it('mantém a ordem dos erros: categoria desconhecida primeiro', async () => {
    const prisma = makePrisma();
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.collection.findUnique.mockResolvedValue(null);
    prisma.product.findUnique.mockResolvedValue({ id: 'dup' });
    prisma.productCollection.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
    const service = new AdminProductsService(prisma as never);
    await expect(service.create(dto)).rejects.toThrow('Unknown category: feminino');
  });

  it('coleção desconhecida quando a categoria existe', async () => {
    const prisma = makePrisma();
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.collection.findUnique.mockResolvedValue(null);
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.productCollection.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
    const service = new AdminProductsService(prisma as never);
    await expect(service.create(dto)).rejects.toThrow('Unknown collection: verao');
  });

  it('conflito de slug quando categoria e coleção existem', async () => {
    const prisma = makePrisma();
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.collection.findUnique.mockResolvedValue({ id: 'col1' });
    prisma.product.findUnique.mockResolvedValue({ id: 'dup', slug: 'vestido' });
    prisma.productCollection.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    const service = new AdminProductsService(prisma as never);
    await expect(service.create(dto)).rejects.toThrow('Product slug already exists: vestido');
  });
});

describe('AdminProductsService update (membership join)', () => {
  const COL_OD = 'col-od';
  const COL_NP = 'col-np';

  function loadedProduct(over: Record<string, unknown> = {}) {
    return {
      id: 'p1',
      slug: 'vestido',
      category: { id: 'c1', slug: 'feminino' },
      collections: [
        {
          productId: 'p1',
          collectionId: COL_OD,
          sortOrder: 4,
          collection: { slug: 'organic-dreams' },
        },
      ],
      ...over,
    };
  }

  function makePrisma() {
    const prisma = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      category: { findUnique: jest.fn() },
      collection: { findUnique: jest.fn() },
      productCollection: {
        update: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn(),
        deleteMany: jest.fn(),
      },
      collectionGenderOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    return prisma;
  }

  function queryCount(prisma: ReturnType<typeof makePrisma>): number {
    return (
      prisma.product.findUnique.mock.calls.length +
      prisma.product.update.mock.calls.length +
      prisma.category.findUnique.mock.calls.length +
      prisma.collection.findUnique.mock.calls.length +
      prisma.productCollection.update.mock.calls.length +
      prisma.productCollection.create.mock.calls.length +
      prisma.productCollection.aggregate.mock.calls.length +
      prisma.productCollection.deleteMany.mock.calls.length +
      prisma.collectionGenderOrder.findMany.mock.calls.length +
      prisma.collectionGenderOrder.deleteMany.mock.calls.length +
      prisma.collectionGenderOrder.aggregate.mock.calls.length +
      prisma.collectionGenderOrder.create.mock.calls.length +
      prisma.$transaction.mock.calls.length
    );
  }

  it('editing the name does not touch product_collections or sortOrder (2 queries)', async () => {
    // Before: name save sent collectionSlug+category → findUnique, category,
    // collection, aggregate, deleteMany, create, product.update, sync findUnique,
    // sync findMany = 9. After: findUnique + product.update = 2.
    const prisma = makePrisma();
    prisma.product.findUnique.mockResolvedValue(loadedProduct());
    prisma.product.update.mockResolvedValue(
      productRow({
        name: 'Vestido editado',
        collections: [
          {
            sortOrder: 4,
            collection: { slug: 'organic-dreams', name: 'Organic Dreams', archivedAt: null },
          },
        ],
      }),
    );
    const service = new AdminProductsService(prisma as never);
    const dto = await service.update('vestido', { name: 'Vestido editado' } as never);

    expect(dto.name).toBe('Vestido editado');
    expect(prisma.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(prisma.productCollection.create).not.toHaveBeenCalled();
    expect(prisma.productCollection.update).not.toHaveBeenCalled();
    expect(prisma.productCollection.aggregate).not.toHaveBeenCalled();
    expect(prisma.collection.findUnique).not.toHaveBeenCalled();
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
    expect(prisma.collectionGenderOrder.findMany).not.toHaveBeenCalled();
    expect(queryCount(prisma)).toBe(2);
    expect(prisma.product.update.mock.calls[0][0].data).toEqual({ name: 'Vestido editado' });
  });

  it('skips the join write when collectionSlug and category are unchanged', async () => {
    const prisma = makePrisma();
    prisma.product.findUnique.mockResolvedValue(loadedProduct());
    prisma.product.update.mockResolvedValue(productRow());
    const service = new AdminProductsService(prisma as never);
    await service.update('vestido', {
      name: 'Mesmo',
      category: 'feminino',
      collectionSlug: 'organic-dreams',
    } as never);

    expect(prisma.collection.findUnique).not.toHaveBeenCalled();
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
    expect(prisma.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(prisma.productCollection.update).not.toHaveBeenCalled();
    expect(prisma.collectionGenderOrder.findMany).not.toHaveBeenCalled();
    expect(queryCount(prisma)).toBe(2);
  });

  it('changing the collection updates one row and never deletes', async () => {
    const prisma = makePrisma();
    prisma.product.findUnique
      .mockResolvedValueOnce(loadedProduct())
      .mockResolvedValueOnce({
        id: 'p1',
        category: { slug: 'feminino' },
        collections: [{ collectionId: COL_NP }],
      });
    prisma.collection.findUnique.mockResolvedValue({ id: COL_NP, slug: 'niponic-dreams' });
    prisma.productCollection.update.mockResolvedValue({
      productId: 'p1',
      collectionId: COL_NP,
      sortOrder: 4,
    });
    prisma.product.update.mockResolvedValue(
      productRow({
        collections: [
          {
            sortOrder: 4,
            collection: { slug: 'niponic-dreams', name: 'Niponic Dreams', archivedAt: null },
          },
        ],
      }),
    );
    const service = new AdminProductsService(prisma as never);
    await service.update('vestido', { collectionSlug: 'niponic-dreams' } as never);

    expect(prisma.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(prisma.productCollection.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.productCollection.update).toHaveBeenCalledTimes(1);
    expect(prisma.productCollection.update).toHaveBeenCalledWith({
      where: {
        productId_collectionId: { productId: 'p1', collectionId: COL_OD },
      },
      data: { collectionId: COL_NP, sortOrder: 4 },
    });
    expect(prisma.productCollection.aggregate).not.toHaveBeenCalled();
  });
});
