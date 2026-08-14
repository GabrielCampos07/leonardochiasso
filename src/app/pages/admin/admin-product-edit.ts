import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ADMIN_SWATCH_OPTIONS,
  AdminCatalogService,
  slugFromCollection,
  slugifyName,
  syncPiecePrice,
  syncPriceFields,
  uniqueAdminSlug,
} from '../../core/admin-catalog.service';
import { CatalogService } from '../../core/catalog.service';
import {
  COLLECTIONS,
  Collection,
  Product,
  ProductColor,
  ProductPiece,
  formatPriceLabel,
} from '../../core/product.model';
import { PRICES_ON_REQUEST } from '../../core/pricing';
import { ADMIN_NEW_PRODUCT_SLUG, COLLECTION_SLUGS, ROUTES, productPath } from '../../core/routes';

const DEFAULT_SHIPPING =
  'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.';

function blankProduct(): Product {
  return {
    id: '',
    slug: '',
    name: '',
    price: 0,
    priceLabel: formatPriceLabel(0),
    color: '',
    size: 'ÚNICO',
    fabric: '',
    season: 'Seasonless',
    description: '',
    details: [],
    shipping: DEFAULT_SHIPPING,
    thumb: 'assets/media/',
    gallery: [],
    category: 'feminino',
    collection: 'Organic Dreams',
    collectionSlug: COLLECTION_SLUGS.organicDreams,
    pieces: [],
  };
}

