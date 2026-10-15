import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LcListPicker, ListPickerOption } from '../../shared/components/list-picker/list-picker';
import { LcSegmented } from '../../shared/components/segmented/segmented';
import {
  PRODUCT_GENDER_OPTIONS,
  ProductGender,
  productGender,
  storefrontCategory,
} from '../../core/product-gender';
import {
  ADMIN_SWATCH_OPTIONS,
  AdminCatalogService,
  MULTI_COLLECTION_CHANGE_BLOCKED,
  adminHttpErrorMessage,
  collectionFromSlug,
  slugFromCollection,
  slugifyName,
  syncPiecePrice,
  syncPriceFields,
  uniqueAdminSlug,
} from '../../core/admin-catalog.service';
import { parseCollectionSlugParam } from '../../core/admin-collection-context';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { CatalogService } from '../../core/catalog.service';
import {
  ARCHIVED_STATUS_OPTION,
  COLLECTION_LABELS,
  Collection,
  PRODUCT_STATUS_OPTIONS,
  Product,
  ProductColor,
  ProductMedia,
  ProductPiece,
  ProductStatusValue,
  SITE_UNAVAILABLE_HINT,
  canOpenProductOnSite,
  formatAdminPriceLabel,
  productStatusForApi,
} from '../../core/product.model';
import { PRICES_ON_REQUEST } from '../../core/pricing';
import { ADMIN_NEW_PRODUCT_SLUG, COLLECTION_SLUGS, CollectionSlug, productPath } from '../../core/routes';
import { archiveAwareError, confirmArchivePiece, isArchivedAt } from '../../core/admin-archive';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { SAVE_TOAST_MS, ToastService } from '../../core/feedback/toast.service';
import { PHOTO_UPLOAD_FAILED, photoUploadErrorMessage } from '../../core/photo-upload';
import {
  PRICE_REQUIRED_MESSAGE,
  formatPriceCentsInput,
  formatPriceInput,
  parsePricePtBr,
} from '../../core/price-input';

export { formatPriceInput, formatPriceCentsInput };

const KNOWN_COLLECTION_SLUGS = new Set<string>(Object.values(COLLECTION_SLUGS));

export const STOCK_NEGATIVE_MESSAGE = 'Estoque não pode ser negativo.';
export {
  PRICE_AMBIGUOUS_MESSAGE,
  PRICE_DECIMALS_MESSAGE,
  PRICE_INVALID_MESSAGE,
  PRICE_MAX_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
} from '../../core/price-input';

/** Parsed stock for the API — rounds, does not clamp negatives. */
export function parseStockQty(raw: string | number | null | undefined): number {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Client-side copy — same text the API returns for stock < 0. */
export function stockQtyError(raw: string | number | null | undefined): string {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(',', '.'));
  if (Number.isFinite(n) && n < 0) return STOCK_NEGATIVE_MESSAGE;
  return '';
}

function collectionLabelForSlug(slug: string, name?: string | null): Collection {
  if (KNOWN_COLLECTION_SLUGS.has(slug)) {
    return collectionFromSlug(slug as CollectionSlug);
  }
  const trimmed = name?.trim();
  return (trimmed && trimmed !== slug ? trimmed : slug) as Collection;
}

export const NAME_REQUIRED_MESSAGE = 'Informe o nome.';
export const NAME_MAX_LENGTH = 200;
export const NAME_TOO_LONG_MESSAGE = 'O nome pode ter no máximo 200 caracteres.';
export const DESCRIPTION_MAX_LENGTH = 5000;
export const COLLECTION_REQUIRED_MESSAGE = 'Selecione a coleção.';
export const COLLECTION_PICKER_LOADING = 'Carregando…';
export const NOTHING_TO_SAVE_HINT = 'Nada para salvar';
export const SAVED_TOAST = 'Salvo.';
export const UNSAVED_TITLE = 'Descartar alterações?';
export const UNSAVED_MESSAGE = 'Há alterações que ainda não foram salvas.';
export const LEAVE_WHILE_SAVING_TITLE = 'Sair agora?';
export const LEAVE_WHILE_SAVING_MESSAGE = 'O salvamento ainda está em andamento.';
export const CUSTOM_SWATCH_PREFIX = 'custom:';
export const CUSTOM_COLOR_MAX = 40;
export const CUSTOM_COLOR_REQUIRED_MESSAGE = 'Informe a cor.';
export const CUSTOM_COLOR_TOO_LONG_MESSAGE = 'A cor pode ter no máximo 40 caracteres.';
export const CUSTOM_COLOR_DUPLICATE_MESSAGE = 'Essa cor já foi adicionada.';

