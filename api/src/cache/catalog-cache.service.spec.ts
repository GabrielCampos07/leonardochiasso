import { CatalogCacheService } from './catalog-cache.service';

describe('CatalogCacheService', () => {
  it('cacheia dentro do TTL (factory roda uma vez)', async () => {
    const cache = new CatalogCacheService().withTtl(60_000);
    const factory = jest.fn().mockResolvedValue('v1');

    const a = await cache.getOrSet('k', factory, 1_000);
    const b = await cache.getOrSet('k', factory, 30_000);

    expect(a).toBe('v1');
    expect(b).toBe('v1');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('recomputa depois que o TTL expira', async () => {
    const cache = new CatalogCacheService().withTtl(60_000);
    const factory = jest
      .fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');

    const a = await cache.getOrSet('k', factory, 1_000);
    const b = await cache.getOrSet('k', factory, 1_000 + 60_001);

    expect(a).toBe('v1');
    expect(b).toBe('v2');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('clear() força recomputo imediato', async () => {
    const cache = new CatalogCacheService().withTtl(60_000);
    const factory = jest
      .fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');

    const a = await cache.getOrSet('k', factory, 1_000);
    cache.clear();
    const b = await cache.getOrSet('k', factory, 1_000);

    expect(a).toBe('v1');
    expect(b).toBe('v2');
    expect(factory).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(1);
  });

  it('chaves distintas não colidem', async () => {
    const cache = new CatalogCacheService().withTtl(60_000);
    await cache.getOrSet('a', async () => 1, 0);
    await cache.getOrSet('b', async () => 2, 0);
    expect(cache.size).toBe(2);
  });
});
