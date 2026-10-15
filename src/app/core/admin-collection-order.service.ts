import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { adminHttpErrorMessage } from './admin-catalog.service';
import { LISTA_ORDER_MAINTENANCE_NOTICE, LISTA_REORDER_ENABLED } from './membership-order';

export type CollectionOrderGender = 'feminino' | 'masculino';

export interface CollectionGenderOrder {
  collection: string;
  gender: CollectionOrderGender;
  productIds: string[];
}

export interface CollectionGenderOrderBody {
  productIds: string[];
}

const STORAGE_KEY = 'lc-admin-collection-order';

function orderKey(slug: string, gender: CollectionOrderGender): string {
  return `${slug}::${gender}`;
}

function readLocal(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(map: Record<string, string[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function localOrder(slug: string, gender: CollectionOrderGender): CollectionGenderOrder {
  const productIds = readLocal()[orderKey(slug, gender)] ?? [];
  return { collection: slug, gender, productIds };
}

function saveLocal(slug: string, gender: CollectionOrderGender, productIds: string[]): CollectionGenderOrder {
  const next = { ...readLocal(), [orderKey(slug, gender)]: [...productIds] };
  writeLocal(next);
  return { collection: slug, gender, productIds: [...productIds] };
}

/**
 * Isolated collection × gender order API.
 * GET/PUT `/api/admin/collections/:slug/order?gender=feminino|masculino`
 * body `{ productIds }` — keep this file the only place that knows the shape.
 */
@Injectable({ providedIn: 'root' })
export class AdminCollectionOrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  private url(slug: string, gender: CollectionOrderGender): string {
    const qs = new URLSearchParams({ gender });
    return `${this.baseUrl}/api/admin/collections/${encodeURIComponent(slug)}/order?${qs}`;
  }

  get(slug: string, gender: CollectionOrderGender): Observable<CollectionGenderOrder> {
    if (environment.demoMode || !this.baseUrl) {
      return of(localOrder(slug, gender));
    }
    return this.http
      .get<CollectionGenderOrder>(this.url(slug, gender), { withCredentials: true })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404 || err.status === 0) {
            return of(localOrder(slug, gender));
          }
          return throwError(() => err);
        }),
      );
  }

  put(
    slug: string,
    gender: CollectionOrderGender,
    productIds: string[],
  ): Observable<CollectionGenderOrder> {
    if (!LISTA_REORDER_ENABLED) {
      return throwError(() => new Error(LISTA_ORDER_MAINTENANCE_NOTICE));
    }
    const body: CollectionGenderOrderBody = { productIds };
    if (environment.demoMode || !this.baseUrl) {
      return of(saveLocal(slug, gender, productIds));
    }
    return this.http
      .put<CollectionGenderOrder>(this.url(slug, gender), body, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res?.productIds) saveLocal(slug, gender, res.productIds);
        }),
      );
  }
}

export function collectionOrderErrorMessage(err: unknown, fallback = 'Não foi possível salvar a ordem.'): string {
  return adminHttpErrorMessage(err, fallback);
}
