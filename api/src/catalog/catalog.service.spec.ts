import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import {
  CatalogService,
  compareMembershipSortOrder,
  publicCollectionWhere,
  publicProductWhere,
} from './catalog.service';

describe('CatalogService public archive filters', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    collection: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const cache = new CatalogCacheService();
  const service = new CatalogService(prisma as never, cache);

  beforeEach(() => {
    jest.clearAllMocks();
    cache.clear();
  });

  it('lists only published, non-archived products', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    await service.listProducts();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [publicProductWhere] },
      }),
    );
  });

  it('404s an archived product PDP', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.getProductBySlug('vestido')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'vestido', ...publicProductWhere },
      }),
    );
  });

  it('adds the catalog cover for Organic when the list has no member photos', async () => {
    prisma.collection.findMany.mockResolvedValue([
      {
        id: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad',
        slug: 'organic-dreams',
        name: 'Organic Dreams',
        description: null,
        sortOrder: 1,
        publishedAt: new Date('2026-08-22T01:51:56.219Z'),
        archivedAt: null,
        products: [],
      },
    ]);
    const list = await service.listCollections();
    expect(list[0]?.coverImage).toContain('plp-calca-thumb.webp');
  });

  it('adds coverImage from the first live member photo on the public list', async () => {
    prisma.collection.findMany.mockResolvedValue([
      {
        id: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad',
        slug: 'organic-dreams',
        name: 'Organic Dreams',
        description: null,
        sortOrder: 1,
        publishedAt: new Date('2026-08-22T01:51:56.219Z'),
        archivedAt: null,
        products: [
          {
            sortOrder: 0,
            product: {
              archivedAt: null,
              media: [
                {
                  sortOrder: 0,
                  isPrimary: true,
                  mediaAsset: {
                    cdnUrl:
                      'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-calca-thumb.webp',
                  },
                },
              ],
            },
          },
        ],
      },
    ]);
    const list = await service.listCollections();
    expect(list[0]?.coverImage).toContain('plp-calca-thumb.webp');
  });

  it('hides archived collections from the public list and detail', async () => {
    prisma.collection.findMany.mockResolvedValue([]);
    await service.listCollections();
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: publicCollectionWhere }),
    );

    prisma.collection.findFirst.mockResolvedValue(null);
    await expect(service.getCollectionBySlug('organic-dreams')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'organic-dreams', ...publicCollectionWhere },
      }),
    );
  });
});

