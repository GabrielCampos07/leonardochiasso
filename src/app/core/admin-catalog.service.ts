import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  concatMap,
  from,
  last,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiProductDto, mapApiProduct } from './catalog.service';
import {
  COLLECTION_LABELS,
  Collection,
  Product,
  ProductColor,
  ProductMedia,
  ProductPiece,
  SWATCH,
  formatPriceLabel,
} from './product.model';
import { PRODUCTS } from './products';
import { COLLECTION_SLUGS, CollectionSlug } from './routes';
import { recommendRank, sortByRecommendOrder } from './recommend-order';

const STORAGE_KEY = 'lc-admin-catalog';

export const ADMIN_SWATCH_OPTIONS: ProductColor[] = Object.values(SWATCH);

export interface AdminCreateProductPayload {
  name: string;
  slug: string;
  category: 'feminino' | 'masculino';
  collectionSlug: string;
  priceCents: number;
  status?: string;
  description?: string;
  color?: string;
  size?: string;
  fabric?: string;
  season?: string;
}

export interface AdminUpdateProductPayload {
  name?: string;
  slug?: string;
  category?: 'feminino' | 'masculino';
  collectionSlug?: string;
  priceCents?: number;
  status?: string;
  description?: string;
  shippingCopy?: string;
  color?: string;
  size?: string;
  fabric?: string;
  season?: string;
  details?: string[];
  pieces?: unknown;
  colorVariants?: unknown;
}

interface AdminCatalogStore {
  /** Full product overrides keyed by slug */
  patches: Record<string, Product>;
  /** Custom slug order (null/empty = seed recommend order) */
  order: string[] | null;
}

interface PresignResponse {
  uploadUrl: string | null;
  storageKey: string;
  local: boolean;
  message?: string;
}

interface CompleteResponse {
  asset: { id: string; cdnUrl: string; role: string; altPt: string | null };
  variants: unknown[];
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

export function adminHttpErrorMessage(err: unknown, fallback = 'Não foi possível salvar.'): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      const msg = (body as { message?: string | string[] }).message;
      if (Array.isArray(msg)) return msg.filter(Boolean).join(' · ') || fallback;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    if (err.status === 401) return 'Sessão expirada. Entre de novo no admin.';
    if (err.status === 409) return 'Já existe um produto com este código (slug).';
  }
  return fallback;
}

