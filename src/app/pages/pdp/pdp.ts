import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog.service';
import { ContentAdminService } from '../../core/content-admin.service';
import { AdminCatalogService, adminHttpErrorMessage, syncPiecePrice } from '../../core/admin-catalog.service';
import { AdminSessionService } from '../../core/admin-session.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import {
  Product,
  ProductColor,
  ProductMedia,
  ProductPiece,
  colorSwatches,
  formatPriceLabel,
  productWithPiece,
  resolveProductHeroImage,
} from '../../core/product.model';
import { ChromeService } from '../../core/chrome.service';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';
import { LcEditableText } from '../../shared/components/edit/editable-text';
import { LcEditablePieces } from '../../shared/components/edit/editable-pieces';
import { LcEditableColors } from '../../shared/components/edit/editable-colors';
import { LcImageBindingPicker } from '../../shared/components/edit/image-binding-picker';
import {
  COLLECTION_SLUGS,
  ROUTES,
  collectionPath,
} from '../../core/routes';
import { PRICES_ON_REQUEST, displayPriceLabel } from '../../core/pricing';
import { WishlistService } from '../../core/wishlist.service';
import { LcButton } from '../../shared/components/button/button';
import { LcTrashButton } from '../../shared/components/feedback/trash-button';

@Component({
  selector: 'lc-pdp-page',
  standalone: true,
  imports: [
    RouterLink,
    LcButton,
    ImageLightbox,
    LcEditableText,
    LcEditablePieces,
    LcEditableColors,
    LcImageBindingPicker,
    LcTrashButton,
    DragDropModule,
  ],
  templateUrl: './pdp.html',
  styleUrl: './pdp.scss',
})
export class PdpPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly chrome = inject(ChromeService);
  private readonly catalog = inject(CatalogService);
  private readonly contentAdmin = inject(ContentAdminService);
  private readonly adminCatalog = inject(AdminCatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly admin = inject(AdminSessionService);
  readonly wishlist = inject(WishlistService);

  readonly home = ROUTES.home;
  readonly product = signal<Product | null>(null);
  /** Page-local: true until getProductBySlug emits. */
  readonly loading = signal(true);
  readonly activeImage = signal(0);
  readonly selectedPieceId = signal<string | null>(null);
  readonly selectedColorId = signal<string | null>(null);
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  readonly manualGallery = signal(false);
  readonly bindingPickerOpen = signal(false);
  readonly bindingTarget = signal<{ pieceId?: string; colorId?: string } | null>(null);
  readonly uploading = signal(false);

  private touchStartX = 0;
  private swiped = false;

  readonly pieces = computed(() => this.product()?.pieces ?? []);

  readonly selectedPiece = computed((): ProductPiece | null => {
    const pieces = this.pieces();
    if (!pieces.length) return null;
    const id = this.selectedPieceId();
    return pieces.find((p) => p.id === id) ?? pieces[0] ?? null;
  });

  readonly display = computed(() => {
    const p = this.product();
    if (!p) return null;
    return productWithPiece(p, this.selectedPiece()?.id);
  });

  readonly priceLabel = computed(() => displayPriceLabel(this.display()?.priceLabel));

  readonly pricesOnRequest = PRICES_ON_REQUEST;

  readonly swatches = computed((): ProductColor[] => {
    const p = this.display();
    if (!p) return [];
    return colorSwatches(p.colors, p.color);
  });

  readonly heroFocus = computed(() => {
    const p = this.product();
    if (!p || this.manualGallery()) return null;
    return resolveProductHeroImage(p, this.selectedPieceId(), this.selectedColorId());
  });

  readonly mainImage = computed(() => {
    const urls = this.galleryUrls();
    const hero = this.heroFocus();
    if (hero?.url && !this.manualGallery()) return hero.url;
    return urls[this.activeImage()] ?? urls[0] ?? '';
  });

  readonly collectionRoute = computed(() => {
    const p = this.product();
    const slug = p?.collectionSlug ?? COLLECTION_SLUGS.organicDreams;
    return collectionPath(slug);
  });

  /** Media items with ids for gallery DnD (falls back to gallery URLs). */
  readonly galleryMedia = computed((): ProductMedia[] =>
    this.adminCatalog.mediaOf(this.product()),
  );

  /** Canonical ordered URLs — always aligned with thumb indices. */
  readonly galleryUrls = computed((): string[] =>
    this.galleryMedia().map((m) => m.cdnUrl),
  );

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loading.set(true);
    this.catalog.getProductBySlug(slug).subscribe((p) => {
      this.product.set(p ?? null);
      this.activeImage.set(0);
      this.manualGallery.set(false);
      this.selectedPieceId.set(p?.pieces?.[0]?.id ?? null);
      this.selectedColorId.set(null);
      this.syncImageFromSelection();
      this.loading.set(false);
      if (p?.category === 'masculino' || p?.category === 'feminino') {
        this.chrome.setActive(p.category);
      }
    });
  }

  selectPiece(pieceId: string): void {
    this.selectedPieceId.set(pieceId);
    this.manualGallery.set(false);
    this.syncImageFromSelection();
  }

  selectColor(colorId: string): void {
    this.selectedColorId.set(this.selectedColorId() === colorId ? null : colorId);
    this.manualGallery.set(false);
    this.syncImageFromSelection();
  }

  openPiecesManager(pieceId?: string): void {
    if (pieceId) this.selectedPieceId.set(pieceId);
    else if (!this.selectedPieceId() && this.pieces()[0]) {
      this.selectedPieceId.set(this.pieces()[0]!.id);
    }
    this.bindingTarget.set({
      pieceId: pieceId ?? this.selectedPieceId() ?? undefined,
    });
    this.bindingPickerOpen.set(true);
  }

  openColorBinding(colorId: string): void {
    this.selectedColorId.set(colorId);
    this.bindingTarget.set({ colorId });
    this.bindingPickerOpen.set(true);
  }

  onManagerSelectPiece(pieceId: string): void {
    this.selectPiece(pieceId);
    this.bindingTarget.set({ pieceId });
  }

  addPiece(): void {
    const p = this.product();
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
    const pieces = [...(p.pieces ?? []), piece];
    this.contentAdmin.patchProductField(p.slug, 'pieces', pieces).subscribe({
      next: (next) => {
        if (next) {
          this.applyProduct(next);
          this.selectedPieceId.set(piece.id);
          this.bindingTarget.set({ pieceId: piece.id });
          this.toast.success('Peça adicionada.');
        }
      },
      error: (err: unknown) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível adicionar a peça.'));
      },
    });
  }

  async removePiece(pieceId: string): Promise<void> {
    const p = this.product();
    if (!p?.pieces?.length) return;

    const ok = await this.confirm.confirm({
      title: 'Remover peça',
      message: 'Remover esta peça do look?',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;

    const pieces = p.pieces.filter((x) => x.id !== pieceId);
    const bindings = (p.imageBindings ?? []).filter((b) => b.pieceId !== pieceId);

    this.contentAdmin.patchProductField(p.slug, 'pieces', pieces).subscribe({
      next: (next) => {
        if (!next) return;
        const apply = (product: Product) => {
          this.applyProduct(product);
          const still = product.pieces?.some((x) => x.id === this.selectedPieceId());
          if (!still) {
            this.selectedPieceId.set(product.pieces?.[0]?.id ?? null);
          }
          this.bindingTarget.set({
            pieceId: this.selectedPieceId() ?? undefined,
          });
          this.toast.success('Peça removida.');
        };

        if (bindings.length !== (p.imageBindings ?? []).length) {
          this.contentAdmin.patchProductField(p.slug, 'imageBindings', bindings).subscribe({
            next: (withBindings) => apply(withBindings ?? next),
            error: () => apply(next),
          });
          return;
        }
        apply(next);
      },
      error: (err: unknown) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível remover a peça.'));
      },
    });
  }

  selectImage(index: number): void {
    this.manualGallery.set(true);
    this.activeImage.set(index);
  }

  prevImage(): void {
    const urls = this.galleryUrls();
    if (urls.length < 2) return;
    this.manualGallery.set(true);
    const i = this.activeImage();
    this.activeImage.set((i - 1 + urls.length) % urls.length);
  }

  nextImage(): void {
    const urls = this.galleryUrls();
    if (urls.length < 2) return;
    this.manualGallery.set(true);
    const i = this.activeImage();
    this.activeImage.set((i + 1) % urls.length);
  }

  onTouchStart(event: TouchEvent): void {
    this.swiped = false;
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  onTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0]?.clientX ?? 0;
    const delta = endX - this.touchStartX;
    if (Math.abs(delta) < 40) return;
    this.swiped = true;
    if (delta < 0) this.nextImage();
    else this.prevImage();
  }

  openLightbox(): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    const src = this.mainImage();
    const name = this.display()?.name ?? this.product()?.name ?? '';
    if (!src) return;
    this.lightbox.set({ src, alt: name });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }

  async toggleWish(): Promise<void> {
    const p = this.product();
    if (!p) return;

    if (this.wishlist.has(p.id)) {
      const ok = await this.confirm.confirm({
        title: 'Remover dos favoritos',
        message: 'Remover esta peça da lista de favoritos?',
        confirmLabel: 'Remover',
        destructive: true,
      });
      if (!ok) return;
      this.wishlist.remove(p.id);
      this.toast.success('Removido dos favoritos.');
      return;
    }

    this.wishlist.add(p.id);
    this.toast.success('Adicionado aos favoritos.');
  }

  patchField(path: string, value: string | string[]): void {
    const p = this.product();
    if (!p) return;
    this.contentAdmin.patchProductField(p.slug, path, value).subscribe((next) => {
      if (next) this.applyProduct(next);
    });
  }

  renamePiece(pieceId: string, name: string): void {
    const p = this.product();
    if (!p?.pieces) return;
    const idx = p.pieces.findIndex((x) => x.id === pieceId);
    if (idx < 0) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === p.pieces[idx]!.name) return;
    this.contentAdmin.patchProductField(p.slug, `pieces.${idx}.name`, trimmed).subscribe({
      next: (next) => {
        if (next) {
          this.applyProduct(next);
          this.toast.success('Peça atualizada.');
        }
      },
      error: (err: unknown) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível renomear a peça.'));
      },
    });
  }

  renameColor(colorId: string, name: string): void {
    const p = this.product();
    if (!p) return;
    const colors = p.colors ?? [];
    const idx = colors.findIndex((c) => c.id === colorId);
    if (idx < 0) return;
    this.patchField(`colors.${idx}.name`, name);
  }

  renameDetail(index: number, text: string): void {
    const p = this.product();
    if (!p?.details?.length || index < 0 || index >= p.details.length) return;
    const details = [...p.details];
    details[index] = text;
    this.patchField('details', details);
  }

  bindGalleryIndex(index: number): void {
    const p = this.product();
    const target = this.bindingTarget();
    if (!p || !target) return;
    if (this.bindingManagesPieces() && !target.pieceId) {
      this.toast.info('Selecione uma peça antes de vincular a foto.');
      return;
    }
    if (!target.pieceId && !target.colorId) return;

    const bindings = [...(p.imageBindings ?? [])];
    const existing = bindings.findIndex(
      (b) =>
        (target.pieceId ? b.pieceId === target.pieceId : !b.pieceId) &&
        (target.colorId ? b.colorId === target.colorId : !b.colorId),
    );
    const entry = {
      pieceId: target.pieceId,
      colorId: target.colorId,
      galleryIndex: index,
    };
    if (existing >= 0) bindings[existing] = { ...bindings[existing], ...entry };
    else bindings.push(entry);
    this.contentAdmin.patchProductField(p.slug, 'imageBindings', bindings).subscribe({
      next: (next) => {
        if (next) {
          this.applyProduct(next);
          this.syncImageFromSelection();
          this.toast.success('Foto vinculada.');
        }
      },
      error: (err: unknown) => {
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível vincular a foto.'));
      },
    });
    if (!this.bindingManagesPieces()) {
      this.bindingPickerOpen.set(false);
      this.bindingTarget.set(null);
    }
  }

  /** Piece manager modal (vs color-only photo bind). */
  bindingManagesPieces(): boolean {
    return Boolean(this.bindingPickerOpen() && !this.bindingTarget()?.colorId);
  }

  bindingColorLabel(): string | null {
    const id = this.bindingTarget()?.colorId;
    if (!id) return null;
    return this.swatches().find((c) => c.id === id)?.name ?? null;
  }

  closeBindingPicker(): void {
    this.bindingPickerOpen.set(false);
    this.bindingTarget.set(null);
  }

  onGalleryFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const p = this.product();
    if (!p) return;

    if (!this.adminCatalog.useApi) {
      const urls = files.map((f) => URL.createObjectURL(f));
      const gallery = [...(p.gallery ?? []), ...urls];
      const next: Product = {
        ...p,
        thumb: p.thumb || urls[0] || '',
        gallery,
      };
      this.adminCatalog.save(next);
      this.applyProduct(next);
      this.manualGallery.set(true);
      this.activeImage.set(Math.max(0, gallery.length - files.length));
      return;
    }

    this.uploading.set(true);
    this.adminCatalog.uploadAndAttach$(p.slug, files).subscribe({
      next: (updated) => {
        this.uploading.set(false);
        this.applyProduct(updated);
        this.manualGallery.set(true);
        const start = Math.max(0, (updated.gallery?.length ?? 1) - files.length);
        this.activeImage.set(start);
        this.toast.success('Fotos adicionadas.');
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Falha no upload.'));
      },
    });
  }

  dropGallery(event: CdkDragDrop<ProductMedia[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const p = this.product();
    if (!p) return;

    const items = [...this.galleryMedia()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    const urls = items.map((m) => m.cdnUrl);
    const next: Product = {
      ...p,
      media: items.map((m, i) => ({ ...m, sortOrder: i })),
      gallery: urls,
      thumb: urls[0] ?? p.thumb,
    };
    this.applyProduct(next);
    this.manualGallery.set(true);
    this.activeImage.set(event.currentIndex);

    if (!this.adminCatalog.useApi || items.some((m) => m.id.startsWith('local-'))) {
      this.adminCatalog.save(next);
      return;
    }

    this.adminCatalog.reorderMediaViaApi(p.slug, items.map((m) => m.id)).subscribe({
      next: (updated) => {
        this.applyProduct(updated);
        this.toast.success('Ordem das fotos atualizada.');
      },
      error: (err: unknown) => {
        this.applyProduct(p);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível reordenar.'));
      },
    });
  }

  isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 188;
  }

  private applyProduct(next: Product): void {
    this.product.set(next);
    this.catalog.products.update((list) =>
      list.map((x) => (x.slug === next.slug ? next : x)),
    );
  }

  async removeGalleryImage(index: number): Promise<void> {
    const p = this.product();
    const items = this.galleryMedia();
    const target = items[index];
    if (!p || !target) return;

    const ok = await this.confirm.confirm({
      title: 'Remover foto',
      message: 'Remover esta foto? Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;

    if (!this.adminCatalog.useApi || target.id.startsWith('local-')) {
      const nextItems = items.filter((_, i) => i !== index);
      const urls = nextItems.map((m) => m.cdnUrl);
      const next: Product = {
        ...p,
        media: nextItems.map((m, i) => ({ ...m, sortOrder: i, isPrimary: i === 0 })),
        gallery: urls,
        thumb: urls[0] ?? '',
      };
      this.adminCatalog.save(next);
      this.applyProduct(next);
      this.manualGallery.set(true);
      this.activeImage.set(Math.min(index, Math.max(0, urls.length - 1)));
      this.toast.success('Foto removida.');
      return;
    }

    this.uploading.set(true);
    this.adminCatalog.detachMediaViaApi(p.slug, target.id).subscribe({
      next: (updated) => {
        this.uploading.set(false);
        this.applyProduct(updated);
        this.manualGallery.set(true);
        const len = updated.media?.length ?? updated.gallery?.length ?? 0;
        this.activeImage.set(Math.min(index, Math.max(0, len - 1)));
        this.toast.success('Foto removida.');
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.toast.error(adminHttpErrorMessage(err, 'Não foi possível remover a foto.'));
      },
    });
  }

  private syncImageFromSelection(): void {
    const p = this.product();
    if (!p) return;
    const hero = resolveProductHeroImage(
      p,
      this.selectedPieceId(),
      this.selectedColorId(),
    );
    if (hero.url) {
      const urls = this.galleryUrls();
      const idx = urls.indexOf(hero.url);
      if (idx >= 0) {
        this.activeImage.set(idx);
        return;
      }
    }
    if (hero.galleryIndex != null && hero.galleryIndex >= 0) {
      const url = (p.gallery ?? [])[hero.galleryIndex];
      if (url) {
        const idx = this.galleryUrls().indexOf(url);
        if (idx >= 0) {
          this.activeImage.set(idx);
          return;
        }
      }
      this.activeImage.set(hero.galleryIndex);
    }
  }
}
