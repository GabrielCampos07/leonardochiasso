import { GenderFilter } from './product-gender';
import { readAdminCache, writeAdminCache } from './admin-list-cache';

export const ADMIN_PRODUCTS_VIEW_KEY = 'products-view';

export type AdminProductsView = {
  query: string;
  category: GenderFilter;
  collection: string;
  showArchived: boolean;
};

const EMPTY: AdminProductsView = {
  query: '',
  category: 'todos',
  collection: 'todas',
  showArchived: false,
};

function isGenderFilter(value: unknown): value is GenderFilter {
  return value === 'todos' || value === 'feminino' || value === 'masculino';
}

export function readAdminProductsView(): AdminProductsView {
  const stored = readAdminCache<Partial<AdminProductsView>>(ADMIN_PRODUCTS_VIEW_KEY);
  if (!stored || typeof stored !== 'object') return { ...EMPTY };
  return {
    query: typeof stored.query === 'string' ? stored.query : EMPTY.query,
    category: isGenderFilter(stored.category) ? stored.category : EMPTY.category,
    collection: typeof stored.collection === 'string' && stored.collection ? stored.collection : EMPTY.collection,
    showArchived: stored.showArchived === true,
  };
}

export function writeAdminProductsView(view: AdminProductsView): void {
  writeAdminCache(ADMIN_PRODUCTS_VIEW_KEY, view);
}

export function clearAdminProductsView(): void {
  writeAdminCache(ADMIN_PRODUCTS_VIEW_KEY, { ...EMPTY });
}
