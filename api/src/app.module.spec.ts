import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminCollectionsService } from './admin/admin-collections.service';
import { AdminProductsService } from './admin/admin-products.service';
import { AppModule } from './app.module';
import { CacheInvalidationInterceptor } from './cache/cache-invalidation.interceptor';
import { CatalogCacheService } from './cache/catalog-cache.service';
import { CatalogService } from './catalog/catalog.service';
import { ContentService } from './content/content.service';
import { PrismaService } from './prisma/prisma.service';

/**
 * Full-graph DI boot: if any provider cannot be resolved (the CatalogCacheService
 * primitive-constructor 502, or a new archive provider with the same bug),
 * `.compile()` / `.init()` throws here instead of in production.
 */
describe('AppModule DI boot', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) await app.close();
    app = undefined;
  });

  it('compiles AppModule and resolves every provider', async () => {
    const prisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    expect(moduleRef.get(CatalogCacheService)).toBeInstanceOf(CatalogCacheService);
    expect(moduleRef.get(CatalogService)).toBeInstanceOf(CatalogService);
    expect(moduleRef.get(AdminProductsService)).toBeInstanceOf(AdminProductsService);
    expect(moduleRef.get(AdminCollectionsService)).toBeInstanceOf(
      AdminCollectionsService,
    );
    expect(moduleRef.get(ContentService)).toBeInstanceOf(ContentService);
    expect(moduleRef.get(CacheInvalidationInterceptor)).toBeInstanceOf(
      CacheInvalidationInterceptor,
    );

    app = moduleRef.createNestApplication();
    await app.init();
  });
});
