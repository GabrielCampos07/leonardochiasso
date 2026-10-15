import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, throwError } from 'rxjs';
import { adminHttpErrorMessage } from './admin-catalog.service';
import {
  LISTA_ORDER_MAINTENANCE_NOTICE,
  LISTA_REORDER_ENABLED,
  STOCKROOM_REORDER_ENABLED,
} from './membership-order';
import {
  AdminCollectionsApiService,
  SetCollectionProductsResult,
} from './admin-collections-api.service';

/** Visual gap between hangers when several pieces are added in one confirm. */
export const ADD_PIECE_STAGGER_MS = 80;

export const MEMBERSHIP_WRITE_BAD_REQUEST =
  'A lista de peças da coleção está inconsistente. Recarregue a página.';
export const MEMBERSHIP_WRITE_CONFLICT = 'Conflito ao salvar a ordem. Recarregue e tente de novo.';
export const MEMBERSHIP_WRITE_NOT_FOUND = 'Coleção ou peça não encontrada.';
export const MEMBERSHIP_WRITE_BUSY = 'O servidor está ocupado. Tente de novo em instantes.';

export function membershipWriteErrorMessage(
  err: unknown,
  fallback = 'Não foi possível salvar a ordem.',
): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 400) return MEMBERSHIP_WRITE_BAD_REQUEST;
    if (err.status === 409) return MEMBERSHIP_WRITE_CONFLICT;
    if (err.status === 404) return MEMBERSHIP_WRITE_NOT_FOUND;
    if (err.status === 503) return MEMBERSHIP_WRITE_BUSY;
  }
  return adminHttpErrorMessage(err, fallback);
}

/**
 * Reorder only the live/loaded slugs; keep every other member (archived,
 * draft, not loaded) in its existing slot. `PUT /products` is an exact set.
 */
export function mergeLiveOrderIntoMembership(
  membership: readonly string[],
  liveOrdered: readonly string[],
): string[] {
  const live = appendCollectionProductSlugs(liveOrdered, []);
  const liveSet = new Set(live);
  const next: string[] = [];
  const seen = new Set<string>();
  let i = 0;
  for (const raw of membership) {
    const slug = raw.trim();
    if (!slug || seen.has(slug)) continue;
    if (liveSet.has(slug)) {
      const take = live[i++];
      if (!take || seen.has(take)) continue;
      seen.add(take);
      next.push(take);
    } else {
      seen.add(slug);
      next.push(slug);
    }
  }
  while (i < live.length) {
    const take = live[i++];
    if (!take || seen.has(take)) continue;
    seen.add(take);
    next.push(take);
  }
  return next;
}

