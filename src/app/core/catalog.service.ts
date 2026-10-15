import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { Collection, Product, formatPriceLabel } from './product.model';
import { PRODUCTS } from './products';
import { CollectionSlug } from './routes';
import { environment } from '../../environments/environment';
import {
  groupShopProducts,
  matchesPublicGenderHub,
  productGender,
  storefrontCategory,
} from './product-gender';
import { AdminCatalogService } from './admin-catalog.service';
import { isArchivedAt, primaryCollectionLabel } from './admin-archive';
import { withCdnUrls } from './media-url';

/** API catalog DTO (subset used by the storefront). */
export interface ApiProductDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  shipping: string | null;
  priceCents: number;
  currency: string;
  color: string | null;
  size: string | null;
  fabric: string | null;
  season: string | null;
  status?: string;
  stockQty?: number;
  category: string;
  gender?: string | null;
  collection: string;
  collections?: { slug: string; name: string; archivedAt?: string | null; sortOrder?: number }[];
  thumb: string;
  gallery: string[];
  pieces?: Product['pieces'];
  colorVariants?: Product['colorVariants'];
  imageBindings?: Product['imageBindings'];
  artCouture?: boolean;
  recommendOrder?: number;
  archivedAt?: string | null;
  media?: Product['media'];
}

export interface ApiCollectionDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  publishedAt: string | null;
  archivedAt?: string | null;
  productCount?: number;
  coverImage?: string | null;
  coverUrl?: string | null;
  image?: string | null;
  products?: ApiProductDto[];
}

function publicPieceLabels(pieces: Product['pieces']): Product['pieces'] {
  if (!pieces?.length) return pieces;
  return pieces.map((piece) => ({
    ...piece,
    priceLabel: formatPriceLabel(piece.price),
  }));
}

