import { adminListCacheKey, clearAdminListCache, writeAdminCache } from './admin-list-cache';
import {
  ADMIN_PRODUCTS_VIEW_KEY,
  clearAdminProductsView,
  readAdminProductsView,
  writeAdminProductsView,
} from './admin-products-view';

describe('admin products view', () => {
  beforeEach(() => {
    clearAdminListCache();
    sessionStorage.clear();
  });

  afterEach(() => {
    clearAdminListCache();
    sessionStorage.clear();
  });

  it('round-trips search and Arquivados so CANCELAR can return to the same Lista', () => {
    writeAdminProductsView({
      query: 'mosaico',
      category: 'feminino',
      collection: 'Organic Dreams',
      showArchived: true,
    });
    expect(readAdminProductsView()).toEqual({
      query: 'mosaico',
      category: 'feminino',
      collection: 'Organic Dreams',
      showArchived: true,
    });
    expect(adminListCacheKey('products', true)).toBe('products:archived');
    clearAdminProductsView();
    expect(readAdminProductsView()).toEqual({
      query: '',
      category: 'todos',
      collection: 'todas',
      showArchived: false,
    });
  });

  it('ignores a corrupt cache entry', () => {
    writeAdminCache(ADMIN_PRODUCTS_VIEW_KEY, { query: 12, category: 'nope', showArchived: 'yes' });
    expect(readAdminProductsView()).toEqual({
      query: '',
      category: 'todos',
      collection: 'todas',
      showArchived: false,
    });
  });
});
