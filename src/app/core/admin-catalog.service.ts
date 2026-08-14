import { Injectable, signal } from '@angular/core';
import {
  COLLECTION_LABELS,
  Collection,
  Product,
  ProductColor,
  ProductPiece,
  SWATCH,
  formatPriceLabel,
} from './product.model';
import { PRODUCTS } from './products';
import { COLLECTION_SLUGS, CollectionSlug } from './routes';
import { recommendRank, sortByRecommendOrder } from './recommend-order';

const STORAGE_KEY = 'lc-admin-catalog';

export const ADMIN_SWATCH_OPTIONS: ProductColor[] = Object.values(SWATCH);

interface AdminCatalogStore {
  /** Full product overrides keyed by slug */
  patches: Record<string, Product>;
  /** Custom slug order (null/empty = seed recommend order) */
  order: string[] | null;
}

function emptyStore(): AdminCatalogStore {
  return { patches: {}, order: null };
}

function readStore(): AdminCatalogStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as AdminCatalogStore;
    return {
      patches: parsed.patches ?? {},
      order: Array.isArray(parsed.order) ? parsed.order : null,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AdminCatalogStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function collectionFromSlug(slug: CollectionSlug): Collection {
  return COLLECTION_LABELS[slug];
}

export function slugFromCollection(collection: Collection): CollectionSlug {
  if (collection === 'Niponic Dreams') return COLLECTION_SLUGS.niponicDreams;
  if (collection === 'Brazilian Dreams') return COLLECTION_SLUGS.brazilianDreams;
  return COLLECTION_SLUGS.organicDreams;
}

/** Local admin catalog overlay — swaps to HTTP later behind the same methods. */
@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  private store = signal<AdminCatalogStore>(readStore());

  readonly hasOverrides = signal(false);

  constructor() {
    this.syncHasOverrides(this.store());
  }

  /** Seed + patches, sorted by admin order (or recommend order). */
  list(): Product[] {
    return this.merge(PRODUCTS, this.store());
  }

  get(slug: string): Product | undefined {
    return this.list().find((p) => p.slug === slug);
  }

  save(product: Product): void {
    const next: AdminCatalogStore = {
      ...this.store(),
      patches: {
        ...this.store().patches,
        [product.slug]: structuredClone(product),
      },
    };
    this.persist(next);
  }

  /** Create a new product in the local overlay and append it to the list order. */
  create(product: Product): void {
    const order = this.ensureOrder();
    const nextOrder = order.includes(product.slug) ? order : [...order, product.slug];
    this.persist({
      ...this.store(),
      patches: {
        ...this.store().patches,
        [product.slug]: structuredClone(product),
      },
      order: nextOrder,
    });
  }

  /** True when slug already exists in seed or patches. */
  slugExists(slug: string, exceptSlug?: string): boolean {
    if (!slug) return false;
    if (exceptSlug && slug === exceptSlug) return false;
    if (PRODUCTS.some((p) => p.slug === slug)) return true;
    return Boolean(this.store().patches[slug]);
  }

  resetAll(): void {
    this.persist(emptyStore());
  }

  /**
   * Move a product relative to neighbours in `visibleSlugs` (filtered list).
   * Updates the global order array accordingly.
   */
  moveInList(slug: string, direction: -1 | 1, visibleSlugs: string[]): boolean {
    const vis = visibleSlugs.filter(Boolean);
    const vi = vis.indexOf(slug);
    const vj = vi + direction;
    if (vi < 0 || vj < 0 || vj >= vis.length) return false;

    const neighbour = vis[vj]!;
    const order = [...this.ensureOrder()];
    const i = order.indexOf(slug);
    const j = order.indexOf(neighbour);
    if (i < 0 || j < 0) return false;
    order[i] = neighbour;
    order[j] = slug;
    this.persist({ ...this.store(), order });
    return true;
  }

  /** Apply current store onto any seed list (CatalogService). */
  applyTo(seed: Product[]): Product[] {
    return this.merge(seed, this.store());
  }

  private ensureOrder(): string[] {
    const existing = this.store().order;
    if (existing?.length) return existing;
    return sortByRecommendOrder(PRODUCTS).map((p) => p.slug);
  }

  private merge(seed: Product[], store: AdminCatalogStore): Product[] {
    const bySlug = new Map(seed.map((p) => [p.slug, p]));
    for (const [slug, patch] of Object.entries(store.patches)) {
      bySlug.set(slug, patch);
    }
    const list = [...bySlug.values()];
    if (store.order?.length) {
      const rank = new Map(store.order.map((s, i) => [s, i]));
      return list.sort((a, b) => {
        const ra = rank.has(a.slug) ? rank.get(a.slug)! : 10_000 + recommendRank(a.slug);
        const rb = rank.has(b.slug) ? rank.get(b.slug)! : 10_000 + recommendRank(b.slug);
        if (ra !== rb) return ra - rb;
        return a.slug.localeCompare(b.slug);
      });
    }
    return sortByRecommendOrder(list);
  }

  private persist(next: AdminCatalogStore): void {
    writeStore(next);
    this.store.set(next);
    this.syncHasOverrides(next);
  }

  private syncHasOverrides(store: AdminCatalogStore): void {
    this.hasOverrides.set(
      Object.keys(store.patches).length > 0 || Boolean(store.order?.length),
    );
  }
}

export function syncPriceFields(price: number): Pick<Product, 'price' | 'priceLabel' | 'priceCents'> {
  const safe = Math.max(0, Math.round(price));
  return {
    price: safe,
    priceLabel: formatPriceLabel(safe),
    priceCents: safe * 100,
  };
}

export function syncPiecePrice(piece: ProductPiece, price: number): ProductPiece {
  const safe = Math.max(0, Math.round(price));
  return {
    ...piece,
    price: safe,
    priceLabel: formatPriceLabel(safe),
  };
}

/** URL-safe slug from product/piece name (pt accents stripped). */
export function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function uniqueAdminSlug(
  base: string,
  exists: (slug: string) => boolean,
): string {
  const root = slugifyName(base) || `produto-${Date.now().toString(36)}`;
  if (!exists(root)) return root;
  let n = 2;
  while (exists(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
