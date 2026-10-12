import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminCatalogService, adminHttpErrorMessage, collectionFromSlug } from '../../core/admin-catalog.service';
import { resolveAdminCollectionContext } from '../../core/admin-collection-context';
import { Collection, Product, formatPriceLabel } from '../../core/product.model';
import {
  ADMIN_NEW_PRODUCT_SLUG,
  COLLECTION_SLUGS,
  CollectionSlug,
  ROUTES,
} from '../../core/routes';
import { showArchiveUndo } from '../../core/admin-archive';
import { ToastService } from '../../core/feedback/toast.service';
import { AdminProductForm } from './admin-product-form';

const DEFAULT_SHIPPING =
  'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.';

const KNOWN_COLLECTION_SLUGS = new Set<string>(Object.values(COLLECTION_SLUGS));

function collectionLabelForSlug(slug: string): Collection {
  if (KNOWN_COLLECTION_SLUGS.has(slug)) {
    return collectionFromSlug(slug as CollectionSlug);
  }
  return slug as Collection;
}

function blankProduct(collectionSlug: string | null): Product {
  const hasCollection = collectionSlug != null && collectionSlug !== '';
  return {
    id: '',
    slug: '',
    name: '',
    price: 0,
    priceLabel: formatPriceLabel(0),
    priceCents: 0,
    color: '',
    size: 'ÚNICO',
    fabric: '',
    season: 'Seasonless',
    description: '',
    details: [],
    shipping: DEFAULT_SHIPPING,
    thumb: '',
    gallery: [],
    media: [],
    category: 'feminino',
    collection: hasCollection ? collectionLabelForSlug(collectionSlug) : ('' as Collection),
    collectionSlug: (collectionSlug ?? '') as CollectionSlug,
    pieces: [],
    stockQty: 1,
  };
}

@Component({
  selector: 'lc-admin-product-edit',
  standalone: true,
  imports: [RouterLink, AdminProductForm],
  templateUrl: './admin-product-edit.html',
  styleUrl: './admin-product-edit.scss',
})
export class AdminProductEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly toast = inject(ToastService);

  readonly listPath = ROUTES.adminProducts;
  readonly draft = signal<Product | null>(null);
  readonly missing = signal(false);
  readonly isNew = signal(false);
  readonly collectionFromContext = signal(false);
  readonly collectionRequired = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (slug === ADMIN_NEW_PRODUCT_SLUG) {
      this.isNew.set(true);
      const ctx = resolveAdminCollectionContext(this.route);
      this.collectionFromContext.set(ctx.fromContext);
      this.collectionRequired.set(!ctx.fromContext);
      this.draft.set(blankProduct(ctx.slug));
      return;
    }
    this.adminCatalog.get$(slug).subscribe({
      next: (product) => {
        if (!product) {
          this.missing.set(true);
          return;
        }
        this.draft.set(structuredClone(product));
      },
      error: (err) => {
        this.missing.set(true);
        this.toast.error(adminHttpErrorMessage(err, 'Produto não encontrado.'));
      },
    });
  }

  onArchived(saved: Product): void {
    showArchiveUndo(this.toast, () => {
      this.adminCatalog.restoreViaApi(saved.slug).subscribe({
        next: () => this.toast.success('Restaurado.'),
        error: (err) => this.toast.error(adminHttpErrorMessage(err, 'Não foi possível restaurar.')),
      });
    });
    void this.router.navigateByUrl(ROUTES.adminProducts);
  }

  onSaved(saved: Product): void {
    this.draft.set(structuredClone(saved));
    if (!this.isNew()) return;
    this.isNew.set(false);
    void this.router
      .navigateByUrl(`${ROUTES.adminProducts}/${saved.slug}`, {
        replaceUrl: true,
      })
      .then(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
  }

  cancel(): void {
    void this.router.navigateByUrl(ROUTES.adminProducts);
  }
}
