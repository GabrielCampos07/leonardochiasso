import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { CacheInvalidationInterceptor } from './cache-invalidation.interceptor';
import { CatalogCacheService } from './catalog-cache.service';

function ctxFor(method: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method }) }),
  } as unknown as ExecutionContext;
}

const next: CallHandler = { handle: () => of({ ok: true }) };

describe('CacheInvalidationInterceptor', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'limpa o cache após %s bem-sucedido',
    async (method) => {
      const cache = new CatalogCacheService();
      const clear = jest.spyOn(cache, 'clear');
      const interceptor = new CacheInvalidationInterceptor(cache);

      await lastValueFrom(interceptor.intercept(ctxFor(method), next));

      expect(clear).toHaveBeenCalledTimes(1);
    },
  );

  it('não limpa o cache em GET', async () => {
    const cache = new CatalogCacheService();
    const clear = jest.spyOn(cache, 'clear');
    const interceptor = new CacheInvalidationInterceptor(cache);

    await lastValueFrom(interceptor.intercept(ctxFor('GET'), next));

    expect(clear).not.toHaveBeenCalled();
  });
});
