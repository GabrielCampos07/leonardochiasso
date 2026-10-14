import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LcSegmented } from '../../shared/components/segmented/segmented';
import { Subject, switchMap, tap } from 'rxjs';
import {
  AdminCatalogService,
  adminHttpErrorMessage,
  slugFromCollection,
} from '../../core/admin-catalog.service';
import {
  AdminCollectionOrderService,
  collectionOrderErrorMessage,
} from '../../core/admin-collection-order.service';
import { CatalogService } from '../../core/catalog.service';
import {
  GENDER_FILTER_OPTIONS,
  GENDER_ORDER_SAVED_TEXT,
  GENDER_ORDER_UNDO_LABEL,
  GENDER_ORDER_UNDO_MS,
  GenderFilter,
  MASCULINO_UNISSEX_NOTICE,
  TODOS_DRAG_HINT,
  applyProductIdOrder,
  canReorderWithFilter,
  coarsePointerDragDelay,
  matchesGenderFilter,
  orderProductId,
  productGender,
} from '../../core/product-gender';
import { COLLECTIONS, Collection, Product } from '../../core/product.model';
import {
  ADMIN_PRODUCT_COLLECTION_QUERY,
  adminNewProductPath,
  adminProductPath,
} from '../../core/routes';
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
import { itemMidpoints, resolveCdkDropIndex } from '../../core/cdk-drop-index';
import { hangerPriceFromFields } from '../../scene-engine/hanger-price';
import { isSoldOut } from '../../scene-engine/types';

