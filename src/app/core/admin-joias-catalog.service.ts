import { Injectable, signal } from '@angular/core';
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
  private store = signal<AdminJoiasStore>(readStore());
  readonly hasOverrides = signal(false);

  constructor() {
    this.syncHasOverrides(this.store());
  }

  list(): JoiaPiece[] {
    return this.merge(JOIAS_PIECES, this.store());
  }

  get(slug: string): JoiaPiece | undefined {
    return this.list().find((p) => p.slug === slug);
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

  slugExists(slug: string, exceptSlug?: string): boolean {
    if (!slug) return false;
    if (exceptSlug && slug === exceptSlug) return false;
    if (JOIAS_PIECES.some((p) => p.slug === slug)) return true;
    return Boolean(this.store().patches[slug]);
  }

  resetAll(): void {
    this.persist(emptyStore());
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

  /** Public site reads through this. */
  applyTo(seed: JoiaPiece[]): JoiaPiece[] {
    return this.merge(seed, this.store());
  }

  thumbOf(piece: JoiaPiece): string {
    return joiaGallery(piece)[0] ?? piece.image ?? '';
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
