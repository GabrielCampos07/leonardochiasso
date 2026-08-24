import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminCatalogService } from './admin-catalog.service';
import { CatalogService, mapApiProduct, ApiProductDto } from './catalog.service';
import { ContentService } from './content.service';
import { Product } from './product.model';
import { PRODUCTS } from './products';

/** Result of a storefront image upload (no product slug required). */
export interface ContentImageUploadResult {
  cdnUrl: string;
  mediaAssetId?: string;
  storageKey?: string;
}

@Injectable({ providedIn: 'root' })
export class ContentAdminService {
  private readonly http = inject(HttpClient);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly catalog = inject(CatalogService);
  private readonly content = inject(ContentService);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  /**
   * PATCH a field on a content document (`joia`, `arte`, …).
   * Delegates to `ContentService.patchContent` (credentials + demoMode guard).
   */
  patchContentField(
    kind: string,
    slug: string,
    path: string,
    value: unknown,
  ): Observable<unknown> {
    return this.content.patchContent(kind, slug, path, value);
  }

  /**
   * Upload an image via media presign → PUT → complete (no product attach).
   * Demo / no-API: returns a session object URL as `cdnUrl`.
   */
  uploadImage$(file: File, altPt?: string): Observable<ContentImageUploadResult> {
    if (this.baseUrl && !environment.demoMode) {
      return this.adminCatalog.uploadMediaAsset$(file, altPt).pipe(
        map((asset) => ({
          cdnUrl: asset.cdnUrl,
          mediaAssetId: asset.id,
        })),
      );
    }
    return of({ cdnUrl: URL.createObjectURL(file) });
  }

  patchProductField(slug: string, path: string, value: unknown): Observable<Product | null> {
    if (this.baseUrl && !environment.demoMode) {
      return this.http
        .patch<ApiProductDto>(`${this.baseUrl}/api/admin/products/${slug}/field`, { path, value }, {
          withCredentials: true,
        })
        .pipe(
          map((dto) => mapApiProduct(dto)),
          tap((p) => this.catalog.products.update((list) => list.map((x) => (x.slug === slug ? p : x)))),
          catchError(() => of(this.patchLocalProduct(slug, path, value))),
        );
    }
    return of(this.patchLocalProduct(slug, path, value));
  }

  private patchLocalProduct(slug: string, path: string, value: unknown): Product | null {
    const current =
      this.catalog.products().find((p) => p.slug === slug) ??
      this.adminCatalog.get(slug) ??
      PRODUCTS.find((p) => p.slug === slug);
    if (!current) return null;

    const next = structuredClone(current) as unknown as Record<string, unknown>;
    setByPath(next, path, value);
    const product = next as unknown as Product;
    this.adminCatalog.save(product);
    this.catalog.refreshLocalCatalog();
    return product;
  }
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const seg = cur[key];
    if (seg == null || typeof seg !== 'object') {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}
