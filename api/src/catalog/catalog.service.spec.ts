import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import { CatalogService } from './catalog.service';

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
        where: { status: ProductStatus.published, archivedAt: null },
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
        where: {
          slug: 'vestido',
          status: ProductStatus.published,
          archivedAt: null,
        },
      }),
    );
  });

  it('hides archived collections from the public list and detail', async () => {
    prisma.collection.findMany.mockResolvedValue([]);
    await service.listCollections();
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: null } }),
    );

    prisma.collection.findFirst.mockResolvedValue(null);
    await expect(service.getCollectionBySlug('organic-dreams')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'organic-dreams', archivedAt: null },
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
