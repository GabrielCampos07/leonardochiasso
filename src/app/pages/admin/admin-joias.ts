import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, switchMap, tap } from 'rxjs';
import { AdminJoiasCatalogService } from '../../core/admin-joias-catalog.service';
import { JoiaPiece } from '../../core/joias.data';
import { adminJoiaPath, adminNewJoiaPath, ROUTES } from '../../core/routes';
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import {
  adminLoadErrorMessage,
  archiveAwareError,
  confirmArchivePiece,
  endAdminLoad,
  insertAt,
  removeBySlug,
  showArchiveUndo,
  upsertBySlug,
} from '../../core/admin-archive';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';

@Component({
  selector: 'lc-admin-joias',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-joias.html',
  styleUrl: './admin-products.scss',
})
export class AdminJoiasPage implements OnInit {
  private readonly catalog = inject(AdminJoiasCatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);
  private readonly load$ = new Subject<boolean>();

  readonly query = signal('');
  readonly showArchived = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly restoringSlug = signal<string | null>(null);
  readonly newPath = adminNewJoiaPath();
  readonly siteJoias = ROUTES.joias;
  readonly pieces = signal<JoiaPiece[]>(this.catalog.list());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.pieces().filter((p) => {
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.medium ?? '').toLowerCase().includes(q)
      );
    });
  });

  constructor() {
    this.load$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap((archived) => endAdminLoad(this.catalog.list$(archived))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.pieces.set(result.value);
          return;
        }
        this.pieces.set(this.catalog.list(this.showArchived()));
        this.error.set(
          adminLoadErrorMessage(result.error, 'Não foi possível carregar as joias.'),
        );
      });
  }

  ngOnInit(): void {
    this.refresh();
  }

  editPath(slug: string): string {
    return adminJoiaPath(slug);
  }

  thumb(p: JoiaPiece): string {
    return this.catalog.thumbOf(p);
  }

  onArchivedFilter(show: boolean): void {
    this.showArchived.set(show);
    this.refresh();
  }

  async archive(slug: string): Promise<void> {
    const ok = await confirmArchivePiece(this.confirm);
    if (!ok) return;
    const current = this.pieces().find((p) => p.slug === slug);
    if (!current) return;
    const index = this.pieces().findIndex((p) => p.slug === slug);
    this.pieces.set(removeBySlug(this.pieces(), slug));
    this.catalog.archive(slug).subscribe({
      next: (saved) => {
        showArchiveUndo(this.toast, () => this.undoArchive(saved, index));
      },
      error: (err) => {
        this.pieces.set(insertAt(this.pieces(), index, current));
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível arquivar.')),
        );
      },
    });
  }

  restore(piece: JoiaPiece): void {
    if (this.restoringSlug()) return;
    this.restoringSlug.set(piece.slug);
    this.catalog.restore(piece.slug).subscribe({
      next: (restored) => {
        this.restoringSlug.set(null);
        this.pieces.set(removeBySlug(this.pieces(), piece.slug));
        if (!this.showArchived()) {
          this.pieces.set(upsertBySlug(this.pieces(), { ...restored, archivedAt: null }));
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

  private undoArchive(snapshot: JoiaPiece, index: number): void {
    const live = { ...snapshot, archivedAt: null };
    this.pieces.set(insertAt(this.pieces(), index < 0 ? 0 : index, live));
    this.catalog.restore(snapshot.slug).subscribe({
      next: (restored) => {
        this.pieces.set(upsertBySlug(this.pieces(), { ...restored, archivedAt: null }));
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.pieces.set(removeBySlug(this.pieces(), snapshot.slug));
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
        );
      },
    });
  }

  refresh(): void {
    this.load$.next(this.showArchived());
  }

  move(slug: string, direction: -1 | 1): void {
    const ok = this.catalog.moveInList(
      slug,
      direction,
      this.filtered().map((p) => p.slug),
    );
    if (!ok) return;
    this.refresh();
    this.flash('Ordem atualizada.');
  }

  async resetAll(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Restaurar joias',
      message: 'Tem certeza? Isso apaga alterações locais das joias e volta ao catálogo original.',
      confirmLabel: 'Restaurar',
      destructive: true,
    });
    if (!ok) return;
    this.catalog.resetAll();
    this.refresh();
    this.flash('Joias restauradas.');
  }

  private flash(msg: string): void {
    this.toast.success(msg);
  }
}
