import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogController } from '../catalog/catalog.controller';
import { CatalogService } from '../catalog/catalog.service';
import { CatalogCacheModule } from './catalog-cache.module';
import { CatalogCacheService } from './catalog-cache.service';
import { CacheInvalidationInterceptor } from './cache-invalidation.interceptor';

/**
 * Teste de boot de DI: compila o módulo real como o Nest faz em produção.
 * Se o CatalogCacheService tivesse um primitivo injetável no construtor (o bug
 * que derrubou a API), este `.compile()` lançaria aqui — não só em runtime.
 */
describe('CatalogCache DI boot', () => {
  it('compila o módulo e resolve os providers (sem erro de DI)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatalogCacheModule],
      controllers: [CatalogController],
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(CatalogCacheService)).toBeInstanceOf(CatalogCacheService);
    expect(moduleRef.get(CatalogService)).toBeInstanceOf(CatalogService);
    expect(moduleRef.get(CacheInvalidationInterceptor)).toBeInstanceOf(
      CacheInvalidationInterceptor,
    );
    await moduleRef.close();
  });
});
