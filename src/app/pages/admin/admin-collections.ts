import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import { adminCollectionPath, adminNewCollectionPath } from '../../core/routes';
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import {
  archiveAwareError,
  confirmArchiveCollection,
  showArchiveUndo,
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

  readonly query = signal('');
  readonly showArchived = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
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

  ngOnInit(): void {
    this.reload();
  }

  editPath(slug: string): string {
    return adminCollectionPath(slug);
  }

  publishedLabel(c: AdminCollectionDto): string {
    return c.publishedAt ? 'Publicada' : 'Rascunho';
  }

  onArchivedFilter(show: boolean): void {
    this.showArchived.set(show);
    this.reload();
  }

  async archive(c: AdminCollectionDto): Promise<void> {
    const ok = await confirmArchiveCollection(this.confirm, c.productCount ?? 0);
    if (!ok) return;
    this.api.archive(c.slug).subscribe({
      next: () => {
        this.reload();
        showArchiveUndo(this.toast, () => this.restore(c.slug));
      },
      error: (err) => {
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível arquivar.')),
        );
      },
    });
  }

  restore(slug: string): void {
    this.api.restore(slug).subscribe({
      next: () => {
        this.reload();
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
        );
      },
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.showArchived()).subscribe({
      next: (list) => {
        this.collections.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as coleções. Verifique se a API está no ar.');
        this.loading.set(false);
      },
    });
  }
}