/** Local admin catalog overlay — uses Nest Admin API when configured. */
@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  private store = signal<AdminCatalogStore>(readStore());
  /** Short-lived API list cache for the admin UI. */
  private readonly apiCache = signal<Product[] | null>(null);

  readonly hasOverrides = signal(false);

  constructor() {
    this.syncHasOverrides(this.store());
  }

  /** Prefer Nest Admin API when base URL is set and demo mode is off. */
  get useApi(): boolean {
    return Boolean(this.baseUrl) && !environment.demoMode;
  }

  /** Seed + patches, sorted by admin order (or recommend order). Sync / demo. */
  list(): Product[] {
    if (this.useApi && this.apiCache()) return this.apiCache()!;
    return this.merge(PRODUCTS, this.store());
  }

  list$(): Observable<Product[]> {
    if (!this.useApi) return of(this.list());
    return this.http
      .get<ApiProductDto[]>(`${this.baseUrl}/api/admin/products`, {
        withCredentials: true,
      })
      .pipe(
        map((list) => list.map(mapApiProduct)),
        tap((list) => this.apiCache.set(list)),
        catchError((err) => throwError(() => err)),
      );
  }

  get(slug: string): Product | undefined {
    return this.list().find((p) => p.slug === slug);
  }

  get$(slug: string): Observable<Product | undefined> {
    if (!this.useApi) return of(this.get(slug));
    return this.list$().pipe(map((list) => list.find((p) => p.slug === slug)));
  }

  save(product: Product): void {
    if (this.useApi) {
      // Prefer save$ / updateViaApi from UI when API is on.
      return;
    }
    const next: AdminCatalogStore = {
      ...this.store(),
      patches: {
        ...this.store().patches,
        [product.slug]: structuredClone(product),
      },
    };
    this.persist(next);
  }

  create(product: Product): void {
    if (this.useApi) return;
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

  createViaApi(payload: AdminCreateProductPayload): Observable<Product> {
    return this.http
      .post<ApiProductDto>(`${this.baseUrl}/api/admin/products`, payload, {
        withCredentials: true,
      })
      .pipe(
        map(mapApiProduct),
        tap((p) => this.patchApiCache(p, true)),
      );
  }

  updateViaApi(slug: string, payload: AdminUpdateProductPayload): Observable<Product> {
    return this.http
      .patch<ApiProductDto>(`${this.baseUrl}/api/admin/products/${encodeURIComponent(slug)}`, payload, {
        withCredentials: true,
      })
      .pipe(
        map(mapApiProduct),
        tap((p) => this.patchApiCache(p, false, slug)),
      );
  }

  /** Persist create/update: API when enabled, otherwise localStorage. */
  saveProduct$(
    product: Product,
    opts: { isNew: boolean; details: string[] },
  ): Observable<Product> {
    if (!this.useApi) {
      const next = { ...product, details: opts.details };
      if (opts.isNew) this.create(next);
      else this.save(next);
      return of(next);
    }

    const collectionSlug = product.collectionSlug || slugFromCollection(product.collection);
    const priceCents = product.priceCents ?? Math.round(product.price * 100);

    if (opts.isNew) {
      return this.createViaApi({
        name: product.name.trim(),
        slug: product.slug.trim(),
        category: product.category,
        collectionSlug,
        priceCents,
        status: 'published',
        description: product.description || undefined,
        color: product.color || undefined,
        size: product.size || undefined,
        fabric: product.fabric || undefined,
        season: product.season || undefined,
      }).pipe(
        switchMap((created) =>
          this.updateViaApi(created.slug, {
            details: opts.details,
            pieces: product.pieces?.length ? product.pieces : undefined,
            colorVariants: product.colors?.length
              ? product.colors.map((c) => ({
                  colorId: c.id,
                  name: c.name,
                  hex: c.hex,
                }))
              : undefined,
            shippingCopy: product.shipping || undefined,
          }),
        ),
      );
    }

    return this.updateViaApi(product.slug, {
      name: product.name.trim(),
      category: product.category,
      collectionSlug,
      priceCents,
      description: product.description,
      shippingCopy: product.shipping || undefined,
      color: product.color || undefined,
      size: product.size || undefined,
      fabric: product.fabric || undefined,
      season: product.season || undefined,
      details: opts.details,
      pieces: product.pieces ?? [],
      colorVariants: product.colors?.length
        ? product.colors.map((c) => ({
            colorId: c.id,
            name: c.name,
            hex: c.hex,
          }))
        : [],
    });
  }

  reorderViaApi(orderedSlugs: string[]): Observable<{ updated: number }> {
    return this.http
      .put<{ updated: number }>(
        `${this.baseUrl}/api/admin/products/reorder`,
        { orderedSlugs },
        { withCredentials: true },
      )
      .pipe(
        tap(() => {
          const cached = this.apiCache();
          if (!cached?.length) return;
          const rank = new Map(orderedSlugs.map((s, i) => [s, i]));
          this.apiCache.set(
            [...cached].sort((a, b) => {
              const ra = rank.get(a.slug) ?? 10_000;
              const rb = rank.get(b.slug) ?? 10_000;
              return ra - rb;
            }),
          );
        }),
      );
  }

  reorderMediaViaApi(slug: string, mediaIds: string[]): Observable<Product> {
    return this.http
      .put<ApiProductDto>(
        `${this.baseUrl}/api/admin/products/${encodeURIComponent(slug)}/media/reorder`,
        { mediaIds },
        { withCredentials: true },
      )
      .pipe(
        map(mapApiProduct),
        tap((p) => this.patchApiCache(p, false, slug)),
      );
  }

  attachMediaViaApi(
    slug: string,
    mediaAssetId: string,
    opts?: { sortOrder?: number; isPrimary?: boolean },
  ): Observable<Product> {
    return this.http
      .post<ApiProductDto>(
        `${this.baseUrl}/api/admin/products/${encodeURIComponent(slug)}/media`,
        { mediaAssetId, ...opts },
        { withCredentials: true },
      )
      .pipe(
        map(mapApiProduct),
        tap((p) => this.patchApiCache(p, false, slug)),
      );
  }

  detachMediaViaApi(slug: string, mediaAssetId: string): Observable<Product> {
    return this.http
      .delete<ApiProductDto>(
        `${this.baseUrl}/api/admin/products/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaAssetId)}`,
        { withCredentials: true },
      )
      .pipe(
        map(mapApiProduct),
        tap((p) => this.patchApiCache(p, false, slug)),
      );
  }

  /**
   * Upload flow: presign → PUT (or base64 complete) → complete → returns asset id.
   */
  uploadMediaAsset$(file: File, altPt?: string): Observable<{ id: string; cdnUrl: string }> {
    const mime = file.type || 'application/octet-stream';
    return this.http
      .post<PresignResponse>(
        `${this.baseUrl}/api/admin/media/presign`,
        { filename: file.name, mime },
        { withCredentials: true },
      )
      .pipe(
        switchMap((presign) => {
          if (presign.uploadUrl) {
            return from(
              fetch(presign.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': mime },
              }),
            ).pipe(
              switchMap((res) => {
                if (!res.ok) {
                  return throwError(
                    () => new Error(`Upload falhou (${res.status}).`),
                  );
                }
                return this.http.post<CompleteResponse>(
                  `${this.baseUrl}/api/admin/media/complete`,
                  { storageKey: presign.storageKey, altPt },
                  { withCredentials: true },
                );
              }),
            );
          }
          return from(fileToBase64(file)).pipe(
            switchMap((bufferBase64) =>
              this.http.post<CompleteResponse>(
                `${this.baseUrl}/api/admin/media/complete`,
                { storageKey: presign.storageKey, altPt, bufferBase64 },
                { withCredentials: true },
              ),
            ),
          );
        }),
        map((res) => ({ id: res.asset.id, cdnUrl: res.asset.cdnUrl })),
      );
  }

  /** Upload one or more files and attach to product (first becomes primary if gallery empty). */
  uploadAndAttach$(slug: string, files: File[]): Observable<Product> {
    if (!files.length) {
      return this.get$(slug).pipe(
        switchMap((p) => (p ? of(p) : throwError(() => new Error('Produto não encontrado.')))),
      );
    }
    return this.get$(slug).pipe(
      switchMap((existing) => {
        const hadMedia = Boolean(existing?.media?.length);
        return from(files).pipe(
          concatMap((file, index) =>
            this.uploadMediaAsset$(file).pipe(
              switchMap((asset) =>
                this.attachMediaViaApi(slug, asset.id, {
                  isPrimary: !hadMedia && index === 0,
                }),
              ),
            ),
          ),
          last(),
        );
      }),
    );
  }

  /** True when slug already exists in seed or patches (or API cache). */
  slugExists(slug: string, exceptSlug?: string): boolean {
    if (!slug) return false;
    if (exceptSlug && slug === exceptSlug) return false;
    if (this.apiCache()?.some((p) => p.slug === slug)) return true;
    if (PRODUCTS.some((p) => p.slug === slug)) return true;
    return Boolean(this.store().patches[slug]);
  }

  resetAll(): void {
    if (this.useApi) {
      this.apiCache.set(null);
      return;
    }
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
    const order = this.useApi
      ? [...(this.apiCache()?.map((p) => p.slug) ?? vis)]
      : [...this.ensureOrder()];
    const i = order.indexOf(slug);
    const j = order.indexOf(neighbour);
    if (i < 0 || j < 0) return false;
    order[i] = neighbour;
    order[j] = slug;

    if (this.useApi) {
      const cached = this.apiCache();
      if (cached) {
        const bySlug = new Map(cached.map((p) => [p.slug, p]));
        this.apiCache.set(order.map((s) => bySlug.get(s)!).filter(Boolean));
      }
      return true;
    }

    this.persist({ ...this.store(), order });
    return true;
  }

  /** Set full product order (localStorage or optimistic API cache). */
  setOrder(orderedSlugs: string[]): void {
    if (this.useApi) {
      const cached = this.apiCache();
      if (cached) {
        const bySlug = new Map(cached.map((p) => [p.slug, p]));
        this.apiCache.set(orderedSlugs.map((s) => bySlug.get(s)!).filter(Boolean));
      }
      return;
    }
    this.persist({ ...this.store(), order: [...orderedSlugs] });
  }

  /** Current ordered slugs (API cache or local). */
  currentOrder(): string[] {
    if (this.useApi && this.apiCache()) {
      return this.apiCache()!.map((p) => p.slug);
    }
    return this.list().map((p) => p.slug);
  }

  /** Apply current store onto any seed list (CatalogService). */
  applyTo(seed: Product[]): Product[] {
    return this.merge(seed, this.store());
  }

  mediaOf(product: Product | null | undefined): ProductMedia[] {
    if (!product) return [];
    if (product.media?.length) {
      return [...product.media].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const urls = [
      ...(product.thumb ? [product.thumb] : []),
      ...(product.gallery ?? []),
    ].filter((u, i, arr) => u && arr.indexOf(u) === i);
    return urls.map((cdnUrl, i) => ({
      id: `local-${i}-${cdnUrl}`,
      cdnUrl,
      role: i === 0 ? 'thumb' : 'gallery',
      altPt: null,
      sortOrder: i,
      isPrimary: i === 0,
    }));
  }

  private patchApiCache(product: Product, append: boolean, oldSlug?: string): void {
    const cached = this.apiCache();
    if (!cached) {
      this.apiCache.set([product]);
      return;
    }
    if (append && !cached.some((p) => p.slug === product.slug)) {
      this.apiCache.set([...cached, product]);
      return;
    }
    this.apiCache.set(
      cached.map((p) => (p.slug === (oldSlug ?? product.slug) ? product : p)),
    );
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
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
