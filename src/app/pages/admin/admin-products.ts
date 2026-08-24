import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminCatalogService,
  adminHttpErrorMessage,
  slugFromCollection,
} from '../../core/admin-catalog.service';
import { CatalogService } from '../../core/catalog.service';
import { COLLECTIONS, Collection, Product } from '../../core/product.model';
import {
  ADMIN_PRODUCT_COLLECTION_QUERY,
  adminNewProductPath,
  adminProductPath,
} from '../../core/routes';
import { displayPriceLabel } from '../../core/pricing';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';

@Component({
  selector: 'lc-admin-products',
  standalone: true,
  imports: [FormsModule, RouterLink, DragDropModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProductsPage implements OnInit {
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly catalog = inject(CatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly query = signal('');
  readonly category = signal<'todos' | 'feminino' | 'masculino'>('todos');
  readonly collection = signal<'todas' | string>('todas');
  readonly loading = signal(true);
  readonly savingOrder = signal(false);
  readonly useApi = this.adminCatalog.useApi;
  readonly collections = COLLECTIONS;
  readonly newPath = adminNewProductPath();

  readonly products = signal<Product[]>([]);

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

  ngOnInit(): void {
    this.refresh();
  }

  editPath(slug: string): string {
    return adminProductPath(slug);
  }

  /** When a collection filter is active, pass `?colecao=` into the new-product form. */
  newQueryParams(): Record<string, string> | null {
    const col = this.collection();
    if (col === 'todas') return null;
    const slug = slugFromCollection(col as Collection);
    return { [ADMIN_PRODUCT_COLLECTION_QUERY]: slug };
  }

  priceLabel(p: Product): string {
    return displayPriceLabel(p.priceLabel);
  }

  refresh(): void {
    this.loading.set(true);
    this.adminCatalog.list$().subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
        if (!this.useApi) this.catalog.refreshLocalCatalog();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível carregar os produtos.'));
      },
    });
  }

  drop(event: CdkDragDrop<Product[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const visible = [...this.filtered()];
    moveItemInArray(visible, event.previousIndex, event.currentIndex);
    this.applyVisibleOrder(visible.map((p) => p.slug));
  }

  move(slug: string, direction: -1 | 1): void {
    const vis = this.filtered().map((p) => p.slug);
    const vi = vis.indexOf(slug);
    const vj = vi + direction;
    if (vi < 0 || vj < 0 || vj >= vis.length) return;
    const nextVis = [...vis];
    nextVis[vi] = vis[vj]!;
    nextVis[vj] = slug;
    this.applyVisibleOrder(nextVis);
  }

  async resetAll(): Promise<void> {
    if (this.useApi) {
      this.toast.info('Com a API ativa, a ordem fica no banco — use arrastar ou ↑↓.');
      return;
    }
    const ok = await this.confirm.confirm({
      title: 'Restaurar catálogo',
      message: 'Tem certeza? Isso apaga todas as alterações feitas aqui e volta ao catálogo original.',
      confirmLabel: 'Restaurar',
      destructive: true,
    });
    if (!ok) return;
    this.adminCatalog.resetAll();
    this.refresh();
    this.flash('Catálogo restaurado.');
  }

  /** Map filtered order back onto the full product list. */
  private applyVisibleOrder(visibleSlugs: string[]): void {
    const fullSlugs = this.products().map((p) => p.slug);
    const visibleSet = new Set(visibleSlugs);
    const nextFull: string[] = [];
    let vi = 0;
    for (const slug of fullSlugs) {
      if (visibleSet.has(slug)) nextFull.push(visibleSlugs[vi++]!);
      else nextFull.push(slug);
    }

    const bySlug = new Map(this.products().map((p) => [p.slug, p]));
    this.products.set(nextFull.map((s) => bySlug.get(s)!).filter(Boolean));
    this.adminCatalog.setOrder(nextFull);

    if (!this.useApi) {
      this.catalog.refreshLocalCatalog();
      this.flash('Ordem atualizada.');
      return;
    }

    this.savingOrder.set(true);
    this.adminCatalog.reorderViaApi(nextFull).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.flash('Ordem atualizada.');
      },
      error: (err) => {
        this.savingOrder.set(false);
        this.refresh();
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível salvar a ordem.'));
      },
    });
  }

  private flash(msg: string): void {
    this.toast.success(msg);
  }
}
