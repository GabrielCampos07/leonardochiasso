import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import {
  coversByCollectionSlug,
  mergeCoverProducts,
  resolveCollectionCover,
} from '../../core/collection-cover';
import { ApiProductDto } from '../../core/catalog.service';
import { adminCollectionPath, adminNewCollectionPath } from '../../core/routes';
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import { CollectionCover } from '../../shared/components/collection-cover/collection-cover';
import {
  adminLoadErrorMessage,
  archiveAwareError,
  confirmArchiveCollection,
  endAdminLoad,
  insertAt,
  isArchivedAt,
  removeBySlug,
  showArchiveUndo,
  upsertBySlug,
} from '../../core/admin-archive';
import {
  ADMIN_LIST_SKELETON_ROWS,
  adminListCacheKey,
  readAdminListCache,
  writeAdminListCache,
} from '../../core/admin-list-cache';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';

@Component({
  selector: 'lc-admin-collections',
  standalone: true,
  imports: [FormsModule, RouterLink, CollectionCover],
  templateUrl: './admin-collections.html',
  styleUrl: './admin-products.scss',
})
export class AdminCollectionsPage implements OnInit {
  private readonly api = inject(AdminCollectionsApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly load$ = new Subject<boolean>();

  readonly query = signal('');
  readonly showArchived = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly restoringSlug = signal<string | null>(null);
  readonly collections = signal<AdminCollectionDto[]>([]);
  readonly covers = signal<Record<string, string | null>>({});
  private coverProducts: ApiProductDto[] = [];
  readonly newPath = adminNewCollectionPath();
  readonly skeletonRows = Array.from({ length: ADMIN_LIST_SKELETON_ROWS }, (_, i) => i);
  readonly showSkeleton = computed(() => this.loading() && this.collections().length === 0);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.collections();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    this.hydrateFromCache(this.showArchived());
    this.load$
      .pipe(
        tap(() => {
          if (!this.collections().length) this.loading.set(true);
          this.error.set('');
        }),
        switchMap((archived) => endAdminLoad(this.api.list(archived))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.collections.set(result.value);
          writeAdminListCache(adminListCacheKey('collections', this.showArchived()), result.value);
          this.refreshCovers();
          return;
        }
        this.error.set(
          adminLoadErrorMessage(
            result.error,
            'Não foi possível carregar as coleções. Verifique se a API está no ar.',
          ),
        );
      });
  }

  private hydrateFromCache(archived: boolean): void {
    const cached = readAdminListCache<AdminCollectionDto>(adminListCacheKey('collections', archived));
    if (!cached?.length) return;
    this.collections.set(cached);
    this.loading.set(false);
  }

  ngOnInit(): void {
    this.reload();
  }

  editPath(slug: string): string {
    return adminCollectionPath(slug);
  }

  coverOf(slug: string): string | null {
    const collection = this.collections().find((row) => row.slug === slug);
    if (collection) {
      return (
        resolveCollectionCover({
          collection,
          products: this.coverProducts,
        }) ?? this.covers()[slug] ?? null
      );
    }
    return this.covers()[slug] ?? null;
  }

  publishedLabel(c: AdminCollectionDto): string {
    if (isArchivedAt(c.archivedAt)) return 'Arquivada';
    return c.publishedAt ? 'Publicada' : 'Rascunho';
  }

  onArchivedFilter(show: boolean): void {
    this.showArchived.set(show);
    this.hydrateFromCache(show);
    this.reload();
  }

  reload(): void {
    this.load$.next(this.showArchived());
  }

  async archive(c: AdminCollectionDto): Promise<void> {
    const ok = await confirmArchiveCollection(this.confirm, c.productCount ?? 0);
    if (!ok) return;
    const index = this.collections().findIndex((row) => row.slug === c.slug);
    this.collections.set(removeBySlug(this.collections(), c.slug));
    this.api.archive(c.slug).subscribe({
      next: () => {
        showArchiveUndo(this.toast, () => this.undoArchive(c, index));
      },
      error: (err) => {
        this.collections.set(insertAt(this.collections(), index, c));
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível arquivar.')),
        );
      },
    });
  }

  restore(c: AdminCollectionDto): void {
    if (this.restoringSlug()) return;
    this.restoringSlug.set(c.slug);
    this.api.restore(c.slug).subscribe({
      next: (restored) => {
        this.restoringSlug.set(null);
        this.collections.set(removeBySlug(this.collections(), c.slug));
        if (!this.showArchived()) {
          this.collections.set(upsertBySlug(this.collections(), { ...restored, archivedAt: null }));
        }
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.restoringSlug.set(null);
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
        );
      },
    });
  }

  private undoArchive(snapshot: AdminCollectionDto, index: number): void {
    const live = { ...snapshot, archivedAt: null };
    this.collections.set(insertAt(this.collections(), index < 0 ? 0 : index, live));
    this.api.restore(snapshot.slug).subscribe({
      next: (restored) => {
        this.collections.set(
          upsertBySlug(this.collections(), { ...restored, archivedAt: null }),
        );
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.collections.set(removeBySlug(this.collections(), snapshot.slug));
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
        );
      },
    });
  }

  private refreshCovers(): void {
    forkJoin({
      admin: this.api.listAdminProducts().pipe(catchError(() => of([] as ApiProductDto[]))),
      published: this.api.listPublicProducts().pipe(catchError(() => of([] as ApiProductDto[]))),
    }).subscribe(({ admin, published }) => {
      this.coverProducts = mergeCoverProducts(admin, published);
      this.covers.set(coversByCollectionSlug(this.coverProducts, this.collections()));
    });
  }
}