@Component({
  selector: 'lc-admin-products',
  standalone: true,
  imports: [FormsModule, RouterLink, DragDropModule, LcSegmented],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProductsPage implements OnInit {
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly collectionOrder = inject(AdminCollectionOrderService);
  private readonly catalog = inject(CatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly load$ = new Subject<boolean>();

  readonly query = signal('');
  readonly category = signal<GenderFilter>('todos');
  readonly collection = signal<'todas' | string>('todas');
  readonly genderFilters = GENDER_FILTER_OPTIONS;
  readonly highlightGender = signal(false);
  readonly todosHint = signal('');
  readonly showUnissexNotice = computed(() => this.category() === 'masculino');
  readonly unissexNotice = MASCULINO_UNISSEX_NOTICE;
  readonly dragStartDelay = coarsePointerDragDelay();
  readonly canDrag = computed(() => canReorderWithFilter(this.category()));
  readonly showArchived = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly restoringSlug = signal<string | null>(null);
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
      if (!matchesGenderFilter(p, cat)) return false;
      if (col !== 'todas' && p.collection !== col && p.collectionSlug !== col) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  constructor() {
    this.load$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap((archived) => endAdminLoad(this.adminCatalog.list$(archived))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.products.set(result.value);
          if (!this.useApi) this.catalog.refreshLocalCatalog();
          this.applyCollectionGenderOrder();
          return;
        }
        this.error.set(
          adminLoadErrorMessage(
            result.error,
            adminHttpErrorMessage(result.error, 'Não foi possível carregar os produtos.'),
          ),
        );
      });
  }

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
    return hangerPriceFromFields(p);
  }

  soldOut(p: Product): boolean {
    return isSoldOut(p.stockQty);
  }

  genderLabel(p: Product): string {
    return productGender(p);
  }

  setGenderFilter(raw: string): void {
    const next: GenderFilter = raw === 'masculino' || raw === 'feminino' ? raw : 'todos';
    this.category.set(next);
    this.todosHint.set('');
    this.highlightGender.set(false);
    this.applyCollectionGenderOrder();
  }

  setCollectionFilter(raw: string): void {
    this.collection.set(raw || 'todas');
    this.applyCollectionGenderOrder();
  }

  onTodosDragAttempt(event?: Event): void {
    if (this.canDrag()) return;
    event?.preventDefault();
    event?.stopPropagation();
    this.todosHint.set(TODOS_DRAG_HINT);
    this.highlightGender.set(true);
  }


  private collectionSlugForOrder(): string | null {
    const col = this.collection();
    if (col === 'todas') return null;
    return slugFromCollection(col as Collection);
  }

  private applyCollectionGenderOrder(): void {
    const slug = this.collectionSlugForOrder();
    const filter = this.category();
    if (!slug || !canReorderWithFilter(filter)) return;
    this.collectionOrder.get(slug, filter).subscribe({
      next: (res) => {
        if (!res.productIds.length) return;
        const visible = applyProductIdOrder(this.filtered(), res.productIds);
        this.applyVisibleOrderLocal(visible.map((p) => p.slug));
      },
      error: (err) => {
        this.toast.error(collectionOrderErrorMessage(err, 'Não foi possível carregar a ordem.'));
      },
    });
  }

  onArchivedFilter(show: boolean): void {
    this.showArchived.set(show);
    this.refresh();
  }

  async archive(slug: string): Promise<void> {
    const ok = await confirmArchivePiece(this.confirm);
    if (!ok) return;
    const current = this.products().find((p) => p.slug === slug);
    if (!current) return;
    const index = this.products().findIndex((p) => p.slug === slug);
    this.products.set(removeBySlug(this.products(), slug));
    this.adminCatalog.archiveViaApi(slug).subscribe({
      next: (saved) => {
        showArchiveUndo(this.toast, () => this.undoArchive(saved, index));
      },
      error: (err) => {
        this.products.set(insertAt(this.products(), index, current));
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível arquivar.')),
        );
      },
    });
  }

  restore(product: Product): void {
    if (this.restoringSlug()) return;
    this.restoringSlug.set(product.slug);
    this.adminCatalog.restoreViaApi(product.slug).subscribe({
      next: (restored) => {
        this.restoringSlug.set(null);
        this.products.set(removeBySlug(this.products(), product.slug));
        if (!this.showArchived()) {
          this.products.set(upsertBySlug(this.products(), { ...restored, archivedAt: null }));
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

  private undoArchive(snapshot: Product, index: number): void {
    const live = { ...snapshot, archivedAt: null };
    this.products.set(insertAt(this.products(), index < 0 ? 0 : index, live));
    this.adminCatalog.restoreViaApi(snapshot.slug).subscribe({
      next: (restored) => {
        this.products.set(upsertBySlug(this.products(), { ...restored, archivedAt: null }));
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.products.set(removeBySlug(this.products(), snapshot.slug));
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
        );
      },
    });
  }

  refresh(): void {
    this.load$.next(this.showArchived());
  }

  drop(event: CdkDragDrop<Product[]>): void {
    if (!this.canDrag()) {
      this.onTodosDragAttempt();
      return;
    }
    const visible = [...this.filtered()];
    const currentIndex = resolveCdkDropIndex(
      event,
      visible.length,
      itemMidpoints(
        event.container.getSortedItems().map((item) => item.element.nativeElement.getBoundingClientRect()),
      ),
    );
    if (event.previousIndex === currentIndex) return;
    const previousIds = visible.map(orderProductId);
    moveItemInArray(visible, event.previousIndex, currentIndex);
    this.applyVisibleOrder(visible.map((p) => p.slug), previousIds);
  }

  move(slug: string, direction: -1 | 1): void {
    if (!this.canDrag()) {
      this.onTodosDragAttempt();
      return;
    }
    const vis = this.filtered().map((p) => p.slug);
    const vi = vis.indexOf(slug);
    const vj = vi + direction;
    if (vi < 0 || vj < 0 || vj >= vis.length) return;
    const previousIds = this.filtered().map(orderProductId);
    const nextVis = [...vis];
    nextVis[vi] = vis[vj]!;
    nextVis[vj] = slug;
    this.applyVisibleOrder(nextVis, previousIds);
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
  private applyVisibleOrder(visibleSlugs: string[], previousIds?: string[]): void {
    this.applyVisibleOrderLocal(visibleSlugs);

    const filter = this.category();
    const collectionSlug = this.collectionSlugForOrder();
    if (collectionSlug && canReorderWithFilter(filter)) {
      const productIds = this.filtered().map(orderProductId);
      this.savingOrder.set(true);
      this.collectionOrder.put(collectionSlug, filter, productIds).subscribe({
        next: () => {
          this.savingOrder.set(false);
          this.toast.success(GENDER_ORDER_SAVED_TEXT, {
            durationMs: GENDER_ORDER_UNDO_MS,
            action: previousIds
              ? {
                  label: GENDER_ORDER_UNDO_LABEL,
                  run: () => this.restoreCollectionOrder(previousIds),
                }
              : undefined,
          });
        },
        error: (err) => {
          this.savingOrder.set(false);
          if (previousIds) {
            this.applyVisibleOrderLocal(
              applyProductIdOrder(this.filtered(), previousIds).map((p) => p.slug),
            );
          } else {
            this.refresh();
          }
          this.toast.error(collectionOrderErrorMessage(err));
        },
      });
      return;
    }

    const nextFull = this.products().map((p) => p.slug);
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

  private applyVisibleOrderLocal(visibleSlugs: string[]): void {
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
  }

  private restoreCollectionOrder(previousIds: string[]): void {
    const slug = this.collectionSlugForOrder();
    const filter = this.category();
    if (!slug || !canReorderWithFilter(filter)) return;
    const restored = applyProductIdOrder(this.filtered(), previousIds);
    this.applyVisibleOrderLocal(restored.map((p) => p.slug));
    this.savingOrder.set(true);
    this.collectionOrder.put(slug, filter, restored.map(orderProductId)).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.toast.success('Ordem restaurada.');
      },
      error: (err) => {
        this.savingOrder.set(false);
        this.toast.error(collectionOrderErrorMessage(err));
        this.refresh();
      },
    });
  }

  private flash(msg: string): void {
    this.toast.success(msg);
  }
}
