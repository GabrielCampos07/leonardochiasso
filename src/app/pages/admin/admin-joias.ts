import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminJoiasCatalogService } from '../../core/admin-joias-catalog.service';
import { JoiaPiece } from '../../core/joias.data';
import { adminJoiaPath, adminNewJoiaPath, ROUTES } from '../../core/routes';
import { adminHttpErrorMessage } from '../../core/admin-catalog.service';
import { confirmArchivePiece, showArchiveUndo } from '../../core/admin-archive';
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

  readonly query = signal('');
  readonly showArchived = signal(false);
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
    this.catalog.archive(slug).subscribe({
      next: () => {
        this.refresh();
        showArchiveUndo(this.toast, () => this.restore(slug));
      },
      error: (err) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível arquivar.'));
      },
    });
  }

  restore(slug: string): void {
    this.catalog.restore(slug).subscribe({
      next: () => {
        this.refresh();
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível restaurar.'));
      },
    });
  }

  refresh(): void {
    this.catalog.list$(this.showArchived()).subscribe({
      next: (list) => this.pieces.set(list),
      error: () => this.pieces.set(this.catalog.list(this.showArchived())),
    });
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
