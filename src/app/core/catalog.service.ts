import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { Collection, Product } from './product.model';
import { PRODUCTS } from './products';
import { CollectionSlug } from './routes';
import { environment } from '../../environments/environment';
import { sortByRecommendOrder } from './recommend-order';
import { AdminCatalogService } from './admin-catalog.service';

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
  category: string;
  collection: string;
  collections?: { slug: string; name: string }[];
  thumb: string;
  gallery: string[];
  pieces?: Product['pieces'];
  colorVariants?: Product['colorVariants'];
  imageBindings?: Product['imageBindings'];
  artCouture?: boolean;
}

export interface ApiCollectionDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  publishedAt: string | null;
  products?: ApiProductDto[];
}

function formatPriceLabel(reais: number): string {
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Map API product → storefront Product (price in whole BRL). */
export function mapApiProduct(dto: ApiProductDto): Product {
  const price = Math.round(dto.priceCents / 100);
  const local = PRODUCTS.find((p) => p.slug === dto.slug || p.id === dto.slug);
  return {
    id: dto.slug,
    slug: dto.slug,
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
    category: (dto.category === 'masculino' ? 'masculino' : 'feminino') as Product['category'],
    collection: (dto.collection || dto.collections?.[0]?.name || 'Organic Dreams') as Collection,
    collectionSlug: (dto.collections?.[0]?.slug ??
      collectionNameToSlug(dto.collection || 'Organic Dreams')) as CollectionSlug,
    pieces: (dto.pieces as Product['pieces']) ?? local?.pieces,
    colorVariants: (dto.colorVariants as Product['colorVariants']) ?? local?.colorVariants,
    imageBindings: (dto.imageBindings as Product['imageBindings']) ?? local?.imageBindings,
    artCouture: dto.artCouture ?? local?.artCouture,
  };
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
      const merged = this.adminCatalog.applyTo(PRODUCTS);
      this.products.set(merged);
      this.usingFallback.set(true);
      this.loaded.set(true);
      this.products$ = of(merged).pipe(shareReplay(1));
      return this.products$;
    }

    if (!this.products$) {
      this.products$ = this.http.get<ApiProductDto[]>(`${this.baseUrl}/api/products`).pipe(
        map((list) => list.map(mapApiProduct)),
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
          const fallback = this.adminCatalog.applyTo(PRODUCTS);
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
    const merged = this.adminCatalog.applyTo(PRODUCTS);
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
    const fromLive = () =>
      sortByRecommendOrder(
        this.products().filter(
          (p) => p.collection === collection || p.collectionSlug === collection,
        ),
      );

    if (environment.demoMode) {
      return of(
        this.adminCatalog
          .applyTo(PRODUCTS)
          .filter((p) => p.collection === collection || p.collectionSlug === collection),
      );
    }
    const slug = collectionNameToSlug(collection);
    return this.http.get<ApiCollectionDto>(`${this.baseUrl}/api/collections/${slug}`).pipe(
      map((col) => {
        const api = (col.products ?? []).map(mapApiProduct);
        return sortByRecommendOrder(api.length > 0 ? api : fromLive());
      }),
      catchError(() => of(fromLive())),
    );
  }

  getProductsByCategory(category: 'feminino' | 'masculino'): Observable<Product[]> {
    return this.loadProducts().pipe(
      map((list) => list.filter((p) => p.category === category)),
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
