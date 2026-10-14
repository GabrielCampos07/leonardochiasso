import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
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
      delete: jest.fn(),
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

  it('hard-deletes an archived product by slug', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      slug: 'vestido',
      archivedAt: new Date('2026-10-14T00:00:00Z'),
    });
    prisma.product.delete.mockResolvedValue({ id: 'p1' });
    await service.remove('vestido');
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('409s when deleting a live product', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      slug: 'vestido',
      archivedAt: null,
    });
    await expect(service.remove('vestido')).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'Arquive a peça antes de excluí-la.',
    });
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it('409s when an archived product is still on an order', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      slug: 'vestido',
      archivedAt: new Date('2026-10-14T00:00:00Z'),
    });
    prisma.product.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        code: 'P2003',
        clientVersion: '6.19.3',
      }),
    );
    await expect(service.remove('vestido')).rejects.toMatchObject({
      constructor: ConflictException,
      message: 'Esta peça está em um pedido e não pode ser excluída.',
    });
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