describe('CatalogService gender blocks', () => {
  function product(over: Record<string, unknown>) {
    return {
      id: 'p',
      slug: 'p',
      name: 'P',
      description: '',
      details: [],
      shippingCopy: null,
      priceCents: 100,
      currency: 'BRL',
      color: null,
      size: null,
      fabric: null,
      season: null,
      status: ProductStatus.published,
      stockQty: 1,
      categoryId: 'c',
      pieces: [],
      colorVariants: [],
      imageBindings: [],
      artCouture: false,
      recommendOrder: 0,
      archivedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      collections: [],
      media: [],
      ...over,
    };
  }

  function make() {
    const prisma = {
      product: { findMany: jest.fn(), findFirst: jest.fn() },
      collection: { findMany: jest.fn(), findFirst: jest.fn() },
    };
    const cache = new CatalogCacheService();
    const service = new CatalogService(prisma as never, cache);
    return { prisma, service, cache };
  }

  it('lists the store as feminino+unissex then masculino by recommendOrder', async () => {
    const { prisma, service } = make();
    prisma.product.findMany.mockResolvedValue([
      product({
        id: 'm1',
        slug: 'm1',
        recommendOrder: 1,
        category: { slug: 'masculino' },
      }),
      product({
        id: 'u1',
        slug: 'u1',
        recommendOrder: 5,
        category: { slug: 'unissex' },
      }),
      product({
        id: 'f1',
        slug: 'f1',
        recommendOrder: 10,
        category: { slug: 'feminino' },
      }),
    ]);

    const list = await service.listProducts();
    expect(list.map((p) => p.id)).toEqual(['u1', 'f1', 'm1']);
    expect(list.map((p) => p.gender)).toEqual(['unissex', 'feminino', 'masculino']);
  });

  it('gender filter includes unissex on both hubs', async () => {
    const { prisma, service, cache } = make();
    prisma.product.findMany.mockResolvedValue([]);

    await service.listProducts('masculino');
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { slug: { in: ['masculino', 'unissex'] } },
        }),
      }),
    );

    cache.clear();
    await service.listProducts('feminino');
    expect(prisma.product.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { slug: { in: ['feminino', 'unissex'] } },
        }),
      }),
    );
  });

  it('collection detail follows product_collections.sortOrder, not genderOrders', async () => {
    const { prisma, service } = make();
    const f1 = product({
      id: 'f1',
      slug: 'teste-plumaria',
      category: { slug: 'feminino' },
    });
    const u1 = product({
      id: 'u1',
      slug: 'teste-uni',
      category: { slug: 'unissex' },
    });
    const m1 = product({
      id: 'm1',
      slug: 'teste-calca',
      category: { slug: 'masculino' },
    });
    prisma.collection.findFirst.mockResolvedValue({
      id: 'col-teste',
      slug: 'teste-ordem',
      name: 'TESTE-ORDEM',
      description: null,
      sortOrder: 1,
      publishedAt: new Date('2026-01-01'),
      archivedAt: null,
      products: [
        { productId: 'f1', sortOrder: 0, product: f1 },
        { productId: 'm1', sortOrder: 1, product: m1 },
        { productId: 'u1', sortOrder: 2, product: u1 },
      ],
      genderOrders: [
        { productId: 'm1', gender: 'masculino', sortOrder: 0 },
        { productId: 'u1', gender: 'feminino', sortOrder: 0 },
        { productId: 'f1', gender: 'feminino', sortOrder: 1 },
      ],
    });

    const detail = await service.getCollectionBySlug('teste-ordem');
    expect(detail.products.map((p) => p.slug)).toEqual([
      'teste-plumaria',
      'teste-calca',
      'teste-uni',
    ]);
  });

  it('?collection lists by membership sortOrder, ignoring recommendOrder', async () => {
    const { prisma, service } = make();
    prisma.product.findMany.mockResolvedValue([
      product({
        id: 'calca',
        slug: 'teste-calca',
        recommendOrder: 0,
        category: { slug: 'masculino' },
        collections: [
          {
            collection: { slug: 'teste-ordem', name: 'TESTE', archivedAt: null },
            sortOrder: 1,
          },
        ],
      }),
      product({
        id: 'plumaria',
        slug: 'teste-plumaria',
        recommendOrder: 9,
        category: { slug: 'feminino' },
        collections: [
          {
            collection: { slug: 'teste-ordem', name: 'TESTE', archivedAt: null },
            sortOrder: 0,
          },
        ],
      }),
    ]);

    const list = await service.listProducts(undefined, 'teste-ordem');
    expect(list.map((p) => p.slug)).toEqual(['teste-plumaria', 'teste-calca']);
  });

  it('compareMembershipSortOrder ties on productId', () => {
    const left = {
      id: 'id-z',
      collections: [{ slug: 'teste-ordem', sortOrder: 2 }],
    };
    const right = {
      id: 'id-a',
      collections: [{ slug: 'teste-ordem', sortOrder: 2 }],
    };
    expect(compareMembershipSortOrder(left, right, 'teste-ordem')).toBeGreaterThan(0);
    expect(compareMembershipSortOrder(right, left, 'teste-ordem')).toBeLessThan(0);
  });

  it('breaks a membership sortOrder tie on productId', async () => {
    const { prisma, service } = make();
    prisma.product.findMany.mockResolvedValue([
      product({
        id: 'id-teste-z',
        slug: 'teste-z',
        category: { slug: 'feminino' },
        collections: [{ collection: { slug: 'teste-ordem', name: 'TESTE', archivedAt: null }, sortOrder: 1 }],
      }),
      product({
        id: 'id-teste-a',
        slug: 'teste-a',
        category: { slug: 'feminino' },
        collections: [{ collection: { slug: 'teste-ordem', name: 'TESTE', archivedAt: null }, sortOrder: 1 }],
      }),
      product({
        id: 'id-teste-m',
        slug: 'teste-m',
        category: { slug: 'feminino' },
        collections: [{ collection: { slug: 'teste-ordem', name: 'TESTE', archivedAt: null }, sortOrder: 0 }],
      }),
    ]);

    const list = await service.listProducts(undefined, 'teste-ordem');
    expect(list.map((p) => p.id)).toEqual(['id-teste-m', 'id-teste-a', 'id-teste-z']);
  });

  it('asks Prisma for sortOrder then productId on the public collection include', async () => {
    const { prisma, service } = make();
    prisma.collection.findFirst.mockResolvedValue(null);
    await expect(service.getCollectionBySlug('teste-ordem')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          products: expect.objectContaining({
            orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
          }),
        }),
      }),
    );
  });
});

describe('CatalogService (cache)', () => {
  function make() {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      product: { findMany, findFirst: jest.fn() },
      collection: { findMany, findFirst: jest.fn() },
    } as any;
    const cache = new CatalogCacheService().withTtl(60_000);
    const service = new CatalogService(prisma, cache);
    return { service, prisma, cache, findMany };
  }

  it('segunda chamada de listProducts vem do cache (sem novo hit no Prisma)', async () => {
    const { service, prisma } = make();
    await service.listProducts();
    await service.listProducts();
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
  });

  it('após clear(), listProducts volta a consultar o Prisma', async () => {
    const { service, prisma, cache } = make();
    await service.listProducts();
    cache.clear();
    await service.listProducts();
    expect(prisma.product.findMany).toHaveBeenCalledTimes(2);
  });

  it('listCollections também é cacheado', async () => {
    const { service, prisma } = make();
    await service.listCollections();
    await service.listCollections();
    expect(prisma.collection.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('CatalogService public visibility (collection must be published)', () => {
  const prisma = {
    product: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    collection: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
  };
  const cache = new CatalogCacheService();
  const service = new CatalogService(prisma as never, cache);
  beforeEach(() => {
    jest.clearAllMocks();
    cache.clear();
  });

  it('public collection requires publishedAt and no archivedAt', () => {
    expect(publicCollectionWhere).toEqual({ publishedAt: { not: null }, archivedAt: null });
  });

  it('public product requires a published collection when it has collections', () => {
    expect(publicProductWhere).toEqual({
      status: ProductStatus.published,
      archivedAt: null,
      OR: [
        { collections: { none: {} } },
        { collections: { some: { collection: publicCollectionWhere } } },
      ],
    });
  });

  it('?collection filters by that published collection, with its own cache key', async () => {
    await service.listProducts(undefined, 'Organic-Dreams');
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            publicProductWhere,
            {
              collections: {
                some: { collection: { ...publicCollectionWhere, slug: 'organic-dreams' } },
              },
            },
          ],
        },
      }),
    );
    await service.listProducts();
    expect(prisma.product.findMany).toHaveBeenCalledTimes(2);
  });
});
