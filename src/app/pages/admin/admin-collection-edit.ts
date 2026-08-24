import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import {
  AdminCollectionDto,
  AdminCollectionsApiService,
} from '../../core/admin-collections-api.service';
import { ApiProductDto } from '../../core/catalog.service';
import {
  ADMIN_NEW_COLLECTION_SLUG,
  ADMIN_NEW_PRODUCT_SLUG,
  ADMIN_PRODUCT_COLLECTION_QUERY,
  ROUTES,
  adminCollectionPath,
  adminProductPath,
} from '../../core/routes';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';

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
  imports: [FormsModule, RouterLink, DragDropModule],
  templateUrl: './admin-collection-edit.html',
  styleUrls: ['./admin-product-edit.scss', './admin-products.scss', './admin-collection-edit.scss'],
})
export class AdminCollectionEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminCollectionsApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly listPath = ROUTES.adminCollections;
  readonly newProductPath = adminProductPath(ADMIN_NEW_PRODUCT_SLUG);
  readonly isNew = signal(false);
  readonly missing = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly slug = signal('');
  name = '';
  description = '';
  published = false;
  private originalPublishedAt: string | null = null;
  private slugLocked = false;

  readonly products = signal<ApiProductDto[]>([]);
  readonly savingOrder = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const param = params.get('slug') ?? '';
      this.slugLocked = false;
      this.error.set('');
      if (param === ADMIN_NEW_COLLECTION_SLUG) {
        this.isNew.set(true);
        this.missing.set(false);
        this.loading.set(false);
        this.slug.set('');
        this.name = '';
        this.description = '';
        this.published = false;
        this.originalPublishedAt = null;
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
    this.api.setProducts(
      collectionSlug,
      this.products().map((p) => p.slug),
    ).subscribe({
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

  private loadExisting(slug: string): void {
    this.loading.set(true);
    this.missing.set(false);
    this.error.set('');

    forkJoin({
      collections: this.api.list(),
      publicDetail: this.api.getPublicDetail(slug).pipe(catchError(() => of(null))),
      adminProducts: this.api.listAdminProducts().pipe(catchError(() => of([] as ApiProductDto[]))),
    }).subscribe({
      next: ({ collections, publicDetail, adminProducts }) => {
        const meta = collections.find((c) => c.slug === slug);
        if (!meta) {
          this.missing.set(true);
          this.loading.set(false);
          return;
        }
        this.applyMeta(meta);

        const orderedPublic = publicDetail?.products ?? [];
        const inCollection = adminProducts.filter((p) =>
          (p.collections ?? []).some((c) => c.slug === slug),
        );
        const seen = new Set(orderedPublic.map((p) => p.slug));
        const extras = inCollection.filter((p) => !seen.has(p.slug));
        // Prefer public order (collection sortOrder); append drafts / unpublished from admin list.
        this.products.set([...orderedPublic, ...extras]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a coleção.');
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
