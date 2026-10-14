import type { SceneCollectionInput, SceneProductInput } from '../../../scene-engine/types';

export const CATALOG_SNAPSHOT_KEY = 'lc.admin.3d.catalog.v2';
export const CATALOG_SNAPSHOT_VERSION = 2;
/** Short TTL — enough to paint racks on reload, then the API revalidates. */
export const CATALOG_SNAPSHOT_TTL_MS = 15 * 60 * 1000;

export interface CatalogSessionSnapshot {
  v: number;
  savedAt: number;
  collections: SceneCollectionInput[];
  products: SceneProductInput[];
  joias: SceneProductInput[];
}

export function leanSceneProduct(product: SceneProductInput): SceneProductInput {
  return {
    slug: product.slug,
    name: product.name,
    collectionSlug: product.collectionSlug,
    collectionSlugs: product.collectionSlugs,
    collectionOrders: product.collectionOrders,
    status: product.status,
    stockQty: product.stockQty,
    price: product.price,
    priceCents: product.priceCents,
    priceLabel: product.priceLabel,
    pieceKind: product.pieceKind,
    thumb: product.thumb ?? product.imageUrl ?? '',
    gallery: product.gallery?.slice(0, 1),
    imageUrl: product.imageUrl ?? product.thumb ?? null,
    archivedAt: product.archivedAt ?? null,
  };
}

export function catalogFingerprint(
  collections: ReadonlyArray<SceneCollectionInput>,
  products: ReadonlyArray<SceneProductInput>,
  joias: ReadonlyArray<SceneProductInput>,
): string {
  const cols = collections
    .map((c) => `${c.slug}|${c.name}|${c.sortOrder}|${c.archivedAt ?? ''}|${c.publishedAt === null ? 'unpublished' : ''}`)
    .join(';');
  const pieces = (rows: ReadonlyArray<SceneProductInput>) =>
    rows
      .map(
        (p) =>
          `${p.slug}|${p.thumb ?? p.imageUrl ?? ''}|${(p.collectionSlugs ?? []).join(',')}|${(p.collectionOrders ?? []).map((c) => `${c.slug}:${c.sortOrder}`).join(',')}|${p.archivedAt ?? ''}|${p.status ?? ''}|${p.stockQty ?? ''}`,
      )
      .join(';');
  return `${cols}#${pieces(products)}#${pieces(joias)}`;
}

function sessionStore(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function readCatalogSnapshot(
  now = Date.now(),
  storage?: Storage | null,
): CatalogSessionSnapshot | null {
  const store = sessionStore(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(CATALOG_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogSessionSnapshot;
    if (parsed?.v !== CATALOG_SNAPSHOT_VERSION) return null;
    if (!Number.isFinite(parsed.savedAt) || now - parsed.savedAt > CATALOG_SNAPSHOT_TTL_MS) return null;
    if (!Array.isArray(parsed.collections) || !Array.isArray(parsed.products) || !Array.isArray(parsed.joias)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCatalogSnapshot(
  payload: {
    collections: SceneCollectionInput[];
    products: SceneProductInput[];
    joias: SceneProductInput[];
  },
  storage?: Storage | null,
  now = Date.now(),
): boolean {
  const store = sessionStore(storage);
  if (!store) return false;
  const snap: CatalogSessionSnapshot = {
    v: CATALOG_SNAPSHOT_VERSION,
    savedAt: now,
    collections: payload.collections.map((c) => ({
      slug: c.slug,
      name: c.name,
      sortOrder: c.sortOrder,
      archivedAt: c.archivedAt ?? null,
      ...(c.publishedAt !== undefined ? { publishedAt: c.publishedAt } : {}),
    })),
    products: payload.products.map(leanSceneProduct),
    joias: payload.joias.map(leanSceneProduct),
  };
  try {
    store.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
}
