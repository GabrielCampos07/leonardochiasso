import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import { AdminCollectionProductsService } from '../../core/admin-collection-products';
import { ApiProductDto } from '../../core/catalog.service';
import { collectionCoverUrl } from '../../core/collection-cover';
import { CollectionCover } from '../../shared/components/collection-cover/collection-cover';
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
import { ToastService } from '../../core/feedback/toast.service';
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
  imports: [FormsModule, RouterLink, DragDropModule, CollectionCover],
  templateUrl: './admin-collection-edit.html',
  styleUrls: ['./admin-product-edit.scss', './admin-products.scss', './admin-collection-edit.scss'],
})
export class AdminCollectionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminCollectionsApiService);
  private readonly collectionProducts = inject(AdminCollectionProductsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly listPath = ROUTES.adminCollections;
  readonly newProductPath = adminProductPath(ADMIN_NEW_PRODUCT_SLUG);
  readonly isNew = signal(false);
  readonly missing = signal(false);
  readonly loading = signal(true);
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
  readonly coverUrl = computed(() =>
    collectionCoverUrl(
      this.products().map((p, index) => ({
        archivedAt: p.archivedAt,
        sortOrder: index,
        thumb: p.thumb,
        gallery: p.gallery,
        media: p.media,
      })),
    ),
  );
  readonly savingOrder = signal(false);
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
    if (event.previousIndex === event.currentIndex) return;
    const next = [...this.products()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.products.set(next);
    this.persistOrder();
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
    this.persistOrder();
  }

  private persistOrder(): void {
    const collectionSlug = this.slug();
    if (!collectionSlug || this.isNew()) return;
    this.savingOrder.set(true);
    const slugs = this.products().map((p) => p.slug);
    this.collectionProducts.remember(collectionSlug, slugs);
    this.collectionProducts.replace(collectionSlug, slugs).subscribe({
      next: () => {
        this.savingOrder.set(false);
        this.flash('Ordem dos produtos atualizada.');
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        this.savingOrder.set(false);
        this.error.set(this.formatError(err, 'Não foi possível salvar a ordem.'));
        this.loadExisting(collectionSlug);
      },
    });
  }

  loadExisting(slug: string): void {
    const gen = ++this.loadGen;
    this.loading.set(true);
    this.missing.set(false);
    this.error.set('');

    forkJoin({
      live: endAdminLoad(this.api.list(false)),
      archived: endAdminLoad(this.api.list(true)),
      publicDetail: endAdminLoad(
        this.api.getPublicDetail(slug).pipe(catchError(() => of(null))),
      ),
      adminProducts: endAdminLoad(this.api.listAdminProducts()),
    }).subscribe({
      next: ({ live, archived, publicDetail, adminProducts }) => {
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
        this.products.set(
          productsInCollection(
            slug,
            adminProducts.ok ? adminProducts.value : [],
            publicDetail.ok ? (publicDetail.value?.products ?? []) : [],
          ),
        );
        this.collectionProducts.remember(
          slug,
          this.products().map((p) => p.slug),
        );
        this.loading.set(false);
      },
      error: (err) => {
        if (gen !== this.loadGen) return;
        this.error.set(adminLoadErrorMessage(err, 'Não foi possível carregar a coleção.'));
        this.loading.set(false);
      },
    });
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
  slug: string,
  adminProducts: ApiProductDto[],
  publicProducts: ApiProductDto[],
): ApiProductDto[] {
  const inCollection = adminProducts.filter((p) =>
    (p.collections ?? []).some((c) => c.slug === slug),
  );
  const seen = new Set(publicProducts.map((p) => p.slug));
  return [...publicProducts, ...inCollection.filter((p) => !seen.has(p.slug))];
}
