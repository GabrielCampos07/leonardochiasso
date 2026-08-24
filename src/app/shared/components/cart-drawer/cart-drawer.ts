import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { CartService } from '../../../core/cart.service';
import { ConfirmService } from '../../../core/feedback/confirm.service';
import { ToastService } from '../../../core/feedback/toast.service';
import { displayPriceLabel } from '../../../core/pricing';
import { ROUTES } from '../../../core/routes';

@Component({
  selector: 'lc-cart-drawer',
  standalone: true,
  imports: [],
  template: `
    @if (cart.open()) {
      <div class="cart" role="dialog" aria-label="Sacola">
        <div class="cart__scrim" (click)="cart.close()"></div>
        <aside class="cart__panel">
          <div class="cart__head">
            <h2>SACOLA ({{ cart.count() }})</h2>
            <button type="button" aria-label="Fechar" (click)="cart.close()">✕</button>
          </div>

          @if (cart.lines().length === 0) {
            <p class="cart__empty lc-body-s">Sua sacola está vazia.</p>
          } @else {
            <ul class="cart__list">
              @for (line of cart.lines(); track line.key) {
                <li class="cart__item">
                  <img [src]="line.product.thumb" [alt]="line.product.name" />
                  <div class="cart__meta">
                    <p class="cart__name">{{ line.product.name }}</p>
                    <p class="cart__detail">{{ line.product.color }} · {{ line.product.size }}</p>
                    <p class="cart__price">{{ priceLabel(line.product.priceLabel) }}</p>
                    <div class="cart__qty">
                      <button
                        type="button"
                        (click)="changeQuantity(line.productId, line.quantity - 1, line.pieceId)"
                      >
                        −
                      </button>
                      <span>{{ line.quantity }}</span>
                      <button
                        type="button"
                        (click)="cart.setQuantity(line.productId, line.quantity + 1, line.pieceId)"
                      >
                        +
                      </button>
                      <button
                        class="cart__remove"
                        type="button"
                        (click)="removeLine(line.productId, line.pieceId)"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>

            <div class="cart__foot">
              <div class="cart__subtotal">
                <span>Subtotal</span>
                <strong>{{ cart.subtotalLabel() }}</strong>
              </div>
              <button class="cart__checkout" type="button" (click)="goCheckout()">
                FINALIZAR COMPRA
              </button>
              <p class="cart__stub lc-caption">
                Checkout em 3 passos. Pagamento seguro via Stripe.
              </p>
              <button class="cart__continue" type="button" (click)="cart.close()">
                CONTINUAR COMPRANDO
              </button>
            </div>
          }
        </aside>
      </div>
    }
  `,
  styles: `
    .cart {
      position: fixed;
      inset: 0;
      z-index: 70;
    }
    .cart__scrim {
      position: absolute;
      inset: 0;
      background: rgb(14 12 14 / 40%);
    }
    .cart__panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(100%, 420px);
      background: var(--lc-white);
      display: flex;
      flex-direction: column;
      padding: 24px;
    }
    @media (max-width: 767px) {
      .cart__panel {
        width: 100%;
      }
    }
    .cart__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .cart__head h2 {
      font-family: var(--lc-font-display);
      font-size: 14px;
      letter-spacing: 0.2em;
      font-weight: 400;
    }
    .cart__empty {
      color: var(--lc-ash);
    }
    .cart__list {
      flex: 1;
      overflow: auto;
    }
    .cart__item {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--lc-ash) 35%, transparent);
    }
    .cart__item img {
      width: 88px;
      height: 110px;
      object-fit: cover;
      background: color-mix(in srgb, var(--lc-ash) 15%, var(--lc-white));
    }
    .cart__name {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .cart__detail,
    .cart__price {
      font-size: 12px;
      color: var(--lc-ash);
      margin-bottom: 4px;
    }
    .cart__qty {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      font-size: 13px;
    }
    .cart__remove {
      margin-left: auto;
      color: var(--lc-ash);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .cart__foot {
      border-top: 1px solid color-mix(in srgb, var(--lc-ash) 40%, transparent);
      padding-top: 20px;
    }
    .cart__subtotal {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      font-family: var(--lc-font-display);
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .cart__checkout {
      width: 100%;
      min-height: 48px;
      background: var(--lc-void);
      color: var(--lc-white);
      font-family: var(--lc-font-display);
      font-size: 11px;
      letter-spacing: 0.2em;
      cursor: pointer;
    }
    .cart__checkout:hover:not(:disabled) {
      opacity: 0.85;
    }
    .cart__checkout:disabled {
      opacity: 0.45;
      cursor: wait;
    }
    .cart__stub {
      text-align: center;
      margin: 12px 0 16px;
    }
    .cart__continue {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--lc-void);
      font-family: var(--lc-font-display);
      font-size: 11px;
      letter-spacing: 0.18em;
    }
  `,
})
export class LcCartDrawer {
  readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  priceLabel(label: string): string {
    return displayPriceLabel(label);
  }

  async changeQuantity(productId: string, quantity: number, pieceId?: string): Promise<void> {
    if (quantity < 1) {
      await this.removeLine(productId, pieceId);
      return;
    }
    this.cart.setQuantity(productId, quantity, pieceId);
  }

  async removeLine(productId: string, pieceId?: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remover da sacola',
      message: 'Remover este item da sacola?',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    this.cart.remove(productId, pieceId);
    this.toast.success('Item removido da sacola.');
  }

  goCheckout(): void {
    this.cart.close();
    if (!this.auth.user()) {
      void this.router.navigate([ROUTES.login], {
        queryParams: { returnUrl: ROUTES.checkout },
      });
      return;
    }
    void this.router.navigateByUrl(ROUTES.checkout);
  }
}
