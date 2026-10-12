import { CatalogCacheService } from '../cache/catalog-cache.service';
import { CatalogService } from './catalog.service';

describe('CatalogService (cache)', () => {
  function make() {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      product: { findMany, findFirst: jest.fn() },
      collection: { findMany, findUnique: jest.fn() },
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
