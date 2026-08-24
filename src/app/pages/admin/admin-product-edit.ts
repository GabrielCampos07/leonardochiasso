import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ADMIN_SWATCH_OPTIONS,
  AdminCatalogService,
  adminHttpErrorMessage,
  collectionFromSlug,
  slugFromCollection,
  slugifyName,
  syncPiecePrice,
  syncPriceFields,
  uniqueAdminSlug,
} from '../../core/admin-catalog.service';
import {
  parseCollectionSlugParam,
  resolveAdminCollectionContext,
} from '../../core/admin-collection-context';
import { CatalogService } from '../../core/catalog.service';
import {
  COLLECTION_LABELS,
  Collection,
  Product,
  ProductColor,
  ProductMedia,
  ProductPiece,
  formatPriceLabel,
} from '../../core/product.model';
import { PRICES_ON_REQUEST } from '../../core/pricing';
import {
  ADMIN_NEW_PRODUCT_SLUG,
  COLLECTION_SLUGS,
  CollectionSlug,
  ROUTES,
  productPath,
} from '../../core/routes';

const DEFAULT_SHIPPING =
  'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.';

const KNOWN_COLLECTION_SLUGS = new Set<string>(Object.values(COLLECTION_SLUGS));

function collectionLabelForSlug(slug: string): Collection {
  if (KNOWN_COLLECTION_SLUGS.has(slug)) {
    return collectionFromSlug(slug as CollectionSlug);
  }
  // API-created kebab slug — use slug as display until labels come from the collections API.
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
  };
}