@Component({
  selector: 'lc-admin-product-edit',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-product-edit.html',
  styleUrl: './admin-product-edit.scss',
})
export class AdminProductEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly catalog = inject(CatalogService);

  readonly listPath = ROUTES.adminProducts;
  readonly collections = COLLECTIONS;
  readonly swatchOptions = ADMIN_SWATCH_OPTIONS;
  readonly pricesOnRequest = PRICES_ON_REQUEST;

  readonly draft = signal<Product | null>(null);
  readonly toast = signal('');
  readonly missing = signal(false);
  readonly isNew = signal(false);

  galleryText = '';
  detailsText = '';
  selectedSwatchIds: string[] = [];
  /** Keep slug auto-synced from name until the user edits slug manually (new only). */
  private slugLocked = false;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (slug === ADMIN_NEW_PRODUCT_SLUG) {
      this.isNew.set(true);
      this.loadDraft(blankProduct());
      return;
    }
    const product = this.adminCatalog.get(slug);
    if (!product) {
      this.missing.set(true);
      return;
    }
    this.loadDraft(structuredClone(product));
  }

  private loadDraft(p: Product): void {
    this.draft.set(p);
    this.galleryText = (p.gallery ?? []).join('\n');
    this.detailsText = (p.details ?? []).join('\n');
    this.selectedSwatchIds = (p.colors ?? []).map((c) => c.id);
  }

  onNameChange(name: string): void {
    const p = this.draft();
    if (!p) return;
    if (this.isNew() && !this.slugLocked) {
      const slug = slugifyName(name);
      this.draft.set({ ...p, name, slug, id: slug || p.id });
      return;
    }
    this.draft.set({ ...p, name });
  }

  onSlugChange(slug: string): void {
    const p = this.draft();
    if (!p || !this.isNew()) return;
    this.slugLocked = true;
    const clean = slugifyName(slug) || slug.trim().toLowerCase();
    this.draft.set({ ...p, slug: clean, id: clean });
  }

  onCollectionChange(collection: Collection): void {
    const p = this.draft();
    if (!p) return;
    this.draft.set({
      ...p,
      collection,
      collectionSlug: slugFromCollection(collection),
    });
  }

  onPriceChange(raw: string | number): void {
    const p = this.draft();
    if (!p) return;
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/\D/g, '')) || 0;
    this.draft.set({ ...p, ...syncPriceFields(n) });
  }

  toggleSwatch(swatch: ProductColor): void {
    const ids = new Set(this.selectedSwatchIds);
    if (ids.has(swatch.id)) ids.delete(swatch.id);
    else ids.add(swatch.id);
    this.selectedSwatchIds = [...ids];
    const colors = this.swatchOptions.filter((s) => ids.has(s.id));
    const p = this.draft();
    if (!p) return;
    this.draft.set({
      ...p,
      colors,
      color: colors.length ? colors.map((c) => c.name).join(' / ') : p.color,
    });
  }

  isSwatchSelected(id: string): boolean {
    return this.selectedSwatchIds.includes(id);
  }

  updatePiece(index: number, patch: Partial<ProductPiece>): void {
    const p = this.draft();
    if (!p?.pieces) return;
    const pieces = p.pieces.map((piece, i) => {
      if (i !== index) return piece;
      let next = { ...piece, ...patch };
      if (patch.price != null) next = syncPiecePrice(next, patch.price);
      if (patch.name != null && this.isNew()) {
        const id = slugifyName(patch.name) || piece.id;
        next = { ...next, id };
      }
      return next;
    });
    this.draft.set({ ...p, pieces });
  }

  addPiece(): void {
    const p = this.draft();
    if (!p) return;
    const n = (p.pieces?.length ?? 0) + 1;
    const id = `peca-${n}-${Date.now().toString(36)}`;
    const piece = syncPiecePrice(
      {
        id,
        name: `Peça ${n}`,
        price: 0,
        priceLabel: formatPriceLabel(0),
      },
      0,
    );
    this.draft.set({ ...p, pieces: [...(p.pieces ?? []), piece] });
  }

  removePiece(index: number): void {
    const ok = window.confirm('Remover esta peça do look?');
    if (!ok) return;
    const p = this.draft();
    if (!p?.pieces) return;
    const pieces = p.pieces.filter((_, i) => i !== index);
    this.draft.set({ ...p, pieces });
  }

  save(): void {
    const p = this.draft();
    if (!p) return;
    if (!p.name.trim()) {
      this.toast.set('Informe o nome do produto.');
      return;
    }

    const gallery = this.galleryText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const details = this.detailsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    let slug = p.slug.trim();
    if (this.isNew()) {
      slug = uniqueAdminSlug(slug || p.name, (s) =>
        s === ADMIN_NEW_PRODUCT_SLUG || this.adminCatalog.slugExists(s),
      );
    }

    const pieces = (p.pieces ?? [])
      .map((piece) => ({
        ...piece,
        id: piece.id || slugifyName(piece.name) || `peca-${Date.now().toString(36)}`,
        name: piece.name.trim() || 'Peça',
      }))
      .filter((piece) => piece.name);

    const next: Product = {
      ...p,
      id: slug,
      slug,
      name: p.name.trim(),
      gallery: gallery.length ? gallery : p.gallery.length ? p.gallery : [p.thumb].filter(Boolean),
      details,
      thumb: p.thumb.trim() || gallery[0] || p.thumb,
      pieces: pieces.length ? pieces : undefined,
      ...syncPriceFields(p.price),
    };

    if (this.isNew()) {
      this.adminCatalog.create(next);
      this.catalog.refreshLocalCatalog();
      this.isNew.set(false);
      this.slugLocked = true;
      this.loadDraft(structuredClone(next));
      this.toast.set('Produto criado. Já aparece no site.');
      void this.router.navigateByUrl(`${ROUTES.adminProducts}/${next.slug}`, {
        replaceUrl: true,
      });
      return;
    }

    this.adminCatalog.save(next);
    this.catalog.refreshLocalCatalog();
    this.loadDraft(structuredClone(next));
    this.toast.set('Salvo. Já aparece no site.');
  }

  cancel(): void {
    void this.router.navigateByUrl(ROUTES.adminProducts);
  }

  sitePath(): string {
    const p = this.draft();
    return p?.slug ? productPath(p.slug) : ROUTES.home;
  }

  patchField<K extends keyof Product>(key: K, value: Product[K]): void {
    const p = this.draft();
    if (!p) return;
    this.draft.set({ ...p, [key]: value });
  }
}
