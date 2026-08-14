import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'fulfillment'
  | 'shipped'
  | 'cancelled'
  | 'refunded';

export interface OrderProductSnap {
  slug?: string;
  name?: string;
  priceCents?: number;
}

export interface CustomerOrder {
  publicCode: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  items: {
    quantity: number;
    lineTotalCents: number;
    product: OrderProductSnap;
  }[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  fulfillment: 'Em preparação',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const DEMO_ORDERS_KEY = 'lc-demo-orders';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly demo = environment.demoMode;

  listMine(): Observable<CustomerOrder[]> {
    if (this.demo) return of(this.readDemoOrders());
    return this.http.get<CustomerOrder[]>(`${this.base}/api/orders`, {
      withCredentials: true,
    });
  }

  /** Persist a demo paid order (frontend-only checkout). */
  saveDemoOrder(order: CustomerOrder): void {
    if (!this.demo) return;
    const list = this.readDemoOrders();
    list.unshift(order);
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
  }

  statusLabel(status: OrderStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  formatMoney(cents: number, currency = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }

  private readDemoOrders(): CustomerOrder[] {
    try {
      const raw = localStorage.getItem(DEMO_ORDERS_KEY);
      return raw ? (JSON.parse(raw) as CustomerOrder[]) : [];
    } catch {
      return [];
    }
  }
}
