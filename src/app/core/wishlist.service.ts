import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { Product } from './product.model';

const STORAGE_KEY = 'lc-wishlist';

/**
 * Guests keep favourites in localStorage; signed-in customers get the same list
 * mirrored to `/api/wishlist` so it survives across devices. On login the local
 * list is merged into the stored one — nothing a guest saved is lost.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');

  private readonly ids = signal<string[]>(this.readStorage());
  /** Customer whose list is already mirrored, so a restored session syncs once. */
  private syncedCustomerId: string | null = null;

  readonly products = computed(() =>
    this.ids()
      .map((id) => this.catalog.getById(id))
      .filter((p): p is Product => p != null),
  );

  readonly count = computed(() => this.ids().length);

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids()));
    });

    // Catches sessions restored from the cookie on a fresh page load.
    effect(() => {
      const customerId = this.auth.user()?.id ?? null;
      if (customerId && customerId !== this.syncedCustomerId) {
        untracked(() => this.syncAfterLogin());
      } else if (!customerId) {
        this.syncedCustomerId = null;
      }
    });

    // Warm catalog so stored slugs resolve to products.
    this.catalog.loadProducts().subscribe();
  }

  has(productId: string): boolean {
    return this.ids().includes(productId);
  }

  add(productId: string): void {
    if (this.has(productId)) return;
    this.ids.update((list) => [...list, productId]);
    this.persistRemote();
  }

  remove(productId: string): void {
    this.ids.update((list) => list.filter((id) => id !== productId));
    this.persistRemote();
  }

  toggle(productId: string): void {
    if (this.has(productId)) {
      this.remove(productId);
    } else {
      this.add(productId);
    }
  }

  /** After login/register: merge local → server, then adopt the server list. */
  syncAfterLogin(): void {
    const customerId = this.auth.user()?.id;
    if (!customerId) return;
    if (environment.demoMode) {
      this.syncedCustomerId = customerId;
      return;
    }
    this.syncedCustomerId = customerId;

    const local = this.ids();
    this.fetchRemote().subscribe((remote) => {
      const merged = [...new Set([...(remote ?? []), ...local])];
      this.ids.set(merged);
      this.putRemote(merged).subscribe((saved) => {
        if (saved) this.ids.set(saved);
      });
    });
  }

  private persistRemote(): void {
    if (environment.demoMode || !this.auth.user()) return;
    this.putRemote(this.ids()).subscribe();
  }

  private fetchRemote(): Observable<string[] | null> {
    if (environment.demoMode) return of(null);
    return this.http
      .get<string[]>(`${this.base}/api/wishlist`, { withCredentials: true })
      .pipe(catchError(() => of(null)));
  }

  private putRemote(productSlugs: string[]): Observable<string[] | null> {
    if (environment.demoMode) return of(productSlugs);
    return this.http
      .put<string[]>(
        `${this.base}/api/wishlist`,
        { productSlugs },
        { withCredentials: true },
      )
      .pipe(catchError(() => of(null)));
  }

  private readStorage(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
