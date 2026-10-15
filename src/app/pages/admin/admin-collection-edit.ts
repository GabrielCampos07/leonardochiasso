import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ADMIN_LIST_SKELETON_ROWS,
  adminListCacheKey,
  readAdminCache,
  writeAdminCache,
} from '../../core/admin-list-cache';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import {
  AdminCollectionOrderService,
  collectionOrderErrorMessage,
} from '../../core/admin-collection-order.service';
import { AdminCollectionProductsService } from '../../core/admin-collection-products';
import { ApiProductDto } from '../../core/catalog.service';
import { productBelongsToCollection, resolveCollectionCover } from '../../core/collection-cover';
import { CollectionCover } from '../../shared/components/collection-cover/collection-cover';
import { LcSegmented } from '../../shared/components/segmented/segmented';
import {
  ADMIN_NEW_COLLECTION_SLUG,
  ADMIN_NEW_PRODUCT_SLUG,
  ADMIN_PRODUCT_COLLECTION_QUERY,
  ROUTES,
  adminCollectionPath,
  adminProductPath,
} from '../../core/routes';
import {
  adminLoadErrorMessage,
  archiveAwareError,
  confirmArchiveCollection,
  endAdminLoad,
  isArchivedAt,
  showArchiveUndo,
} from '../../core/admin-archive';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ERROR_TOAST_MS, ToastService } from '../../core/feedback/toast.service';
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
  livePiecesForOrder,
  matchesGenderFilter,
  orderProductIds,
  productGender,
} from '../../core/product-gender';
import { applyCdkListOrder, itemMidpoints, resolveCdkDropIndex } from '../../core/cdk-drop-index';
import {
  LISTA_ORDER_MAINTENANCE_NOTICE,
  LISTA_REORDER_ENABLED,
  sortByMembershipSortOrder,
} from '../../core/membership-order';
import { isSoldOut } from '../../scene-engine/types';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

