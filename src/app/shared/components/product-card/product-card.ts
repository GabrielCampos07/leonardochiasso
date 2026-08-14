import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Product,
  ProductColor,
  ProductPiece,
  colorSwatches,
  productWithPiece,
} from '../../../core/product.model';
import { productPath } from '../../../core/routes';
import { displayPriceLabel } from '../../../core/pricing';
import { WishlistService } from '../../../core/wishlist.service';

@Component({
  selector: 'lc-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (placeholder) {
      <article class="card card--placeholder">
        <div class="card__media"></div>
        <p class="card__name">Em breve</p>
      </article>
    } @else if (product) {
      <article class="card">
        <div
          class="card__media"
          [class.is-focus-top]="selectedPiece()?.imageFocus === 'top'"
          [class.is-focus-center]="selectedPiece()?.imageFocus === 'center'"
          [class.is-focus-bottom]="selectedPiece()?.imageFocus === 'bottom'"
          [class.is-focus-waist]="selectedPiece()?.imageFocus === 'waist'"
        >
          <a [routerLink]="linkFor(product)" class="card__link">
            <img [src]="displayThumb()" [alt]="displayName()" />
          </a>
          <button
            class="card__wish"
            type="button"
            [attr.aria-label]="wishlist.has(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
            [attr.aria-pressed]="wishlist.has(product.id)"
            (click)="onToggleWish($event)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                [attr.fill]="wishlist.has(product.id) ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="1.2"
                d="M12 19s-6.5-4.2-8.5-8A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 20.5 11c-2 3.8-8.5 8-8.5 8z"
              />
            </svg>
          </button>
        </div>

        @if (hasPieces()) {
          <div class="card__pieces" role="group" aria-label="Escolher peça">
            @for (piece of product.pieces!; track piece.id) {
              <button
                type="button"
                class="card__piece"
                [class.is-active]="selectedPieceId() === piece.id"
                (click)="selectPiece(piece.id, $event)"
              >
                {{ piece.name }}
              </button>
            }
          </div>
        }

        <div class="card__info">
          <a [routerLink]="linkFor(product)" class="card__info-link">
            <p class="card__name">{{ displayName() }}</p>
            <p class="card__price">{{ displayPrice() }}</p>
          </a>
          @if (swatches().length) {
            <ul class="card__swatches" aria-label="Cores disponíveis">
              @for (c of swatches(); track c.id) {
                <li>
                  <span
                    class="card__swatch"
                    [style.background]="c.hex"
                    [class.card__swatch--light]="isLight(c.hex)"
                    [attr.title]="c.name"
                    [attr.aria-label]="c.name"
                  ></span>
                </li>
              }
            </ul>
          }
        </div>
      </article>
    }
  `,
  styles: `
    .card {
      display: block;
      color: inherit;
      position: relative;
    }
    .card__media {
      position: relative;
      aspect-ratio: 3 / 4;
      background: color-mix(in srgb, var(--lc-ash) 18%, var(--lc-white));
      overflow: hidden;
      margin-bottom: 12px;
    }
    .card__link {
      display: block;
      width: 100%;
      height: 100%;
    }
    .card__media img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      transition:
        object-position 0.4s ease,
        transform 0.4s ease;
    }
    .card__media.is-focus-top img {
      object-position: center 8%;
      transform: scale(1.28);
      transform-origin: center top;
    }
    .card__media.is-focus-center img {
      object-position: center center;
      transform: scale(1.12);
      transform-origin: center center;
    }
    .card__media.is-focus-bottom img {
      object-position: center 92%;
      transform: scale(1.55);
      transform-origin: center bottom;
    }
    .card__media.is-focus-waist img {
      object-position: center 48%;
      transform: scale(2.05);
      transform-origin: center 48%;
    }
    .card__wish {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--lc-void);
      background: color-mix(in srgb, var(--lc-white) 72%, transparent);
      backdrop-filter: blur(4px);
      transition: opacity 0.2s ease;
      z-index: 1;
    }
    .card__wish:hover {
      opacity: 0.75;
    }
    .card__wish svg {
      width: 18px;
      height: 18px;
    }
    .card__pieces {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .card__piece {
      padding: 6px 10px;
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: 1px solid color-mix(in srgb, var(--lc-void) 18%, transparent);
      background: transparent;
      color: inherit;
      transition:
        border-color 0.2s ease,
        background 0.2s ease;
    }
    .card__piece.is-active {
      border-color: var(--lc-void);
      background: color-mix(in srgb, var(--lc-void) 5%, transparent);
    }
    .card__info {
      display: block;
      color: inherit;
    }
    .card__info-link {
      display: block;
      color: inherit;
    }
    .card__name {
      font-family: var(--lc-font-body);
      font-size: 14px;
      margin-bottom: 4px;
    }
    .card__price {
      font-family: var(--lc-font-display);
      font-size: 11px;
      letter-spacing: 0.1em;
    }
    .card__swatches {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 0;
      padding: 0;
    }
    .card__swatch {
      display: block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc-void) 18%, transparent);
    }
    .card__swatch--light {
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc-void) 28%, transparent);
    }
    .card--placeholder .card__name {
      color: var(--lc-ash);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-family: var(--lc-font-display);
      font-size: 11px;
    }
  `,
})
export class LcProductCard implements OnChanges {
  @Input() product: Product | null = null;
  @Input() placeholder = false;

  readonly wishlist = inject(WishlistService);

  readonly selectedPieceId = signal<string | null>(null);

  ngOnChanges(): void {
    const first = this.product?.pieces?.[0]?.id ?? null;
    this.selectedPieceId.set(first);
  }

  hasPieces(): boolean {
    return (this.product?.pieces?.length ?? 0) > 1;
  }

  selectedPiece(): ProductPiece | null {
    const pieces = this.product?.pieces;
    if (!pieces?.length) return null;
    const id = this.selectedPieceId();
    return pieces.find((p) => p.id === id) ?? pieces[0] ?? null;
  }

  displayProduct(): Product | null {
    if (!this.product) return null;
    return productWithPiece(this.product, this.selectedPiece()?.id);
  }

  displayName(): string {
    return this.displayProduct()?.name ?? '';
  }

  displayPrice(): string {
    return displayPriceLabel(this.displayProduct()?.priceLabel);
  }

  displayThumb(): string {
    return this.displayProduct()?.thumb ?? this.product?.thumb ?? '';
  }

  swatches(): ProductColor[] {
    const p = this.displayProduct();
    if (!p) return [];
    return colorSwatches(p.colors, p.color);
  }

  isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 188;
  }

  linkFor(product: Product): string {
    return productPath(product.slug);
  }

  selectPiece(pieceId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedPieceId.set(pieceId);
  }

  onToggleWish(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.product) return;
    this.wishlist.toggle(this.product.id);
  }
}
