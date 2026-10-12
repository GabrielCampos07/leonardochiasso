import { Global, Module } from '@nestjs/common';
import { CacheInvalidationInterceptor } from './cache-invalidation.interceptor';
import { CatalogCacheService } from './catalog-cache.service';

/**
 * Global: expõe o CatalogCacheService ao catálogo (leitura) e ao admin
 * (invalidação via interceptor), sem Redis nem infra nova.
 */
@Global()
@Module({
  providers: [CatalogCacheService, CacheInvalidationInterceptor],
  exports: [CatalogCacheService, CacheInvalidationInterceptor],
})
export class CatalogCacheModule {}
