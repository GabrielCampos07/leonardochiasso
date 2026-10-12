import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, tap, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { JOIAS_PIECES, JoiaPiece, joiaGallery } from './joias.data';

const STORAGE_KEY = 'lc-admin-joias';

interface AdminJoiasStore {
  patches: Record<string, JoiaPiece>;
  order: string[] | null;
}

function emptyStore(): AdminJoiasStore {
  return { patches: {}, order: null };
}

function readStore(): AdminJoiasStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as AdminJoiasStore;
    return {
      patches: parsed.patches ?? {},
      order: Array.isArray(parsed.order) ? parsed.order : null,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AdminJoiasStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Local Gioielli overlay — same pattern as moda admin catalog. */
@Injectable({ providedIn: 'root' })
export class AdminJoiasCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private store = signal<AdminJoiasStore>(readStore());
  private readonly apiCache = signal<JoiaPiece[] | null>(null);
  readonly hasOverrides = signal(false);

  constructor() {
    this.syncHasOverrides(this.store());
  }

  get useApi(): boolean {
    return Boolean(this.baseUrl) && !environment.demoMode;
  }

  list(archived = false): JoiaPiece[] {
    if (this.useApi && this.apiCache()) return this.apiCache()!;
    return this.merge(JOIAS_PIECES, this.store()).filter((p) =>
      archived ? Boolean(p.archivedAt) : !p.archivedAt,
    );
  }

  list$(archived = false): Observable<JoiaPiece[]> {
    if (!this.useApi) return of(this.list(archived));
    return this.http
      .get<JoiaPiece[]>(`${this.baseUrl}/api/admin/joias`, {
        withCredentials: true,
        params: archived ? { archived: 'true' } : {},
      })
      .pipe(tap((list) => this.apiCache.set(list)));
  }

  get(slug: string): JoiaPiece | undefined {
    return (
      this.apiCache()?.find((p) => p.slug === slug) ??
      this.merge(JOIAS_PIECES, this.store()).find((p) => p.slug === slug)
    );
  }

  save(piece: JoiaPiece): void {
    const next: AdminJoiasStore = {
      ...this.store(),
      patches: {
        ...this.store().patches,
        [piece.slug]: structuredClone(piece),
      },
    };
    this.persist(next);
  }

  create(piece: JoiaPiece): void {
    const order = this.ensureOrder();
    const nextOrder = order.includes(piece.slug) ? order : [...order, piece.slug];
    this.persist({
      ...this.store(),
      patches: {
        ...this.store().patches,
        [piece.slug]: structuredClone(piece),
      },
      order: nextOrder,
    });
  }

  archive(slug: string): Observable<JoiaPiece> {
    if (!this.useApi) {
      const current = this.get(slug);
      if (!current) return throwError(() => new Error('Joia não encontrada.'));
      const next = { ...current, archivedAt: new Date().toISOString() };
      this.save(next);
      return of(next);
    }
    return this.http
      .post<JoiaPiece>(
        `${this.baseUrl}/api/admin/joias/${encodeURIComponent(slug)}/archive`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((row) => ({ ...row, archivedAt: row.archivedAt ?? new Date().toISOString() })),
        tap((piece) => this.patchApiCache(piece)),
      );
  }

  restore(slug: string): Observable<JoiaPiece> {
    if (!this.useApi) {
      const current = this.get(slug);
      if (!current) return throwError(() => new Error('Joia não encontrada.'));
      const next = { ...current, archivedAt: null };
      this.save(next);
      return of(next);
    }
    return this.http
      .post<JoiaPiece>(
        `${this.baseUrl}/api/admin/joias/${encodeURIComponent(slug)}/restore`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((row) => ({ ...row, archivedAt: row.archivedAt ?? null })),
        tap((piece) => this.patchApiCache(piece)),
      );
  }

  slugExists(slug: string, exceptSlug?: string): boolean {
    if (!slug) return false;
    if (exceptSlug && slug === exceptSlug) return false;
    if (this.apiCache()?.some((p) => p.slug === slug)) return true;
    if (JOIAS_PIECES.some((p) => p.slug === slug)) return true;
    return Boolean(this.store().patches[slug]);
  }

  resetAll(): void {
    this.persist(emptyStore());
    this.apiCache.set(null);
  }

  moveInList(slug: string, direction: -1 | 1, visibleSlugs: string[]): boolean {
    const vis = visibleSlugs.filter(Boolean);
    const vi = vis.indexOf(slug);
    const vj = vi + direction;
    if (vi < 0 || vj < 0 || vj >= vis.length) return false;
    const neighbour = vis[vj]!;
    const order = [...this.ensureOrder()];
    const i = order.indexOf(slug);
    const j = order.indexOf(neighbour);
    if (i < 0 || j < 0) return false;
    order[i] = neighbour;
    order[j] = slug;
    this.persist({ ...this.store(), order });
    return true;
  }

  /** Public site reads through this. Archived local patches stay off the site. */
  applyTo(seed: JoiaPiece[]): JoiaPiece[] {
    return this.merge(seed, this.store()).filter((p) => !p.archivedAt);
  }

  thumbOf(piece: JoiaPiece): string {
    return joiaGallery(piece)[0] ?? piece.image ?? '';
  }

  private patchApiCache(piece: JoiaPiece): void {
    const cached = this.apiCache();
    if (!cached) {
      this.apiCache.set([piece]);
      return;
    }
    this.apiCache.set(cached.map((p) => (p.slug === piece.slug ? piece : p)));
  }

  private ensureOrder(): string[] {
    const existing = this.store().order;
    if (existing?.length) return existing;
    return JOIAS_PIECES.map((p) => p.slug);
  }

  private merge(seed: JoiaPiece[], store: AdminJoiasStore): JoiaPiece[] {
    const bySlug = new Map(seed.map((p) => [p.slug, p]));
    for (const [slug, patch] of Object.entries(store.patches)) {
      bySlug.set(slug, patch);
    }
    const list = [...bySlug.values()];
    if (store.order?.length) {
      const rank = new Map(store.order.map((s, i) => [s, i]));
      return list.sort((a, b) => {
        const ra = rank.has(a.slug) ? rank.get(a.slug)! : 10_000;
        const rb = rank.has(b.slug) ? rank.get(b.slug)! : 10_000;
        if (ra !== rb) return ra - rb;
        return a.slug.localeCompare(b.slug);
      });
    }
    return list;
  }

  private persist(next: AdminJoiasStore): void {
    writeStore(next);
    this.store.set(next);
    this.syncHasOverrides(next);
  }

  private syncHasOverrides(store: AdminJoiasStore): void {
    this.hasOverrides.set(
      Object.keys(store.patches).length > 0 || Boolean(store.order?.length),
    );
  }
}