@Component({
  selector: 'lc-admin-product-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, DragDropModule],
  templateUrl: './admin-product-edit.html',
  styleUrl: './admin-product-edit.scss',
})
export class AdminProductEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly catalog = inject(CatalogService);

  readonly listPath = ROUTES.adminProducts;
  readonly collectionOptions = (
    Object.entries(COLLECTION_LABELS) as [CollectionSlug, Collection][]
  ).map(([slug, label]) => ({ slug, label }));
  readonly swatchOptions = ADMIN_SWATCH_OPTIONS;
  readonly pricesOnRequest = PRICES_ON_REQUEST;
  readonly useApi = this.adminCatalog.useApi;

  readonly draft = signal<Product | null>(null);
  readonly galleryItems = signal<ProductMedia[]>([]);
  readonly toast = signal('');
  readonly missing = signal(false);
  readonly isNew = signal(false);
  /** New product opened from a collection-scoped URL / `?colecao=` / `?collection=`. */
  readonly collectionFromContext = signal(false);
  /** New product must pick a collection before save (no context). */
  readonly collectionRequired = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);

  detailsText = '';
  selectedSwatchIds: string[] = [];
  /** Keep slug auto-synced from name until the user edits slug manually (new only). */
  private slugLocked = false;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (slug === ADMIN_NEW_PRODUCT_SLUG) {
      this.isNew.set(true);
      const ctx = resolveAdminCollectionContext(this.route);
      this.collectionFromContext.set(ctx.fromContext);
      this.collectionRequired.set(!ctx.fromContext);
      this.loadDraft(blankProduct(ctx.slug));
      return;
    }
    this.adminCatalog.get$(slug).subscribe({
      next: (product) => {
        if (!product) {
          this.missing.set(true);
          return;
        }
        this.loadDraft(structuredClone(product));
      },
      error: (err) => {
        this.missing.set(true);
        this.toast.set(adminHttpErrorMessage(err, 'Produto não encontrado.'));
      },
    });
  }

  private loadDraft(p: Product): void {
    this.draft.set(p);
    this.detailsText = (p.details ?? []).join('\n');
    this.selectedSwatchIds = (p.colors ?? []).map((c) => c.id);
    this.galleryItems.set(this.adminCatalog.mediaOf(p));
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

  onCollectionSlugChange(raw: string): void {
    const p = this.draft();
    if (!p) return;
    const parsed = parseCollectionSlugParam(raw);
    if (!parsed) {
      this.draft.set({
        ...p,
        collection: '' as Collection,
        collectionSlug: '' as CollectionSlug,
      });
      return;
    }
    this.draft.set({
      ...p,
      collectionSlug: parsed as CollectionSlug,
      collection: collectionLabelForSlug(parsed),
    });
  }

  hasCollectionSelected(): boolean {
    return parseCollectionSlugParam(this.draft()?.collectionSlug) != null;
  }

  /** Include API-created slug in the select when pre-filled / editing. */
  extraCollectionOption(): { slug: string; label: string } | null {
    const slug = this.draft()?.collectionSlug;
    if (!slug || KNOWN_COLLECTION_SLUGS.has(slug)) return null;
    if (!parseCollectionSlugParam(slug)) return null;
    return { slug, label: slug };
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

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const p = this.draft();
    if (!p) return;

    if (!this.useApi) {
      // Demo: object URLs into gallery text paths (session-only preview).
      const urls = files.map((f) => URL.createObjectURL(f));
      const gallery = [...(p.gallery ?? []), ...urls];
      const thumb = p.thumb || urls[0] || '';
      this.draft.set({ ...p, thumb, gallery });
      this.galleryItems.set(
        this.adminCatalog.mediaOf({ ...p, thumb, gallery }),
      );
      this.toast.set('Fotos adicionadas localmente (demo).');
      return;
    }

    if (this.isNew() || !p.slug) {
      this.toast.set('Salve o produto antes de enviar fotos.');
      return;
    }

    this.uploading.set(true);
    this.adminCatalog.uploadAndAttach$(p.slug, files).subscribe({
      next: (updated) => {
        this.uploading.set(false);
        this.loadDraft(structuredClone(updated));
        this.toast.set('Fotos enviadas.');
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.set(adminHttpErrorMessage(err, 'Falha no upload.'));
      },
    });
  }

  dropGallery(event: CdkDragDrop<ProductMedia[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const items = [...this.galleryItems()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.galleryItems.set(items);

    const p = this.draft();
    if (!p) return;

    const urls = items.map((m) => m.cdnUrl);
    this.draft.set({
      ...p,
      media: items.map((m, i) => ({ ...m, sortOrder: i })),
      gallery: urls,
      thumb: urls[0] ?? p.thumb,
    });

    if (!this.useApi || this.isNew() || items.some((m) => m.id.startsWith('local-'))) {
      this.toast.set('Ordem da galeria atualizada.');
      return;
    }

    this.adminCatalog.reorderMediaViaApi(p.slug, items.map((m) => m.id)).subscribe({
      next: (updated) => {
        this.loadDraft(structuredClone(updated));
        this.toast.set('Ordem das fotos salva.');
      },
      error: (err) => {
        this.toast.set(adminHttpErrorMessage(err, 'Não foi possível reordenar as fotos.'));
        this.refreshFromApi(p.slug);
      },
    });
  }

  removeGalleryItem(index: number): void {
    const items = [...this.galleryItems()];
    const target = items[index];
    if (!target) return;
    const ok = window.confirm('Remover esta foto?');
    if (!ok) return;

    const p = this.draft();
    if (!p) return;

    if (!this.useApi || target.id.startsWith('local-') || this.isNew()) {
      items.splice(index, 1);
      const urls = items.map((m) => m.cdnUrl);
      this.galleryItems.set(items);
      this.draft.set({
        ...p,
        media: items,
        gallery: urls,
        thumb: urls[0] ?? '',
      });
      return;
    }

    this.adminCatalog.detachMediaViaApi(p.slug, target.id).subscribe({
      next: (updated) => {
        this.loadDraft(structuredClone(updated));
        this.toast.set('Foto removida.');
      },
      error: (err) => {
        this.toast.set(adminHttpErrorMessage(err, 'Não foi possível remover a foto.'));
      },
    });
  }

  save(): void {
    const p = this.draft();
    if (!p) return;
    if (!p.name.trim()) {
      this.toast.set('Informe o nome do produto.');
      return;
    }
    if (this.isNew() ? !this.hasCollectionSelected() : !p.collectionSlug) {
      this.toast.set(
        this.isNew() ? 'Selecione a coleção do produto.' : 'Selecione uma coleção.',
      );
      return;
    }

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

    const galleryUrls = this.galleryItems().map((m) => m.cdnUrl);
    const next: Product = {
      ...p,
      id: slug,
      slug,
      name: p.name.trim(),
      collectionSlug: p.collectionSlug || slugFromCollection(p.collection),
      gallery: galleryUrls.length ? galleryUrls : p.gallery,
      details,
      thumb: p.thumb.trim() || galleryUrls[0] || p.thumb,
      pieces: pieces.length ? pieces : undefined,
      media: this.galleryItems(),
      ...syncPriceFields(p.price),
    };

    this.saving.set(true);
    this.adminCatalog.saveProduct$(next, { isNew: this.isNew(), details }).subscribe({
      next: (saved) => {
        this.saving.set(false);
        if (!this.useApi) this.catalog.refreshLocalCatalog();
        if (this.isNew()) {
          this.isNew.set(false);
          this.slugLocked = true;
          this.loadDraft(structuredClone(saved));
          this.toast.set('Produto criado.');
          void this.router.navigateByUrl(`${ROUTES.adminProducts}/${saved.slug}`, {
            replaceUrl: true,
          });
          return;
        }
        this.loadDraft(structuredClone(saved));
        this.toast.set('Salvo.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.set(adminHttpErrorMessage(err));
      },
    });
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

  private refreshFromApi(slug: string): void {
    this.adminCatalog.get$(slug).subscribe({
      next: (product) => {
        if (product) this.loadDraft(structuredClone(product));
      },
    });
  }
}