export function keepOrTrim(current: string, loaded: string): string {
  return current === loaded ? loaded : current.trim();
}

export function customColorError(
  raw: string,
  selected: readonly ProductColor[],
): string {
  const name = raw.trim();
  if (!name) return CUSTOM_COLOR_REQUIRED_MESSAGE;
  if (name.length > CUSTOM_COLOR_MAX) return CUSTOM_COLOR_TOO_LONG_MESSAGE;
  const key = name.toLowerCase();
  if (selected.some((c) => c.name.toLowerCase() === key || c.id.toLowerCase() === key)) {
    return CUSTOM_COLOR_DUPLICATE_MESSAGE;
  }
  return '';
}

export function colorLabelFromSwatches(colors: readonly ProductColor[]): string {
  return colors.map((c) => c.name).join(' / ');
}

/** Real combinations use a spaced slash. A slash without spaces is one color. */
export const LEGACY_COLOR_SPLIT = ' / ';

export function splitLegacyColorLabel(label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed) return [];
  return trimmed.split(LEGACY_COLOR_SPLIT).map((part) => part.trim()).filter(Boolean);
}

function matchKnownColor(
  token: string,
  options: readonly ProductColor[],
): ProductColor | undefined {
  const key = token.trim().toLowerCase();
  if (!key) return undefined;
  return options.find(
    (swatch) => swatch.name.toLowerCase() === key || swatch.id.toLowerCase() === key,
  );
}

function freeTextSwatch(token: string): ProductColor {
  const name = token.trim();
  const id = `${CUSTOM_SWATCH_PREFIX}${name.toLowerCase()}`;
  return { id, name, hex: '#C4C0B8' };
}

export function isCustomSwatch(color: ProductColor): boolean {
  return color.id.startsWith(CUSTOM_SWATCH_PREFIX);
}

/** Palette ids only — free text stays on the `color` string, never as custom: items. */
export function paletteColorsForSave(colors: readonly ProductColor[]): ProductColor[] {
  return colors.filter((c) => !isCustomSwatch(c));
}

function chipKey(colors: readonly ProductColor[]): string {
  return colors.map((c) => c.id).join('\0');
}

/**
 * Map stored `colors` or a legacy "A / B" text string onto palette chips.
 * Form state only — opening a piece must not persist this mapping.
 * Unknown names stay as chips so free text is never dropped.
 */
export function selectedSwatchesFromProduct(
  product: { colors?: ProductColor[] | null; color?: string | null },
  options: readonly ProductColor[],
): ProductColor[] {
  if (product.colors?.length) {
    const fromIds = product.colors.map(
      (c) => options.find((s) => s.id === c.id) ?? c,
    );
    return fromIds;
  }
  const raw = (product.color ?? '').trim();
  if (!raw) return [];
  const whole = matchKnownColor(raw, options);
  if (whole) return [whole];
  const matched: ProductColor[] = [];
  const seen = new Set<string>();
  for (const token of splitLegacyColorLabel(raw)) {
    const hit = matchKnownColor(token, options) ?? freeTextSwatch(token);
    if (!seen.has(hit.id)) {
      seen.add(hit.id);
      matched.push(hit);
    }
  }
  return matched;
}

export function applySelectedSwatches(
  product: Product,
  colors: readonly ProductColor[],
): Product {
  return {
    ...product,
    colors: [...colors],
    color: colorLabelFromSwatches(colors),
  };
}

