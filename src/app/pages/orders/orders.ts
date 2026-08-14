import { Component, inject, OnInit, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, of, switchMap, take } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChromeService } from '../../core/chrome.service';
import { CustomerOrder, OrdersService } from '../../core/orders.service';
import {
  COLLECTION_SLUGS,
  ROUTES,
  collectionPath,
  productPath,
} from '../../core/routes';
import { LcButton } from '../../shared/components/button/button';

@Component({
  selector: 'lc-orders-page',
  standalone: true,
  imports: [RouterLink, LcButton],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class OrdersPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly ordersApi = inject(OrdersService);
  private readonly chrome = inject(ChromeService);

  readonly home = ROUTES.home;
  readonly accountRoute = ROUTES.account;
  readonly loginRoute = ROUTES.login;
  readonly collectionRoute = collectionPath(COLLECTION_SLUGS.organicDreams);
  readonly productPath = productPath;

  readonly orders = signal<CustomerOrder[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  private readonly resolved$ = toObservable(this.auth.resolved);

  ngOnInit(): void {
    this.chrome.setActive('default');

    this.resolved$
      .pipe(
        filter(Boolean),
        take(1),
        switchMap(() => {
          if (!this.auth.user()) {
            this.loading.set(false);
            return of(null);
          }
          return this.ordersApi.listMine();
        }),
      )
      .subscribe({
        next: (list) => {
          if (list) this.orders.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar seus pedidos.');
          this.loading.set(false);
        },
      });
  }

  statusLabel(status: CustomerOrder['status']): string {
    return this.ordersApi.statusLabel(status);
  }

  money(cents: number, currency: string): string {
    return this.ordersApi.formatMoney(cents, currency);
  }

  date(iso: string): string {
    return this.ordersApi.formatDate(iso);
  }
}
