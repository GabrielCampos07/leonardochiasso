import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminJoiasCatalogService } from '../../core/admin-joias-catalog.service';
import { JoiaPiece } from '../../core/joias.data';
import { adminJoiaPath, adminNewJoiaPath, ROUTES } from '../../core/routes';

@Component({
  selector: 'lc-admin-joias',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-joias.html',
  styleUrl: './admin-products.scss',
})
export class AdminJoiasPage {
  private readonly catalog = inject(AdminJoiasCatalogService);

  readonly query = signal('');
  readonly toast = signal('');
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

  editPath(slug: string): string {
    return adminJoiaPath(slug);
  }

  thumb(p: JoiaPiece): string {
    return this.catalog.thumbOf(p);
  }

  refresh(): void {
    this.pieces.set(this.catalog.list());
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

  resetAll(): void {
    const ok = window.confirm(
      'Tem certeza? Isso apaga alterações locais das joias e volta ao catálogo original.',
    );
    if (!ok) return;
    this.catalog.resetAll();
    this.refresh();
    this.flash('Joias restauradas.');
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    window.setTimeout(() => this.toast.set(''), 3200);
  }
}
