import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { filterArchivedList } from './admin-archive';
import { ApiCollectionDto, ApiProductDto } from './catalog.service';

export interface AdminCollectionDto {
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
}

export interface CreateCollectionPayload {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  publishedAt?: string | null;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string;
  sortOrder?: number;
  publishedAt?: string | null;
}

export interface SetCollectionProductsResult extends AdminCollectionDto {
  productSlugs: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminCollectionsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');

  private get url(): string {
    return `${this.base}/api/admin/collections`;
  }

  list(archived = false, opts: { refresh?: boolean } = {}): Observable<AdminCollectionDto[]> {
    const params: Record<string, string> = {};
    if (archived) params['archived'] = 'true';
    if (opts.refresh) params['_'] = String(Date.now());
    return this.http
      .get<AdminCollectionDto[]>(this.url, {
        withCredentials: true,
        params,
      })
      .pipe(map((list) => filterArchivedList(list, archived)));
  }

  archive(slug: string): Observable<AdminCollectionDto> {
    return this.http.post<AdminCollectionDto>(
      `${this.url}/${encodeURIComponent(slug)}/archive`,
      {},
      { withCredentials: true },
    );
  }

  restore(slug: string): Observable<AdminCollectionDto> {
    return this.http.post<AdminCollectionDto>(
      `${this.url}/${encodeURIComponent(slug)}/restore`,
      {},
      { withCredentials: true },
    );
  }

  create(payload: CreateCollectionPayload): Observable<AdminCollectionDto> {
    return this.http.post<AdminCollectionDto>(this.url, payload, { withCredentials: true });
  }

  update(slug: string, payload: UpdateCollectionPayload): Observable<AdminCollectionDto> {
    return this.http.patch<AdminCollectionDto>(`${this.url}/${encodeURIComponent(slug)}`, payload, {
      withCredentials: true,
    });
  }

  /** Full membership in `sortOrder`, including archived members. */
  getProducts(slug: string): Observable<{ productSlugs: string[] }> {
    return this.http.get<{ productSlugs: string[] }>(`${this.url}/${encodeURIComponent(slug)}/products`, {
      withCredentials: true,
    });
  }

  setProducts(slug: string, productSlugs: string[]): Observable<SetCollectionProductsResult> {
    return this.http.put<SetCollectionProductsResult>(
      `${this.url}/${encodeURIComponent(slug)}/products`,
      { productSlugs },
      { withCredentials: true },
    );
  }

  /** Public catalog detail — products ordered by collection sortOrder (published only). */
  getPublicDetail(slug: string): Observable<ApiCollectionDto> {
    return this.http.get<ApiCollectionDto>(
      `${this.base}/api/collections/${encodeURIComponent(slug)}`,
    );
  }

  /** Admin product list for linking / resolving unpublished items in a collection. */
  listAdminProducts(): Observable<ApiProductDto[]> {
    return this.http.get<ApiProductDto[]>(`${this.base}/api/admin/products`, {
      withCredentials: true,
    });
  }

  /**
   * Public catalog — same `mapProduct` shape as admin (`thumb`, `media[].cdnUrl`,
   * `role`, `isPrimary`). Used to fill hanger photos when the admin list omits them.
   */
  listPublicProducts(): Observable<ApiProductDto[]> {
    return this.http.get<ApiProductDto[]>(`${this.base}/api/products`);
  }
}
