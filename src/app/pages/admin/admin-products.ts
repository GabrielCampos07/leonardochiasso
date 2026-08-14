import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { CatalogService } from '../../core/catalog.service';
import { COLLECTIONS, Product } from '../../core/product.model';
import { adminNewProductPath, adminProductPath } from '../../core/routes';
import { displayPriceLabel } from '../../core/pricing';

@Component({
  selector: 'lc-admin-products',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProductsPage {
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly catalog = inject(CatalogService);

  readonly query = signal('');
  readonly category = signal<'todos' | 'feminino' | 'masculino'>('todos');
  readonly collection = signal<'todas' | string>('todas');
  readonly toast = signal('');
  readonly collections = COLLECTIONS;
  readonly newPath = adminNewProductPath();

  readonly products = signal<Product[]>(this.adminCatalog.list());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    const col = this.collection();
    return this.products().filter((p) => {
      if (cat !== 'todos' && p.category !== cat) return false;
      if (col !== 'todas' && p.collection !== col && p.collectionSlug !== col) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  editPath(slug: string): string {
    return adminProductPath(slug);
  }

  priceLabel(p: Product): string {
    return displayPriceLabel(p.priceLabel);
  }

  refresh(): void {
    this.products.set(this.adminCatalog.list());
    this.catalog.refreshLocalCatalog();
  }

  move(slug: string, direction: -1 | 1): void {
    const ok = this.adminCatalog.moveInList(
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
      'Tem certeza? Isso apaga todas as alterações feitas aqui e volta ao catálogo original.',
    );
    if (!ok) return;
    this.adminCatalog.resetAll();
    this.refresh();
    this.flash('Catálogo restaurado.');
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    window.setTimeout(() => this.toast.set(''), 3200);
  }
}