/** Map API product → storefront Product (reais from cents; omit ,00 when whole). */
export function mapApiProduct(dto: ApiProductDto): Product {
  const price = dto.priceCents / 100;
  const local = PRODUCTS.find((p) => p.slug === dto.slug || p.id === dto.slug);
  const gender = productGender({
    slug: dto.slug,
    gender: dto.gender,
    category: dto.category,
  });
  return withCdnUrls({
    id: dto.slug,
    productId: dto.id,
    slug: dto.slug,
    gender,
    name: dto.name,
    price,
    priceCents: dto.priceCents,
    priceLabel: formatPriceLabel(price),
    color: dto.color ?? '',
    size: dto.size ?? '',
    fabric: dto.fabric ?? '',
    season: dto.season ?? '',
    description: dto.description,
    details: dto.details ?? [],
    shipping: dto.shipping ?? '',
    thumb: dto.thumb,
    gallery: dto.gallery ?? [],
    category: storefrontCategory({ slug: dto.slug, gender, category: dto.category }),
    collection: (primaryCollectionLabel(dto.collections).name ||
      (!dto.collections?.length ? dto.collection : '') ||
      '') as Collection,
    collectionSlug: (primaryCollectionLabel(dto.collections).slug ||
      (!dto.collections?.length ? collectionNameToSlug(dto.collection || '') : '')) as CollectionSlug,
    collections: dto.collections,
    pieces: publicPieceLabels((dto.pieces as Product['pieces']) ?? local?.pieces),
    colorVariants: (dto.colorVariants as Product['colorVariants']) ?? local?.colorVariants,
    imageBindings: (dto.imageBindings as Product['imageBindings']) ?? local?.imageBindings,
    artCouture: dto.artCouture ?? local?.artCouture,
    media: dto.media,
    status: dto.status,
    stockQty: dto.stockQty,
    archivedAt: dto.archivedAt ?? null,
  });
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  /** Last successful catalog snapshot (API or fallback + admin overlay). */
  readonly products = signal<Product[]>(this.adminCatalog.applyTo(PRODUCTS));
  readonly usingFallback = signal(true);
  readonly loaded = signal(false);

  private products$?: Observable<Product[]>;

  /** Prefer API; fall back to local PRODUCTS if the API is unreachable. */
  loadProducts(): Observable<Product[]> {
    if (environment.demoMode) {
      const merged = liveCatalogProducts(this.adminCatalog.applyTo(PRODUCTS));
      this.products.set(merged);
      this.usingFallback.set(true);
      this.loaded.set(true);
      this.products$ = of(merged).pipe(shareReplay(1));
      return this.products$;
    }

    if (!this.products$) {
      this.products$ = this.http.get<ApiProductDto[]>(`${this.baseUrl}/api/products`).pipe(
        map((list) => liveCatalogProducts(list.map(mapApiProduct))),
        tap((list) => {
          this.products.set(list);
          this.usingFallback.set(false);
          this.loaded.set(true);
          console.info(
            `[CatalogService] Loaded ${list.length} products from API (${this.baseUrl}/api/products); usingFallback=false`,
          );
        }),
        catchError((err) => {
          console.warn('[CatalogService] API unavailable — using local PRODUCTS fallback', err);
          const fallback = liveCatalogProducts(this.adminCatalog.applyTo(PRODUCTS));
          this.products.set(fallback);
          this.usingFallback.set(true);
          this.loaded.set(true);
          return of(fallback);
        }),
        shareReplay(1),
      );
    }
    return this.products$;
  }

  /** Re-read admin overlay into the live catalog signal (after save/reset/reorder). */
  refreshLocalCatalog(): Product[] {
    const merged = liveCatalogProducts(this.adminCatalog.applyTo(PRODUCTS));
    this.products.set(merged);
    this.usingFallback.set(true);
    this.loaded.set(true);
    this.products$ = of(merged).pipe(shareReplay(1));
    return merged;
  }

  getProductBySlug(slug: string): Observable<Product | undefined> {
    if (environment.demoMode) {
      return of(this.products().find((p) => p.slug === slug) ?? this.adminCatalog.get(slug));
    }
    return this.http.get<ApiProductDto>(`${this.baseUrl}/api/products/${slug}`).pipe(
      map(mapApiProduct),
      catchError(() =>
        of(this.products().find((p) => p.slug === slug) ?? PRODUCTS.find((p) => p.slug === slug)),
      ),
    );
  }

  getProductsByCollection(collection: Collection | string): Observable<Product[]> {
    if (environment.demoMode) {
      return of(
        groupShopProducts(
          this.adminCatalog
            .applyTo(PRODUCTS)
            .filter(
              (p) =>
                !isArchivedAt(p.archivedAt) &&
                (p.collection === collection || p.collectionSlug === collection),
            ),
        ),
      );
    }
    const slug = collectionNameToSlug(collection);
    return this.http.get<ApiCollectionDto>(`${this.baseUrl}/api/collections/${slug}`).pipe(
      map((col) => {
        // Public API already omits archived products; keep a front filter if an old
        // payload still embeds them (GET /api/collections/:slug).
        // Do not fall back to the local catalog — an unknown/empty slug stays empty.
        const api = (col.products ?? [])
          .map(mapApiProduct)
          .filter((p) => !isArchivedAt(p.archivedAt));
        // Keep GET /api/collections/:slug order (product_collections.sortOrder).
        return api;
      }),
      catchError(() => of([])),
    );
  }

  getProductsByCategory(category: 'feminino' | 'masculino'): Observable<Product[]> {
    return this.loadProducts().pipe(
      map((list) => list.filter((p) => matchesPublicGenderHub(p, category))),
    );
  }

  getCollections(): Observable<ApiCollectionDto[]> {
    if (environment.demoMode) {
      return of([
        { id: '1', slug: 'organic-dreams', name: 'Organic Dreams', description: null, sortOrder: 1, publishedAt: null },
        { id: '2', slug: 'niponic-dreams', name: 'Niponic Dreams', description: null, sortOrder: 2, publishedAt: null },
        { id: '3', slug: 'brazilian-dreams', name: 'Brazilian Dreams', description: null, sortOrder: 3, publishedAt: null },
      ]);
    }
    return this.http.get<ApiCollectionDto[]>(`${this.baseUrl}/api/collections`).pipe(
      catchError(() =>
        of([
          { id: '1', slug: 'organic-dreams', name: 'Organic Dreams', description: null, sortOrder: 1, publishedAt: null },
          { id: '2', slug: 'niponic-dreams', name: 'Niponic Dreams', description: null, sortOrder: 2, publishedAt: null },
          { id: '3', slug: 'brazilian-dreams', name: 'Brazilian Dreams', description: null, sortOrder: 3, publishedAt: null },
        ]),
      ),
    );
  }

  getById(productId: string): Product | undefined {
    return (
      this.products().find((p) => p.id === productId || p.slug === productId) ??
      PRODUCTS.find((p) => p.id === productId || p.slug === productId)
    );
  }
}

function liveCatalogProducts(products: Product[]): Product[] {
  return products.filter((p) => !isArchivedAt(p.archivedAt));
}

function collectionNameToSlug(nameOrSlug: string): string {
  const known: Record<string, string> = {
    'Organic Dreams': 'organic-dreams',
    'Niponic Dreams': 'niponic-dreams',
    'Brazilian Dreams': 'brazilian-dreams',
    'organic-dreams': 'organic-dreams',
    'niponic-dreams': 'niponic-dreams',
    'brazilian-dreams': 'brazilian-dreams',
  };
  return known[nameOrSlug] ?? nameOrSlug.toLowerCase().replace(/\s+/g, '-');
}