/**
 * Visible collection label — catalog / official name only.
 * Never returns the raw slug. Empty means the name is not known yet.
 */
export function collectionSelectLabel(
  slug: string,
  name?: string | null,
  catalog: ReadonlyArray<{ slug: string; name: string }> = [],
): string {
  if (KNOWN_COLLECTION_SLUGS.has(slug)) {
    return collectionFromSlug(slug as CollectionSlug);
  }
  const fromCatalog = catalog.find((item) => item.slug === slug)?.name?.trim();
  if (fromCatalog) return fromCatalog;
  const trimmed = name?.trim();
  if (trimmed && trimmed !== slug) return trimmed;
  return '';
}

@Component({
  selector: 'lc-admin-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink, DragDropModule, LcSegmented, LcListPicker],
  templateUrl: './admin-product-form.html',
  styleUrl: './admin-product-form.scss',
})
export class AdminProductForm implements OnInit {
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly catalog = inject(CatalogService);
  private readonly collectionsApi = inject(AdminCollectionsApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly product = input.required<Product>();
  readonly isNew = input(false);
  readonly collectionFromContext = input(false);
  readonly collectionRequired = input(false);
  readonly showSiteLink = input(true);

  readonly saved = output<Product>();
  readonly cancelled = output<void>();
  readonly savingChange = output<boolean>();
  readonly archived = output<Product>();

  readonly archiving = signal(false);
  readonly isArchived = computed(() => isArchivedAt(this.draft()?.archivedAt));

  readonly apiCollections = signal<{ slug: string; name: string }[]>([]);
  readonly collectionsLoading = signal(true);
  readonly collectionOptions = computed(() => {
    const known = (Object.entries(COLLECTION_LABELS) as [CollectionSlug, Collection][]).map(
      ([slug, label]) => ({ slug, label }),
    );
    const knownSlugs = new Set(known.map((item) => item.slug));
    const extras = this.apiCollections()
      .filter((item) => item.slug && !knownSlugs.has(item.slug as CollectionSlug))
      .map((item) => ({
        slug: item.slug,
        label: collectionSelectLabel(item.slug, item.name, this.apiCollections()),
      }))
      .filter((item) => item.label);
    return [...known, ...extras];
  });
  readonly collectionPickerOptions = computed<ListPickerOption[]>(() => {
    const opts = [...this.collectionOptions()];
    const extra = this.extraCollectionOption();
    if (extra) opts.push(extra);
    return opts.map((item) => ({ value: item.slug, label: item.label }));
  });
  readonly selectedCollectionLabel = computed(() => {
    const p = this.draft();
    const slug = parseCollectionSlugParam(p?.collectionSlug) ?? parseCollectionSlugParam(this.product().collectionSlug);
    if (!slug) return '';
    return collectionSelectLabel(slug, p?.collection, this.apiCollections());
  });
  readonly collectionPickerLoading = computed(() => {
    const slug =
      parseCollectionSlugParam(this.draft()?.collectionSlug) ??
      parseCollectionSlugParam(this.product().collectionSlug);
    return Boolean(slug) && this.collectionsLoading() && !this.selectedCollectionLabel();
  });
  readonly swatchOptions = ADMIN_SWATCH_OPTIONS;
  readonly selectedColors = computed(() => this.draft()?.colors ?? []);
  readonly availableColorOptions = computed(() => {
    const taken = new Set(this.selectedColors().map((c) => c.id));
    return this.swatchOptions.filter((s) => !taken.has(s.id));
  });
  readonly availableColorPickerOptions = computed<ListPickerOption[]>(() =>
    this.availableColorOptions().map((s) => ({ value: s.id, label: s.name })),
  );
  readonly genderOptions = PRODUCT_GENDER_OPTIONS;
  readonly statusOptions = computed(() =>
    this.isArchived() ? [...PRODUCT_STATUS_OPTIONS, ARCHIVED_STATUS_OPTION] : PRODUCT_STATUS_OPTIONS,
  );
  readonly siteUnavailableHint = SITE_UNAVAILABLE_HINT;
  readonly pricesOnRequest = PRICES_ON_REQUEST;
  readonly useApi = this.adminCatalog.useApi;
  readonly nameMaxLength = NAME_MAX_LENGTH;
  readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  readonly draft = signal<Product | null>(null);
  readonly galleryItems = signal<ProductMedia[]>([]);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  readonly saveError = signal('');
  readonly nothingToSaveHint = NOTHING_TO_SAVE_HINT;
  readonly stockError = signal('');
  readonly nameError = signal('');
  readonly collectionError = signal('');
  readonly priceError = signal('');
  priceText = '';
  customColorText = '';
  readonly customColorError = signal('');
  readonly customColorMax = CUSTOM_COLOR_MAX;
  readonly pendingFileLabel = signal('Escolher fotos');
  private pendingFiles: File[] = [];

  detailsText = '';
  private slugLocked = false;
  private baseline = '';
  private loadedColor = '';
  private loadedColors: ProductColor[] | undefined;
  private loadedChipKey = '';
  private loadedName = '';
  private loadedSlug = '';
  private loadedSize = '';
  private loadedFabric = '';
  private loadedSeason = '';
  private loadedDescription = '';
  private loadedDetails: string[] = [];
  private loadedDetailsText = '';
  private loadedThumb = '';
  private loadedPrice = 0;
  private loadedPriceCents = 0;
  private loadedPriceLabel = '';
  private loadedPriceText = '';
  private loadedStockQty = 0;

  ngOnInit(): void {
    this.loadDraft(structuredClone(this.product()));
    this.refreshCollections();
  }

  refreshCollections(): void {
    this.collectionsApi.list(false, { refresh: true }).subscribe({
      next: (list) => {
        this.apiCollections.set(
          list
            .filter((item) => item.slug)
            .map((item) => ({ slug: item.slug, name: item.name })),
        );
        this.collectionsLoading.set(false);
        this.syncCollectionNameFromApi();
      },
      error: () => {
        this.collectionsLoading.set(false);
        if (!this.apiCollections().length) this.apiCollections.set([]);
      },
    });
  }

  private syncCollectionNameFromApi(): void {
    const p = this.draft() ?? this.product();
    const slug =
      parseCollectionSlugParam(p?.collectionSlug) ??
      parseCollectionSlugParam(this.product().collectionSlug);
    if (!slug) return;
    const name = collectionSelectLabel(slug, p.collection, this.apiCollections());
    if (
      p.collectionSlug === slug &&
      p.collection === name
    ) {
      return;
    }
    this.draft.set({
      ...p,
      collectionSlug: slug as CollectionSlug,
      collection: name as Collection,
    });
  }

  /** Local form only. Does not write. Legacy color text becomes chips here. */
  loadDraft(p: Product): void {
    const colors = selectedSwatchesFromProduct(p, this.swatchOptions);
    this.loadedColor = p.color ?? '';
    this.loadedColors = p.colors;
    this.loadedChipKey = chipKey(colors);
    this.loadedName = p.name;
    this.loadedSlug = p.slug;
    this.loadedSize = p.size ?? '';
    this.loadedFabric = p.fabric ?? '';
    this.loadedSeason = p.season ?? '';
    this.loadedDescription = p.description ?? '';
    this.loadedDetails = [...(p.details ?? [])];
    this.loadedDetailsText = (p.details ?? []).join('\n');
    this.loadedThumb = p.thumb ?? '';
    this.loadedPrice = p.price;
    this.loadedPriceLabel = p.priceLabel;
    this.loadedStockQty = p.stockQty ?? 0;
    this.customColorText = '';
    this.customColorError.set('');
    const cents = Number.isFinite(p.priceCents)
      ? Number(p.priceCents)
      : Math.round((p.price ?? 0) * 100);
    this.draft.set({
      ...applySelectedSwatches(
        {
          ...p,
          status: isArchivedAt(p.archivedAt)
            ? 'archived'
            : productStatusForApi(p.status, this.isNew() ? 'draft' : 'published'),
        },
        colors,
      ),
      ...syncPriceFields(cents / 100),
    });
    this.detailsText = this.loadedDetailsText;
    this.galleryItems.set(this.adminCatalog.mediaOf(p));
    this.priceText = formatPriceCentsInput(cents);
    this.loadedPriceCents = cents;
    this.loadedPriceText = this.priceText;
    this.priceError.set('');
    this.baseline = this.fingerprint();
  }

  isDirty(): boolean {
    return this.fingerprint() !== this.baseline;
  }

  saveIdle(): boolean {
    return !this.isDirty() && !this.saving();
  }

  saveDescribedBy(): string | null {
    const ids: string[] = [];
    if (this.saveError()) ids.push('atelier-product-save-error');
    if (this.saveIdle()) ids.push('atelier-product-save-clean');
    return ids.length ? ids.join(' ') : null;
  }

  private fingerprint(): string {
    const p = this.draft();
    return JSON.stringify({
      name: p?.name,
      slug: p?.slug,
      color: p?.color,
      colors: p?.colors?.map((c) => c.id),
      description: p?.description,
      details: this.detailsText,
      price: this.priceText,
      collectionSlug: p?.collectionSlug,
      stockQty: p?.stockQty,
      size: p?.size,
      fabric: p?.fabric,
      season: p?.season,
      status: p?.status,
      gender: p?.gender,
    });
  }

  currentStatus(): ProductStatusValue {
    if (this.isArchived()) return 'archived';
    return productStatusForApi(this.draft()?.status, this.isNew() ? 'draft' : 'published');
  }

  canOpenOnSite(): boolean {
    return canOpenProductOnSite(this.currentStatus(), this.draft()?.archivedAt);
  }

  onStatusChange(raw: string): void {
    const p = this.draft();
    if (!p || this.isArchived()) return;
    this.draft.set({ ...p, status: productStatusForApi(raw, this.isNew() ? 'draft' : 'published') });
  }

  onNameChange(name: string): void {
    const p = this.draft();
    if (!p) return;
    const clipped = name.length > NAME_MAX_LENGTH ? name.slice(0, NAME_MAX_LENGTH) : name;
    if (this.nameError()) {
      this.nameError.set(clipped.trim() ? '' : NAME_REQUIRED_MESSAGE);
    }
    if (this.isNew() && !this.slugLocked) {
      const slug = slugifyName(clipped);
      this.draft.set({ ...p, name: clipped, slug, id: slug || p.id });
      return;
    }
    this.draft.set({ ...p, name: clipped });
  }

  onNameBlur(): void {
    const p = this.draft();
    if (!p) return;
    const name = p.name.trim();
    this.draft.set({ ...p, name });
    this.nameError.set(name ? '' : NAME_REQUIRED_MESSAGE);
  }

  onSlugChange(slug: string): void {
    const p = this.draft();
    if (!p || !this.isNew()) return;
    this.slugLocked = true;
    const clean = slugifyName(slug) || slug.trim().toLowerCase();
    this.draft.set({ ...p, slug: clean, id: clean });
  }

  currentGender(): ProductGender {
    const p = this.draft();
    return p ? productGender(p) : 'feminino';
  }

  onGenderChange(raw: string): void {
    const p = this.draft();
    if (!p) return;
    const gender: ProductGender =
      raw === 'masculino' || raw === 'unissex' ? raw : 'feminino';
    this.draft.set({
      ...p,
      gender,
      category: storefrontCategory({ slug: p.slug, gender }),
    });
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
      collection: collectionLabelForSlug(
        parsed,
        this.apiCollections().find((item) => item.slug === parsed)?.name,
      ),
    });
    this.collectionError.set('');
  }

  hasCollectionSelected(): boolean {
    return parseCollectionSlugParam(this.draft()?.collectionSlug) != null;
  }

  extraCollectionOption(): { slug: string; label: string } | null {
    const slug = this.draft()?.collectionSlug;
    if (!slug || this.collectionOptions().some((opt) => opt.slug === slug)) return null;
    if (!parseCollectionSlugParam(slug)) return null;
    const label = collectionSelectLabel(slug, this.draft()?.collection, this.apiCollections());
    if (!label) return null;
    return { slug, label };
  }

  onPriceChange(raw: string | number): void {
    const p = this.draft();
    if (!p) return;
    this.priceText = String(raw ?? '');
    const parsed = parsePricePtBr(raw);
    if (!parsed.ok) {
      this.priceError.set(parsed.error);
      if (parsed.reais != null) this.priceText = formatPriceInput(parsed.reais);
      return;
    }
    this.priceError.set('');
    this.draft.set({ ...p, ...syncPriceFields(parsed.reais) });
  }

  onStockQtyChange(raw: string | number): void {
    const p = this.draft();
    if (!p) return;
    const error = stockQtyError(raw);
    this.stockError.set(error);
    if (error) {
      const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
      this.draft.set({ ...p, stockQty: Number.isFinite(n) ? n : p.stockQty });
      return;
    }
    this.draft.set({ ...p, stockQty: parseStockQty(raw) });
  }

  addSwatchById(id: string): void {
    const swatch = this.swatchOptions.find((s) => s.id === id);
    if (swatch) this.addSwatch(swatch);
  }

  onCustomColorInput(raw: string): void {
    this.customColorText = raw;
    if (this.customColorError()) {
      this.customColorError.set(customColorError(raw, this.selectedColors()));
    }
  }

  onCustomColorKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    this.addCustomColor();
  }

  addCustomColor(): void {
    const error = customColorError(this.customColorText, this.selectedColors());
    this.customColorError.set(error);
    if (error) return;
    const name = this.customColorText.trim();
    const swatch = matchKnownColor(name, this.swatchOptions) ?? freeTextSwatch(name);
    this.addSwatch(swatch);
    this.customColorText = '';
    this.customColorError.set('');
  }

  addSwatch(swatch: ProductColor): void {
    const p = this.draft();
    if (!p || this.selectedColors().some((c) => c.id === swatch.id)) return;
    this.draft.set(applySelectedSwatches(p, [...this.selectedColors(), swatch]));
  }

  removeSwatch(swatch: ProductColor): void {
    const p = this.draft();
    if (!p) return;
    this.draft.set(applySelectedSwatches(p, this.selectedColors().filter((c) => c.id !== swatch.id)));
  }

  isSwatchSelected(id: string): boolean {
    return this.selectedColors().some((c) => c.id === id);
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
        priceLabel: formatAdminPriceLabel(0),
      },
      0,
    );
    this.draft.set({ ...p, pieces: [...(p.pieces ?? []), piece] });
  }

  async removePiece(index: number): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remover peça',
      message: 'Remover esta peça do look?',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    const p = this.draft();
    if (!p?.pieces) return;
    const pieces = p.pieces.filter((_, i) => i !== index);
    this.draft.set({ ...p, pieces });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    this.pendingFiles = files;
    this.pendingFileLabel.set(files.length === 1 ? files[0]!.name : `${files.length} fotos`);
    this.uploadError.set('');
    this.sendPendingFiles();
  }

  retryUpload(): void {
    if (!this.pendingFiles.length || this.uploading()) return;
    this.sendPendingFiles();
  }

  private sendPendingFiles(): void {
    const files = this.pendingFiles;
    if (!files.length) return;

    const p = this.draft();
    if (!p) return;

    if (!this.useApi) {
      const urls = files.map((f) => URL.createObjectURL(f));
      const gallery = [...(p.gallery ?? []), ...urls];
      const thumb = p.thumb || urls[0] || '';
      this.draft.set({ ...p, thumb, gallery });
      this.galleryItems.set(this.adminCatalog.mediaOf({ ...p, thumb, gallery }));
      this.uploadError.set('');
      this.toast.info('Fotos adicionadas localmente (demo).');
      return;
    }

    if (this.isNew() || !p.slug) {
      this.toast.info('Salve o produto antes de enviar fotos.');
      return;
    }

    this.uploading.set(true);
    this.uploadError.set('');
    this.adminCatalog.uploadAndAttach$(p.slug, files).subscribe({
      next: (updated) => {
        this.uploading.set(false);
        this.pendingFiles = [];
        this.pendingFileLabel.set('Escolher fotos');
        this.uploadError.set('');
        this.loadDraft(structuredClone(updated));
        this.toast.success('Fotos enviadas.');
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(photoUploadErrorMessage(err) || PHOTO_UPLOAD_FAILED);
        this.toast.error(PHOTO_UPLOAD_FAILED);
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
      this.toast.success('Ordem da galeria atualizada.');
      return;
    }

    this.adminCatalog.reorderMediaViaApi(
      p.slug,
      items.map((m) => m.id),
    ).subscribe({
      next: (updated) => {
        this.loadDraft(structuredClone(updated));
        this.toast.success('Ordem das fotos salva.');
      },
      error: (err) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível reordenar as fotos.'));
        this.refreshFromApi(p.slug);
      },
    });
  }

  async removeGalleryItem(index: number): Promise<void> {
    const items = [...this.galleryItems()];
    const target = items[index];
    if (!target) return;

    const ok = await this.confirm.confirm({
      title: 'Remover foto',
      message: 'Remover esta foto?',
      confirmLabel: 'Remover',
      destructive: true,
    });
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
        this.toast.success('Foto removida.');
      },
      error: (err) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível remover a foto.'));
      },
    });
  }

  save(): void {
    if (this.saving()) return;
    this.saveError.set('');
    const p = this.draft();
    if (!p) return;
    const name = keepOrTrim(p.name, this.loadedName);
    if (!name.trim()) {
      this.nameError.set(NAME_REQUIRED_MESSAGE);
      queueMicrotask(() => document.getElementById('atelier-product-name')?.focus());
      return;
    }
    this.nameError.set('');
    if (this.isNew() ? !this.hasCollectionSelected() : !p.collectionSlug) {
      this.collectionError.set(
        this.isNew() ? COLLECTION_REQUIRED_MESSAGE : 'Selecione uma coleção.',
      );
      return;
    }
    this.collectionError.set('');
    const priceParsed = parsePricePtBr(this.priceText);
    if (!priceParsed.ok) {
      this.priceError.set(priceParsed.error);
      return;
    }
    this.priceError.set('');
    const stockMessage = stockQtyError(p.stockQty);
    if (stockMessage) {
      this.stockError.set(stockMessage);
      this.saveError.set(stockMessage);
    }

    const details =
      this.detailsText === this.loadedDetailsText
        ? this.loadedDetails
        : this.detailsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);

    let slug = this.isNew() ? p.slug.trim() : keepOrTrim(p.slug, this.loadedSlug);
    if (this.isNew()) {
      slug = uniqueAdminSlug(
        slug || p.name,
        (s) => s === ADMIN_NEW_PRODUCT_SLUG || this.adminCatalog.slugExists(s),
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
    const chipsChanged = chipKey(p.colors ?? []) !== this.loadedChipKey;
    const pricePatch =
      this.priceText === this.loadedPriceText
        ? {
            price: this.loadedPrice,
            priceCents: this.loadedPriceCents,
            priceLabel: this.loadedPriceLabel,
          }
        : syncPriceFields(priceParsed.reais);
    const next: Product = {
      ...p,
      id: slug,
      slug,
      name,
      color: chipsChanged ? colorLabelFromSwatches(p.colors ?? []) : this.loadedColor,
      colors: chipsChanged ? paletteColorsForSave(p.colors ?? []) : this.loadedColors,
      size: keepOrTrim(p.size ?? '', this.loadedSize),
      fabric: keepOrTrim(p.fabric ?? '', this.loadedFabric),
      season: keepOrTrim(p.season ?? '', this.loadedSeason),
      description: keepOrTrim(p.description ?? '', this.loadedDescription),
      collectionSlug: p.collectionSlug || slugFromCollection(p.collection),
      gallery: galleryUrls.length ? galleryUrls : p.gallery,
      details,
      thumb:
        p.thumb === this.loadedThumb
          ? this.loadedThumb
          : p.thumb.trim() || galleryUrls[0] || p.thumb,
      pieces: pieces.length ? pieces : undefined,
      media: this.galleryItems(),
      stockQty:
        p.stockQty === this.loadedStockQty ? this.loadedStockQty : parseStockQty(p.stockQty),
      status: this.isArchived() ? 'archived' : this.currentStatus(),
      ...pricePatch,
    };

    this.setSaving(true);
    this.adminCatalog.saveProduct$(next, {
      isNew: this.isNew(),
      details,
      original: this.isNew() ? undefined : this.product(),
    }).subscribe({
      next: (saved) => {
        this.setSaving(false);
        this.saveError.set('');
        if (!this.useApi) this.catalog.refreshLocalCatalog();
        if (this.isNew()) this.slugLocked = true;
        this.loadDraft(structuredClone(saved));
        this.baseline = this.fingerprint();
        this.toast.success(this.isNew() ? 'Produto criado.' : SAVED_TOAST, {
          durationMs: SAVE_TOAST_MS,
        });
        this.settleAfterSave();
        this.saved.emit(saved);
      },
      error: (err) => {
        this.setSaving(false);
        const message = adminHttpErrorMessage(err);
        if (message === MULTI_COLLECTION_CHANGE_BLOCKED) {
          void this.confirm.confirm({
            title: 'Coleção',
            message,
            confirmLabel: 'OK',
            hideCancel: true,
          });
          return;
        }
        this.saveError.set(message);
        this.toast.error(message);
      },
    });
  }

  async archive(): Promise<void> {
    const p = this.draft();
    if (!p || this.isNew() || this.archiving() || this.saving()) return;
    const ok = await confirmArchivePiece(this.confirm);
    if (!ok) return;
    this.archiving.set(true);
    this.adminCatalog.archiveViaApi(p.slug).subscribe({
      next: (saved) => {
        this.archiving.set(false);
        this.archived.emit({
          ...saved,
          archivedAt: saved.archivedAt ?? new Date().toISOString(),
        });
      },
      error: (err) => {
        this.archiving.set(false);
        this.toast.error(
          archiveAwareError(err, adminHttpErrorMessage(err, 'Não foi possível arquivar.')),
        );
      },
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.saving() || this.isDirty()) {
      event.preventDefault();
      event.returnValue = true;
    }
  }

  async cancel(): Promise<void> {
    if (this.saving()) {
      const ok = await this.confirm.confirm({
        title: LEAVE_WHILE_SAVING_TITLE,
        message: LEAVE_WHILE_SAVING_MESSAGE,
        confirmLabel: 'Sair',
        cancelLabel: 'Esperar',
        destructive: true,
      });
      if (!ok) return;
      this.cancelled.emit();
      return;
    }
    if (this.isDirty()) {
      const ok = await this.confirm.confirm({
        title: UNSAVED_TITLE,
        message: UNSAVED_MESSAGE,
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar editando',
        destructive: true,
      });
      if (!ok) return;
    }
    this.cancelled.emit();
  }

  onDescriptionChange(raw: string): void {
    const p = this.draft();
    if (!p) return;
    const description = raw.length > DESCRIPTION_MAX_LENGTH ? raw.slice(0, DESCRIPTION_MAX_LENGTH) : raw;
    this.draft.set({ ...p, description });
  }

  private setSaving(value: boolean): void {
    this.saving.set(value);
    this.savingChange.emit(value);
  }

  /** After create, stay at the top so the toast does not sit over the form. */
  private settleAfterSave(): void {
    (document.activeElement as HTMLElement | null)?.blur();
    if (!this.isNew()) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  sitePath(): string {
    const p = this.draft();
    return p?.slug ? productPath(p.slug) : '/';
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
