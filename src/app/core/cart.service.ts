import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  CartItem,
  cartLineKey,
  productWithPiece,
} from './product.model';
import { CatalogService } from './catalog.service';
import { OrdersService } from './orders.service';
import { PRICES_ON_REQUEST, PRICE_ON_REQUEST_LABEL } from './pricing';
import { ROUTES } from './routes';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'lc-cart';

function sameLine(a: CartItem, productId: string, pieceId?: string): boolean {
  return a.productId === productId && (a.pieceId ?? undefined) === (pieceId ?? undefined);
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(CatalogService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly orders = inject(OrdersService);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly items = signal<CartItem[]>(this.readStorage());
  readonly open = signal(false);
  readonly paymentNotice = signal(false);
  readonly checkoutError = signal('');
  readonly checkoutBusy = signal(false);

  readonly lines = computed(() =>
    this.items()
      .map((item) => {
        const base = this.catalog.getById(item.productId);
        if (!base) return null;
        const product = productWithPiece(base, item.pieceId);
        return {
          ...item,
          key: cartLineKey(item.productId, item.pieceId),
          product,
          lineTotal: product.price * item.quantity,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null),
  );

  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));

  readonly subtotal = computed(() => this.lines().reduce((sum, l) => sum + l.lineTotal, 0));

  readonly subtotalLabel = computed(() =>
    PRICES_ON_REQUEST
      ? PRICE_ON_REQUEST_LABEL
      : this.subtotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  );

  constructor() {
    this.catalog.loadProducts().subscribe();

    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
    });
  }

  add(productId: string, quantity = 1, pieceId?: string): void {
    this.items.update((list) => {
      const existing = list.find((i) => sameLine(i, productId, pieceId));
      if (existing) {
        return list.map((i) =>
          sameLine(i, productId, pieceId)
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...list,
        {
          productId,
          quantity,
          ...(pieceId ? { pieceId } : {}),
        },
      ];
    });
    this.open.set(true);
  }

  setQuantity(productId: string, quantity: number, pieceId?: string): void {
    if (quantity < 1) {
      this.remove(productId, pieceId);
      return;
    }
    this.items.update((list) =>
      list.map((i) =>
        sameLine(i, productId, pieceId) ? { ...i, quantity } : i,
      ),
    );
  }

  remove(productId: string, pieceId?: string): void {
    this.items.update((list) =>
      list.filter((i) => !sameLine(i, productId, pieceId)),
    );
  }

  /** Drops lines that were paid for (product id = slug in this storefront). */
  removePurchased(slugs: string[]): void {
    if (!slugs.length) return;
    const bought = new Set(slugs);
    this.items.update((list) => list.filter((i) => !bought.has(i.productId)));
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
    this.paymentNotice.set(false);
    this.checkoutError.set('');
  }

  /** Creates Stripe Checkout session (auth + address required) and redirects. */
  startStripeCheckout(payload: {
    cpf: string;
    phone: string;
    addressId?: string;
    address?: {
      cep: string;
      street: string;
      number: string;
      complement?: string;
      district: string;
      city: string;
      state: string;
    };
  }): void {
    this.checkoutError.set('');
    this.checkoutBusy.set(true);
    const items = this.lines().map((l) => ({
      productSlug: l.product.slug,
      quantity: l.quantity,
      ...(l.pieceId ? { pieceId: l.pieceId } : {}),
    }));
    if (!items.length) {
      this.checkoutBusy.set(false);
      this.checkoutError.set('Sacola vazia.');
      return;
    }

    if (environment.demoMode) {
      const code = `LC-DEMO-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date().toISOString();
      const lines = this.lines();
      this.orders.saveDemoOrder({
        publicCode: code,
        status: 'paid',
        totalCents: Math.round(this.subtotal() * 100),
        currency: 'BRL',
        paidAt: now,
        createdAt: now,
        items: lines.map((l) => ({
          quantity: l.quantity,
          lineTotalCents: Math.round(l.lineTotal * 100),
          product: {
            slug: l.product.slug,
            name: l.product.name,
            priceCents: Math.round(l.product.price * 100),
          },
        })),
      });
      this.checkoutBusy.set(false);
      this.open.set(false);
      void this.router.navigateByUrl(`${ROUTES.checkout}/sucesso?code=${encodeURIComponent(code)}`);
      return;
    }

    this.http
      .post<{ url: string; publicCode: string }>(
        `${this.base}/api/checkout/sessions`,
        {
          items,
          cpf: payload.cpf,
          phone: payload.phone,
          addressId: payload.addressId,
          address: payload.address,
          idempotencyKey: crypto.randomUUID(),
        },
        { withCredentials: true },
      )
      .subscribe({
        next: (res) => {
          this.checkoutBusy.set(false);
          if (res.url) {
            window.location.href = res.url;
          } else {
            this.checkoutError.set('Resposta inválida do checkout.');
          }
        },
        error: (err) => {
          this.checkoutBusy.set(false);
          const msg = err?.error?.message;
          this.checkoutError.set(
            Array.isArray(msg)
              ? msg.join(' ')
              : (msg ??
                'Não foi possível iniciar o pagamento. Configure STRIPE_SECRET_KEY na API.'),
          );
        },
      });
  }

  clear(): void {
    this.items.set([]);
  }

  private readStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
