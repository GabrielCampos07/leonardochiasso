import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog.service';
import {
  Product,
  ProductColor,
  ProductPiece,
  colorSwatches,
  productWithPiece,
} from '../../core/product.model';
import { CartService } from '../../core/cart.service';
import { ChromeService } from '../../core/chrome.service';
import { WishlistService } from '../../core/wishlist.service';
import { LcButton } from '../../shared/components/button/button';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';
import {
  COLLECTION_SLUGS,
  ROUTES,
  collectionPath,
} from '../../core/routes';
import { PRICES_ON_REQUEST, displayPriceLabel } from '../../core/pricing';

@Component({
  selector: 'lc-pdp-page',
  standalone: true,
  imports: [RouterLink, LcButton, ImageLightbox],
  templateUrl: './pdp.html',
  styleUrl: './pdp.scss',
})
export class PdpPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);
  private readonly chrome = inject(ChromeService);
  private readonly catalog = inject(CatalogService);
  readonly wishlist = inject(WishlistService);

  readonly home = ROUTES.home;
  readonly product = signal<Product | null>(null);
  readonly activeImage = signal(0);
  readonly selectedPieceId = signal<string | null>(null);
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);

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

  readonly mainImage = computed(() => {
    const gallery = this.product()?.gallery ?? [];
    const piece = this.selectedPiece();
    const fromGallery = gallery[this.activeImage()] ?? '';
    // Piece thumb in gallery → gallery drives the main image (browseable detail shots)
    if (piece?.thumb && gallery.includes(piece.thumb)) {
      return fromGallery || piece.thumb;
    }
    if (piece?.thumb) return piece.thumb;
    return fromGallery;
  });

  readonly collectionRoute = computed(() => {
    const p = this.product();
    const slug = p?.collectionSlug ?? COLLECTION_SLUGS.organicDreams;
    return collectionPath(slug);
  });

  ngOnInit(): void {
    this.chrome.setActive('feminino');
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.catalog.getProductBySlug(slug).subscribe((p) => {
      this.product.set(p ?? null);
      this.activeImage.set(0);
      this.selectedPieceId.set(p?.pieces?.[0]?.id ?? null);
      this.syncImageToPiece(p?.pieces?.[0] ?? null);
    });
  }

  selectPiece(pieceId: string): void {
    this.selectedPieceId.set(pieceId);
    const piece = this.pieces().find((p) => p.id === pieceId) ?? null;
    this.syncImageToPiece(piece);
  }

  selectImage(index: number): void {
    this.activeImage.set(index);
  }

  prevImage(): void {
    const gallery = this.product()?.gallery ?? [];
    if (gallery.length < 2) return;
    const i = this.activeImage();
    this.activeImage.set((i - 1 + gallery.length) % gallery.length);
  }

  nextImage(): void {
    const gallery = this.product()?.gallery ?? [];
    if (gallery.length < 2) return;
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

  addToBag(): void {
    const p = this.product();
    if (!p) return;
    const piece = this.selectedPiece();
    this.cart.add(p.id, 1, piece?.id);
  }

  toggleWish(): void {
    const p = this.product();
    if (!p) return;
    this.wishlist.toggle(p.id);
  }

  isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 188;
  }

  private syncImageToPiece(piece: ProductPiece | null): void {
    if (!piece?.thumb) return;
    const gallery = this.product()?.gallery ?? [];
    const idx = gallery.indexOf(piece.thumb);
    if (idx >= 0) this.activeImage.set(idx);
  }
}
