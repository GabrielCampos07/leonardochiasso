import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AccountApiService,
  AddressDto,
} from '../../core/account-api.service';
import { authErrorMessage } from '../../core/auth.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { CheckoutDraftService } from '../../core/checkout-draft.service';
import type { CheckoutAddressDraft } from '../../core/checkout-draft.service';
import { ChromeService } from '../../core/chrome.service';
import { displayPriceLabel } from '../../core/pricing';
import { ROUTES } from '../../core/routes';

@Component({
  selector: 'lc-checkout-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly draftSvc = inject(CheckoutDraftService);
  private readonly accountApi = inject(AccountApiService);
  private readonly chrome = inject(ChromeService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly home = ROUTES.home;
  readonly draft = this.draftSvc.draft;
  readonly step = computed(() => this.draft().step);
  readonly priceLabel = displayPriceLabel;

  readonly addresses = signal<AddressDto[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly cepBusy = signal(false);

  ngOnInit(): void {
    this.chrome.setActive('default');
    this.cart.close();

    if (!this.cart.lines().length) {
      void this.router.navigateByUrl(ROUTES.home);
      return;
    }

    const user = this.auth.user();
    const d = this.draft();
    if (user && (!d.name || !d.email)) {
      this.draftSvc.patch({
        name: d.name || user.name,
        email: d.email || user.email,
        cpf: d.cpf || user.cpf || '',
        phone: d.phone || user.phone || '',
      });
    }

    this.accountApi.getProfile().subscribe({
      next: (profile) => {
        const cur = this.draft();
        this.draftSvc.patch({
          name: cur.name || profile.name,
          email: cur.email || profile.email,
          cpf: cur.cpf || profile.cpf || '',
          phone: cur.phone || profile.phone || '',
        });
      },
    });

    this.loadAddresses();
  }

  loadAddresses(): void {
    this.accountApi.listAddresses().subscribe({
      next: (list) => {
        this.addresses.set(list);
        const d = this.draft();
        if (list.length && d.addressMode === 'new' && !d.address.cep) {
          const def = list.find((a) => a.isDefault) ?? list[0];
          this.draftSvc.patch({
            addressMode: 'saved',
            addressId: def.id,
          });
        }
      },
    });
  }

  goStep(step: 1 | 2 | 3): void {
    this.error.set('');
    this.draftSvc.setStep(step);
  }

  continueFromData(): void {
    this.error.set('');
    const d = this.draft();
    if (!d.name.trim() || !d.email.trim()) {
      this.error.set('Preencha nome e e-mail.');
      return;
    }
    if (!digits(d.cpf).match(/^\d{11}$/)) {
      this.error.set('Informe um CPF válido.');
      return;
    }
    if (!digits(d.phone).match(/^\d{10,13}$/)) {
      this.error.set('Informe um telefone válido (DDD + número).');
      return;
    }

    this.busy.set(true);
    this.accountApi
      .updateProfile({
        name: d.name.trim(),
        email: d.email.trim(),
        cpf: digits(d.cpf),
        phone: digits(d.phone),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.goStep(2);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(authErrorMessage(err, 'Não foi possível salvar seus dados.'));
        },
      });
  }

  continueFromAddress(): void {
    this.error.set('');
    const d = this.draft();
    if (d.addressMode === 'saved') {
      if (!d.addressId) {
        this.error.set('Selecione um endereço cadastrado.');
        return;
      }
      this.goStep(3);
      return;
    }

    const a = d.address;
    if (
      !a.cep.trim() ||
      !a.street.trim() ||
      !a.number.trim() ||
      !a.district.trim() ||
      !a.city.trim() ||
      !a.state.trim()
    ) {
      this.error.set('Preencha o endereço completo.');
      return;
    }

    if (d.saveNewAddress) {
      this.busy.set(true);
      this.accountApi
        .createAddress({
          cep: a.cep,
          street: a.street,
          number: a.number,
          complement: a.complement || null,
          district: a.district,
          city: a.city,
          state: a.state.toUpperCase(),
          label: null,
          isDefault: this.addresses().length === 0,
        })
        .subscribe({
          next: (created) => {
            this.busy.set(false);
            this.draftSvc.patch({
              addressMode: 'saved',
              addressId: created.id,
            });
            this.loadAddresses();
            this.goStep(3);
          },
          error: (err: unknown) => {
            this.busy.set(false);
            this.error.set(authErrorMessage(err, 'Não foi possível salvar o endereço.'));
          },
        });
      return;
    }

    this.goStep(3);
  }

  selectedAddress(): AddressDto | null {
    const id = this.draft().addressId;
    if (!id) return null;
    return this.addresses().find((a) => a.id === id) ?? null;
  }

  addressLabel(a: AddressDto): string {
    return `${a.street}, ${a.number} — ${a.city}/${a.state}`;
  }

  lookupCep(): void {
    const cep = digits(this.draft().address.cep);
    if (cep.length !== 8) return;
    this.cepBusy.set(true);
    this.http.get<{
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    }>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (res) => {
        this.cepBusy.set(false);
        if (res.erro) return;
        this.patchAddress({
          cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
          street: res.logradouro || this.draft().address.street,
          district: res.bairro || this.draft().address.district,
          city: res.localidade || this.draft().address.city,
          state: res.uf || this.draft().address.state,
        });
      },
      error: () => this.cepBusy.set(false),
    });
  }

  patchAddress(partial: Partial<CheckoutAddressDraft>): void {
    this.draftSvc.patch({
      address: { ...this.draft().address, ...partial },
    });
  }

  pay(): void {
    this.error.set('');
    const d = this.draft();
    const payload: Parameters<CartService['startStripeCheckout']>[0] = {
      cpf: digits(d.cpf),
      phone: digits(d.phone),
    };

    if (d.addressMode === 'saved' && d.addressId) {
      payload.addressId = d.addressId;
    } else {
      payload.address = {
        cep: d.address.cep,
        street: d.address.street,
        number: d.address.number,
        complement: d.address.complement || undefined,
        district: d.address.district,
        city: d.address.city,
        state: d.address.state.toUpperCase(),
      };
    }

    this.cart.startStripeCheckout(payload);
  }
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}
