import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiCollectionDto, ApiProductDto } from './catalog.service';

export interface AdminCollectionDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  publishedAt: string | null;
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

  list(): Observable<AdminCollectionDto[]> {
    return this.http.get<AdminCollectionDto[]>(this.url, { withCredentials: true });
  }

  create(payload: CreateCollectionPayload): Observable<AdminCollectionDto> {
    return this.http.post<AdminCollectionDto>(this.url, payload, { withCredentials: true });
  }

  update(slug: string, payload: UpdateCollectionPayload): Observable<AdminCollectionDto> {
    return this.http.patch<AdminCollectionDto>(`${this.url}/${encodeURIComponent(slug)}`, payload, {
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
}
