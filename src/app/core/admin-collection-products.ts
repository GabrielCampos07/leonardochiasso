import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import {
  AdminCollectionsApiService,
  SetCollectionProductsResult,
} from './admin-collections-api.service';

/** Visual gap between hangers when several pieces are added in one confirm. */
export const ADD_PIECE_STAGGER_MS = 80;

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

  /** Full replace (reorder / remove). Still serialized per collection. */
  replace(collectionSlug: string, productSlugs: readonly string[]): Observable<SetCollectionProductsResult> {
    return this.enqueue(collectionSlug, () => {
      const next = appendCollectionProductSlugs(productSlugs, []);
      return this.write(collectionSlug, next);
    });
  }

  /** Current list + newcomers at the end, one PUT. */
  append(collectionSlug: string, incoming: readonly string[]): Observable<SetCollectionProductsResult> {
    return this.enqueue(collectionSlug, () => {
      const next = appendCollectionProductSlugs(this.current(collectionSlug), incoming);
      return this.write(collectionSlug, next);
    });
  }

  private write(collectionSlug: string, productSlugs: string[]): Promise<SetCollectionProductsResult> {
    return firstValueFrom(this.api.setProducts(collectionSlug, productSlugs)).then((result) => {
      this.remember(collectionSlug, result.productSlugs);
      return result;
    });
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
