import {
  ADMIN_LIST_CACHE_PREFIX,
  adminListCacheKey,
  clearAdminListCache,
  readAdminCache,
  readAdminListCache,
  shouldRequestPublicCollection,
  writeAdminCache,
  writeAdminListCache,
} from './admin-list-cache';

describe('admin list cache', () => {
  beforeEach(() => {
    clearAdminListCache();
    sessionStorage.clear();
  });

  afterEach(() => {
    clearAdminListCache();
    sessionStorage.clear();
  });

  it('returns the last list from memory, then sessionStorage', () => {
    const key = adminListCacheKey('products', false);
    writeAdminListCache(key, [{ slug: 'a' }]);
    expect(readAdminListCache<{ slug: string }>(key)).toEqual([{ slug: 'a' }]);

    clearAdminListCache();
    sessionStorage.setItem(ADMIN_LIST_CACHE_PREFIX + key, JSON.stringify([{ slug: 'b' }]));
    expect(readAdminListCache<{ slug: string }>(key)).toEqual([{ slug: 'b' }]);
  });

  it('stores collection detail for an instant reopen', () => {
    const key = adminListCacheKey('collection-detail', 'teste-ordem');
    writeAdminCache(key, { slug: 'teste-ordem', products: [{ slug: 'a' }] });
    expect(readAdminCache<{ slug: string; products: { slug: string }[] }>(key)?.products[0]?.slug).toBe(
      'a',
    );
  });
});

describe('shouldRequestPublicCollection', () => {
  it('never requests the public catalog from admin (drafts and archived 404)', () => {
    expect(shouldRequestPublicCollection({ archivedAt: '2026-10-12T12:00:00.000Z' })).toBeFalse();
    expect(shouldRequestPublicCollection({ archivedAt: null, publishedAt: null })).toBeFalse();
    expect(shouldRequestPublicCollection({ archivedAt: null, publishedAt: '2026-01-01T00:00:00.000Z' })).toBeFalse();
    expect(shouldRequestPublicCollection(null)).toBeFalse();
  });
});
