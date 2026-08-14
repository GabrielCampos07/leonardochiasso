import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { CheckoutDraftService } from '../../core/checkout-draft.service';
import { ROUTES } from '../../core/routes';
import { environment } from '../../../environments/environment';

interface CheckoutOrderItem {
  product?: { slug?: string };
}

interface CheckoutOrder {
  items: CheckoutOrderItem[];
}

@Component({
  selector: 'lc-checkout-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="chk lc-container">
      <p class="lc-label-outline">Pedido</p>
      <h1 class="chk__title">Pagamento recebido</h1>
      <p class="chk__body">
        @if (code()) {
          Código do pedido: <strong>{{ code() }}</strong>
        } @else {
          Obrigado. Você receberá a confirmação por e-mail.
        }
      </p>
      <a class="chk__link" [routerLink]="home">Voltar à loja</a>
    </section>
  `,
  styles: `
    .chk {
      padding: 64px 24px 96px;
      max-width: 560px;
    }
    .chk__title {
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: 2rem;
      margin: 8px 0 16px;
    }
    .chk__body {
      color: var(--lc-ash);
      margin-bottom: 32px;
    }
    .chk__link {
      color: var(--lc-void);
      text-decoration: underline;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 0.75rem;
    }
  `,
})
export class CheckoutSuccessPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);
  private readonly draft = inject(CheckoutDraftService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');

  readonly home = ROUTES.home;
  readonly code = signal('');

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code') ?? '';
    this.code.set(code);
    this.draft.clear();
    this.clearPurchasedFromCart(code);
  }

  private clearPurchasedFromCart(code: string): void {
    if (environment.demoMode || !code) {
      this.cart.clear();
      return;
    }

    this.http.get<CheckoutOrder>(`${this.base}/api/checkout/orders/${code}`).subscribe({
      next: (order) => {
        const slugs = (order.items ?? [])
          .map((i) => i.product?.slug)
          .filter((s): s is string => !!s);
        if (slugs.length) {
          this.cart.removePurchased(slugs);
        } else {
          this.cart.clear();
        }
      },
      // Session covered the whole bag — if status lookup fails, still empty it.
      error: () => this.cart.clear(),
    });
  }
}

@Component({
  selector: 'lc-checkout-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="chk lc-container">
      <p class="lc-label-outline">Pedido</p>
      <h1 class="chk__title">Pagamento cancelado</h1>
      <p class="chk__body">
        Nenhuma cobrança foi feita. Você pode revisar a sacola e tentar novamente.
      </p>
      <a class="chk__link" [routerLink]="home">Voltar à loja</a>
    </section>
  `,
  styles: `
    .chk {
      padding: 64px 24px 96px;
      max-width: 560px;
    }
    .chk__title {
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: 2rem;
      margin: 8px 0 16px;
    }
    .chk__body {
      color: var(--lc-ash);
      margin-bottom: 32px;
    }
    .chk__link {
      color: var(--lc-void);
      text-decoration: underline;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 0.75rem;
    }
  `,
})
export class CheckoutCancelPage {
  readonly home = ROUTES.home;
}
