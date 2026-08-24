import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog.service';
import { ContentAdminService } from '../../core/content-admin.service';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminSessionService } from '../../core/admin-session.service';
import {
  Product,
  ProductColor,
  ProductMedia,
  ProductPiece,
  colorSwatches,
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
import { LcButton } from '../../shared/components/button/button';

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
  readonly admin = inject(AdminSessionService);

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
    const gallery = this.product()?.gallery ?? [];
    const hero = this.heroFocus();
    if (hero?.url && !this.manualGallery()) return hero.url;
    return gallery[this.activeImage()] ?? gallery[0] ?? '';
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
    if (this.admin.editMode()) {
      this.bindingTarget.set({ pieceId });
      this.bindingPickerOpen.set(true);
    }
  }

  selectColor(colorId: string): void {
    this.selectedColorId.set(this.selectedColorId() === colorId ? null : colorId);
    this.manualGallery.set(false);
    this.syncImageFromSelection();
    if (this.admin.editMode()) {
      this.bindingTarget.set({ colorId });
      this.bindingPickerOpen.set(true);
    }
  }

  selectImage(index: number): void {
    this.manualGallery.set(true);
    this.activeImage.set(index);
  }

  prevImage(): void {
    const gallery = this.product()?.gallery ?? [];
    if (gallery.length < 2) return;
    this.manualGallery.set(true);
    const i = this.activeImage();
    this.activeImage.set((i - 1 + gallery.length) % gallery.length);
  }

  nextImage(): void {
    const gallery = this.product()?.gallery ?? [];
    if (gallery.length < 2) return;
    this.manualGallery.set(true);
    const i = this.activeImage();
    this.activeImage.set((i + 1) % gallery.length);
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
    this.patchField(`pieces.${idx}.name`, name);
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
    this.contentAdmin.patchProductField(p.slug, 'imageBindings', bindings).subscribe((next) => {
      if (next) {
        this.applyProduct(next);
        this.syncImageFromSelection();
      }
    });
    this.bindingPickerOpen.set(false);
    this.bindingTarget.set(null);
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
      },
      error: () => this.uploading.set(false),
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
      next: (updated) => this.applyProduct(updated),
      error: () => this.applyProduct(p),
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

  private syncImageFromSelection(): void {
    const p = this.product();
    if (!p) return;
    const hero = resolveProductHeroImage(
      p,
      this.selectedPieceId(),
      this.selectedColorId(),
    );
    if (hero.galleryIndex != null && hero.galleryIndex >= 0) {
      this.activeImage.set(hero.galleryIndex);
    }
  }
}