@Component({
  selector: 'lc-admin-collection-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, DragDropModule, CollectionCover, LcSegmented],
  templateUrl: './admin-collection-edit.html',
  styleUrls: ['./admin-product-edit.scss', './admin-products.scss', './admin-collection-edit.scss'],
})
export class AdminCollectionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminCollectionsApiService);
  private readonly collectionProducts = inject(AdminCollectionProductsService);
  private readonly collectionOrder = inject(AdminCollectionOrderService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly genderFilters = GENDER_FILTER_OPTIONS;
  readonly genderFilter = signal<GenderFilter>('todos');
  readonly highlightGender = signal(false);
  readonly todosHint = signal('');
  readonly unissexNotice = MASCULINO_UNISSEX_NOTICE;
  /** Set `LISTA_REORDER_ENABLED` to true in membership-order.ts to restore Subir/Descer/drag. */
  readonly listaReorderEnabled = LISTA_REORDER_ENABLED;
  readonly orderMaintenanceNotice = LISTA_ORDER_MAINTENANCE_NOTICE;
  readonly showUnissexNotice = computed(() => this.genderFilter() === 'masculino');
  readonly dragStartDelay = coarsePointerDragDelay();
  readonly orderLoading = signal(false);

  readonly listPath = ROUTES.adminCollections;
  readonly newProductPath = adminProductPath(ADMIN_NEW_PRODUCT_SLUG);
  readonly isNew = signal(false);
  readonly missing = signal(false);
  readonly loading = signal(true);
  readonly skeletonRows = Array.from({ length: ADMIN_LIST_SKELETON_ROWS }, (_, i) => i);
  readonly showSkeleton = computed(() => this.loading() && this.products().length === 0);
  readonly saving = signal(false);
  readonly restoring = signal(false);
  readonly error = signal('');
  readonly archivedAt = signal<string | null>(null);
  readonly isArchived = computed(() => isArchivedAt(this.archivedAt()));

  readonly slug = signal('');
  name = '';
  description = '';
  published = false;
  private originalPublishedAt: string | null = null;
  private slugLocked = false;

  readonly products = signal<ApiProductDto[]>([]);
  readonly visibleProducts = signal<ApiProductDto[]>([]);
  readonly canDrag = computed(
    () =>
      LISTA_REORDER_ENABLED &&
      canReorderWithFilter(this.genderFilter()) &&
      !this.loading() &&
      !this.orderLoading(),
  );
  readonly coverUrl = computed(() =>
    resolveCollectionCover({
      collection: {
        slug: this.slug(),
        name: this.name,
      },
      products: this.products().map((p, index) => ({
        ...p,
        sortOrder: index,
      })),
    }),
  );
  readonly savingOrder = signal(false);
  readonly orderError = signal('');
  private loadGen = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const param = params.get('slug') ?? '';
      this.slugLocked = false;
      this.error.set('');
      if (param === ADMIN_NEW_COLLECTION_SLUG) {
        this.loadGen += 1;
        this.isNew.set(true);
        this.missing.set(false);
        this.loading.set(false);
        this.slug.set('');
        this.name = '';
        this.description = '';
        this.published = false;
        this.originalPublishedAt = null;
        this.archivedAt.set(null);
        this.products.set([]);
        this.visibleProducts.set([]);
        return;
      }
      this.isNew.set(false);
      this.slug.set(param);
      this.loadExisting(param);
    });
  }

  collectionQuery(): Record<string, string> {
    return { [ADMIN_PRODUCT_COLLECTION_QUERY]: this.slug() };
  }

  productEditPath(productSlug: string): string {
    return adminProductPath(productSlug);
  }

  soldOut(p: ApiProductDto): boolean {
    return isSoldOut(p.stockQty);
  }

  genderLabel(p: ApiProductDto): string {
    return productGender(p);
  }

  setGenderFilter(raw: string): void {
    const next = raw === 'masculino' || raw === 'feminino' ? raw : 'todos';
    this.genderFilter.set(next);
    this.todosHint.set('');
    this.highlightGender.set(false);
    this.refreshVisible();
  }

  onTodosDragAttempt(event?: Event): void {
    if (this.loading() || this.orderLoading() || this.savingOrder()) {
      event?.preventDefault();
      event?.stopPropagation();
      return;
    }
    if (this.canDrag()) return;
    event?.preventDefault();
    event?.stopPropagation();
    this.todosHint.set(TODOS_DRAG_HINT);
    this.highlightGender.set(true);
  }

  onNameChange(value: string): void {
    this.name = value;
    if (this.isNew() && !this.slugLocked) {
      this.slug.set(slugify(value));
    }
  }

  onSlugChange(value: string): void {
    this.slugLocked = true;
    this.slug.set(slugify(value));
  }

  async archive(): Promise<void> {
    const slug = this.slug();
    if (!slug || this.isNew()) return;
    const ok = await confirmArchiveCollection(
      this.confirm,
      this.products().filter((p) => !isArchivedAt(p.archivedAt)).length,
    );
    if (!ok) return;
    this.api.archive(slug).subscribe({
      next: () => {
        showArchiveUndo(this.toast, () => {
          this.api.restore(slug).subscribe({
            next: () => this.toast.success('Restaurado.'),
            error: (err) =>
              this.toast.error(
                archiveAwareError(err, this.formatError(err, 'Não foi possível restaurar.')),
              ),
          });
        });
        void this.router.navigateByUrl(this.listPath);
      },
      error: (err) => {
        this.error.set(archiveAwareError(err, this.formatError(err, 'Não foi possível arquivar.')));
      },
    });
  }

  restore(): void {
    const slug = this.slug();
    if (!slug || this.restoring()) return;
    this.restoring.set(true);
    const previous = this.archivedAt();
    this.archivedAt.set(null);
    this.api.restore(slug).subscribe({
      next: (restored) => {
        this.applyMeta(restored);
        this.restoring.set(false);
        this.toast.success('Restaurado.');
      },
      error: (err) => {
        this.archivedAt.set(previous);
        this.restoring.set(false);
        this.error.set(
          archiveAwareError(err, this.formatError(err, 'Não foi possível restaurar.')),
        );
      },
    });
  }

  saveMeta(): void {
    this.error.set('');
    const name = this.name.trim();
    const slug = this.slug().trim();
    if (!name || !slug) {
      this.error.set('Nome e slug são obrigatórios.');
      return;
    }

    this.saving.set(true);
    const publishedAt = this.published
      ? (this.originalPublishedAt ?? new Date().toISOString())
      : null;

    if (this.isNew()) {
      this.api
        .create({
          name,
          slug,
          description: this.description.trim() || undefined,
          publishedAt,
        })
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.flash('Coleção criada.');
            void this.router.navigateByUrl(adminCollectionPath(created.slug));
          },
          error: (err: { error?: { message?: string | string[] }; status?: number }) => {
            this.saving.set(false);
            this.error.set(this.formatError(err, 'Não foi possível criar a coleção.'));
          },
        });
      return;
    }

    this.api
      .update(slug, {
        name,
        description: this.description.trim(),
        publishedAt,
      })
      .subscribe({
        next: (updated) => {
          this.applyMeta(updated);
          this.saving.set(false);
          this.flash('Coleção salva.');
        },
        error: (err: { error?: { message?: string | string[] }; status?: number }) => {
          this.saving.set(false);
          this.error.set(this.formatError(err, 'Não foi possível salvar a coleção.'));
        },
      });
  }

  onDrop(event: CdkDragDrop<ApiProductDto[]>): void {
    if (!this.canDrag()) {
      this.onTodosDragAttempt();
      return;
    }
    const next = livePiecesForOrder(this.visibleProducts());
    const currentIndex = resolveCdkDropIndex(
      event,
      next.length,
      itemMidpoints(
        event.container.getSortedItems().map((item) => item.element.nativeElement.getBoundingClientRect()),
      ),
    );
    if (event.previousIndex === currentIndex) return;
    const previousIds = orderProductIds(next);
    moveItemInArray(next, event.previousIndex, currentIndex);
    this.visibleProducts.set(next);
    applyCdkListOrder(event.container.data, next);
    this.persistGenderOrder(previousIds);
  }

  move(slug: string, direction: -1 | 1): void {
    if (!this.canDrag()) {
      this.onTodosDragAttempt();
      return;
    }
    const next = livePiecesForOrder(this.visibleProducts());
    const i = next.findIndex((p) => p.slug === slug);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= next.length) return;
    const previousIds = orderProductIds(next);
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    this.visibleProducts.set(next);
    this.persistGenderOrder(previousIds);
  }

  async removeProduct(productSlug: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remover da coleção',
      message: 'Remover este produto da coleção? (o produto não é apagado)',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    this.products.set(this.products().filter((p) => p.slug !== productSlug));
    this.visibleProducts.set(this.visibleProducts().filter((p) => p.slug !== productSlug));
    this.persistMembership();
  }

  private persistMembership(): void {
    const collectionSlug = this.slug();
    if (!collectionSlug || this.isNew()) return;
    this.savingOrder.set(true);
    const slugs = this.products().map((p) => p.slug);
    this.collectionProducts.remember(collectionSlug, slugs);
    this.collectionProducts.replace(collectionSlug, slugs).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.flash('Coleção atualizada.');
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        this.savingOrder.set(false);
        this.error.set(this.formatError(err, 'Não foi possível salvar a coleção.'));
        this.loadExisting(collectionSlug);
      },
    });
  }

  private persistGenderOrder(previousIds: string[]): void {
    if (!LISTA_REORDER_ENABLED) return;
    const collectionSlug = this.slug();
    const filter = this.genderFilter();
    if (!collectionSlug || this.isNew() || !canReorderWithFilter(filter)) return;
    const live = livePiecesForOrder(this.visibleProducts());
    this.visibleProducts.set(live);
    const productIds = orderProductIds(live);
    this.orderError.set('');
    this.savingOrder.set(true);
    this.collectionOrder.put(collectionSlug, filter, productIds).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.orderError.set('');
        this.toast.success(GENDER_ORDER_SAVED_TEXT, {
          durationMs: GENDER_ORDER_UNDO_MS,
          action: {
            label: GENDER_ORDER_UNDO_LABEL,
            run: () => this.restoreGenderOrder(previousIds),
          },
        });
      },
      error: (err) => {
        this.savingOrder.set(false);
        this.visibleProducts.set(applyProductIdOrder(live, previousIds));
        const message = collectionOrderErrorMessage(err);
        this.orderError.set(message);
        this.toast.error(message, { durationMs: ERROR_TOAST_MS });
      },
    });
  }

  private restoreGenderOrder(productIds: string[]): void {
    if (!LISTA_REORDER_ENABLED) return;
    const collectionSlug = this.slug();
    const filter = this.genderFilter();
    if (!collectionSlug || !canReorderWithFilter(filter)) return;
    const restored = applyProductIdOrder(this.visibleProducts(), productIds);
    this.visibleProducts.set(restored);
    this.savingOrder.set(true);
    this.collectionOrder.put(collectionSlug, filter, orderProductIds(restored)).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.toast.success('Ordem restaurada.');
      },
      error: (err) => {
        this.savingOrder.set(false);
        this.toast.error(collectionOrderErrorMessage(err), { durationMs: ERROR_TOAST_MS });
        this.refreshVisible();
      },
    });
  }

  private refreshVisible(): void {
    const filter = this.genderFilter();
    const subset = livePiecesForOrder(this.products()).filter((p) => matchesGenderFilter(p, filter));
    this.orderLoading.set(false);
    this.visibleProducts.set(subset);
  }

  loadExisting(slug: string): void {
    const gen = ++this.loadGen;
    this.missing.set(false);
    this.error.set('');
    this.loading.set(true);
    this.hydrateDetail(slug);

    forkJoin({
      live: endAdminLoad(this.api.list(false)),
      archived: endAdminLoad(this.api.list(true)),
      membership: endAdminLoad(
        this.api.getProducts(slug).pipe(catchError(() => of({ productSlugs: [] as string[] }))),
      ),
      adminProducts: endAdminLoad(this.api.listAdminProducts()),
    }).subscribe({
      next: ({ live, archived, membership, adminProducts }) => {
        if (gen !== this.loadGen) return;
        const meta = findAdminCollection(
          slug,
          live.ok ? live.value : [],
          archived.ok ? archived.value : [],
        );
        if (!meta) {
          this.loading.set(false);
          if (!live.ok && !archived.ok) {
            this.error.set(
              adminLoadErrorMessage(
                live.error ?? archived.error,
                'Não foi possível carregar a coleção.',
              ),
            );
            return;
          }
          this.missing.set(true);
          return;
        }
        this.applyMeta(meta);
        const admin = adminProducts.ok ? adminProducts.value : [];
        const slugs = membership.ok ? membership.value.productSlugs : [];
        const members = productsInCollection({ slug, id: meta.id, name: meta.name }, admin, []);
        const hasMembershipSort = members.some((p) =>
          p.collections?.some((c) => c.slug === slug && Number.isFinite(c.sortOrder)),
        );
        this.products.set(
          hasMembershipSort
            ? sortByMembershipSortOrder(members, slug)
            : orderByMembership(members, slugs),
        );
        writeAdminCache(adminListCacheKey('collection-detail', slug), {
          meta,
          products: this.products(),
        });
        this.collectionProducts.remember(
          slug,
          this.products().map((p) => p.slug),
        );
        this.refreshVisible();
        this.loading.set(false);
      },
      error: (err) => {
        if (gen !== this.loadGen) return;
        this.error.set(adminLoadErrorMessage(err, 'Não foi possível carregar a coleção.'));
        this.loading.set(false);
      },
    });
  }

  private hydrateDetail(slug: string): void {
    const cached = readAdminCache<{ meta: AdminCollectionDto; products: ApiProductDto[] }>(
      adminListCacheKey('collection-detail', slug),
    );
    if (!cached?.meta) return;
    this.applyMeta(cached.meta);
    this.products.set(sortByMembershipSortOrder(cached.products ?? [], slug));
    this.refreshVisible();
  }

  private applyMeta(c: AdminCollectionDto): void {
    this.slug.set(c.slug);
    this.name = c.name;
    this.description = c.description ?? '';
    this.originalPublishedAt = c.publishedAt;
    this.published = Boolean(c.publishedAt);
    this.archivedAt.set(c.archivedAt ?? null);
  }

  private flash(msg: string): void {
    this.toast.success(msg);
  }

  private formatError(
    err: { error?: { message?: string | string[] }; status?: number },
    fallback: string,
  ): string {
    const msg = err?.error?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (err?.status === 409) return 'Já existe uma coleção com este slug.';
    return fallback;
  }
}

export function findAdminCollection(
  slug: string,
  live: AdminCollectionDto[],
  archived: AdminCollectionDto[],
): AdminCollectionDto | undefined {
  return live.find((c) => c.slug === slug) ?? archived.find((c) => c.slug === slug);
}

export function productsInCollection(
  collection: { slug: string; id?: string; name?: string },
  adminProducts: ApiProductDto[],
  publicProducts: ApiProductDto[],
): ApiProductDto[] {
  const inCollection = adminProducts.filter((p) => productBelongsToCollection(p, collection));
  const seen = new Set(publicProducts.map((p) => p.slug));
  return [...publicProducts, ...inCollection.filter((p) => !seen.has(p.slug))];
}

export function orderByMembership<T extends { slug: string }>(
  items: T[],
  membership: readonly string[],
): T[] {
  if (!membership.length) return items;
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const next: T[] = [];
  const seen = new Set<string>();
  for (const slug of membership) {
    const row = bySlug.get(slug);
    if (!row || seen.has(slug)) continue;
    seen.add(slug);
    next.push(row);
  }
  for (const row of items) {
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    next.push(row);
  }
  return next;
}