/** Keep current order and append newcomers at the end. Duplicates are ignored. */
export function appendCollectionProductSlugs(
  current: readonly string[],
  incoming: readonly string[],
): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const slug of current) {
    const trimmed = slug.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  for (const slug of incoming) {
    const trimmed = slug.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

export function addPieceStaggerDelay(index: number, ms = ADD_PIECE_STAGGER_MS): number {
  return Math.max(0, index) * ms;
}

export interface CollectionProductAppendItem {
  slug: string;
  ok: boolean;
  message?: string;
}

export interface CollectionProductAppendBatch {
  added: string[];
  failed: { slug: string; message: string }[];
}

export function partitionAppendResults(
  rows: readonly CollectionProductAppendItem[],
): CollectionProductAppendBatch {
  const added: string[] = [];
  const failed: { slug: string; message: string }[] = [];
  for (const row of rows) {
    if (row.ok) added.push(row.slug);
    else failed.push({ slug: row.slug, message: row.message || 'Não foi possível adicionar esta peça.' });
  }
  return { added, failed };
}

/**
 * One-at-a-time queue per collection slug.
 * `PUT /products` rewrites the whole join table, so two in-flight writes would clobber each other.
 */
export class CollectionProductsLock {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<T>(collectionSlug: string, task: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(collectionSlug) ?? Promise.resolve();
    const next = prev.then(task, task);
    this.tails.set(
      collectionSlug,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }
}

/** Single-lane queue: task N starts only after task N-1 settles. */
export class SerialTaskQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task, task);
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

@Injectable({ providedIn: 'root' })
export class AdminCollectionProductsService {
  private readonly api = inject(AdminCollectionsApiService);
  private readonly lock = new CollectionProductsLock();
  private readonly lists = new Map<string, string[]>();

  remember(collectionSlug: string, productSlugs: readonly string[]): void {
    this.lists.set(collectionSlug, appendCollectionProductSlugs(productSlugs, []));
  }

  current(collectionSlug: string): string[] {
    return [...(this.lists.get(collectionSlug) ?? [])];
  }

  /** Full replace (reorder). GET membership, merge live order, PUT the exact set. */
  replace(collectionSlug: string, productSlugs: readonly string[]): Observable<SetCollectionProductsResult> {
    if (!LISTA_REORDER_ENABLED) {
      return throwError(() => new Error(LISTA_ORDER_MAINTENANCE_NOTICE));
    }
    return this.enqueue(collectionSlug, () => this.putFullMembership(collectionSlug, productSlugs));
  }

  /**
   * 3D drag: GET the server membership, merge live hangers in place, PUT the
   * exact set (archived + draft stay linked).
   */
  replaceLiveOrder(
    collectionSlug: string,
    liveOrdered: readonly string[],
  ): Observable<SetCollectionProductsResult> {
    if (!STOCKROOM_REORDER_ENABLED) {
      return of({ productSlugs: this.current(collectionSlug) } as SetCollectionProductsResult);
    }
    return this.enqueue(collectionSlug, () => this.putFullMembership(collectionSlug, liveOrdered));
  }

  /** POST /products/append — never a partial PUT. */
  append(collectionSlug: string, incoming: readonly string[]): Observable<SetCollectionProductsResult> {
    if (!STOCKROOM_REORDER_ENABLED) {
      return throwError(() => new Error(LISTA_ORDER_MAINTENANCE_NOTICE));
    }
    const slugs = incoming.map((slug) => slug.trim()).filter(Boolean);
    return this.enqueue(collectionSlug, () =>
      this.writeOrReload(collectionSlug, () => firstValueFrom(this.api.appendProducts(collectionSlug, slugs))),
    );
  }

  /** One POST append per slug so a failure does not roll back pieces that already landed. */
  appendEach(
    collectionSlug: string,
    incoming: readonly string[],
  ): Observable<CollectionProductAppendItem[]> {
    return new Observable<CollectionProductAppendItem[]>((subscriber) => {
      void (async () => {
        const results: CollectionProductAppendItem[] = [];
        for (const slug of incoming) {
          const trimmed = slug.trim();
          if (!trimmed) continue;
          try {
            await firstValueFrom(this.append(collectionSlug, [trimmed]));
            results.push({ slug: trimmed, ok: true });
          } catch (err) {
            results.push({
              slug: trimmed,
              ok: false,
              message: membershipWriteErrorMessage(err, 'Não foi possível adicionar esta peça.'),
            });
          }
        }
        subscriber.next(results);
        subscriber.complete();
      })();
    });
  }

  /**
   * Grouped POST append first; if it fails, retry per item so successful pieces stay
   * associated and failed slugs can remain selected.
   */
  tryAppend(collectionSlug: string, incoming: readonly string[]): Observable<CollectionProductAppendBatch> {
    const slugs = incoming.map((slug) => slug.trim()).filter(Boolean);
    if (!slugs.length) return of({ added: [], failed: [] });
    return this.append(collectionSlug, slugs).pipe(
      map(() => ({ added: slugs, failed: [] })),
      catchError(() => this.appendEach(collectionSlug, slugs).pipe(map(partitionAppendResults))),
    );
  }

  /** DELETE /products/:productSlug — never a partial PUT. */
  remove(collectionSlug: string, productSlug: string): Observable<SetCollectionProductsResult> {
    if (!LISTA_REORDER_ENABLED) {
      return throwError(() => new Error(LISTA_ORDER_MAINTENANCE_NOTICE));
    }
    return this.enqueue(collectionSlug, () =>
      this.writeOrReload(collectionSlug, () =>
        firstValueFrom(this.api.removeProduct(collectionSlug, productSlug)),
      ),
    );
  }

  private async putFullMembership(
    collectionSlug: string,
    liveOrdered: readonly string[],
  ): Promise<SetCollectionProductsResult> {
    return this.writeOrReload(collectionSlug, async () => {
      const membership = await firstValueFrom(this.api.getProducts(collectionSlug));
      const next = mergeLiveOrderIntoMembership(membership.productSlugs, liveOrdered);
      return firstValueFrom(this.api.setProducts(collectionSlug, next));
    });
  }

  private async writeOrReload(
    collectionSlug: string,
    write: () => Promise<SetCollectionProductsResult>,
  ): Promise<SetCollectionProductsResult> {
    try {
      const result = await write();
      this.remember(collectionSlug, result.productSlugs);
      return result;
    } catch (err) {
      await this.reloadFromServer(collectionSlug);
      throw err;
    }
  }

  private async reloadFromServer(collectionSlug: string): Promise<void> {
    try {
      const membership = await firstValueFrom(this.api.getProducts(collectionSlug));
      this.remember(collectionSlug, membership.productSlugs);
    } catch {
      // Keep the last known list if the reload also fails.
    }
  }

  private enqueue<T>(collectionSlug: string, task: () => Promise<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      void this.lock.run(collectionSlug, async () => {
        try {
          const value = await task();
          subscriber.next(value);
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      });
    });
  }
}
