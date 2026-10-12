import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, switchMap, tap } from 'rxjs';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import { adminCollectionPath, adminNewCollectionPath } from '../../core/routes';
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
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
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';

@Component({
  selector: 'lc-admin-collections',
  standalone: true,
  imports: [FormsModule, RouterLink],
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
  readonly newPath = adminNewCollectionPath();

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
    this.load$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap((archived) => endAdminLoad(this.api.list(archived))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.collections.set(result.value);
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

  ngOnInit(): void {
    this.reload();
  }

  editPath(slug: string): string {
    return adminCollectionPath(slug);
  }

  publishedLabel(c: AdminCollectionDto): string {
    if (isArchivedAt(c.archivedAt)) return 'Arquivada';
    return c.publishedAt ? 'Publicada' : 'Rascunho';
  }

  onArchivedFilter(show: boolean): void {
    this.showArchived.set(show);
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
    this.restoringSlug.set(c.slug);
    this.collections.set(removeBySlug(this.collections(), c.slug));
    this.api.restore(c.slug).subscribe({
      next: (restored) => {
        this.restoringSlug.set(null);
        if (!this.showArchived()) {
          this.collections.set(upsertBySlug(this.collections(), { ...restored, archivedAt: null }));
        }
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.restoringSlug.set(null);
        this.collections.set(upsertBySlug(this.collections(), c));
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
}
