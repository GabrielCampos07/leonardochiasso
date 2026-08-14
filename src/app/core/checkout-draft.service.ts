import { Injectable, signal } from '@angular/core';

export interface CheckoutAddressDraft {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export interface CheckoutDraft {
  step: 1 | 2 | 3;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  /** `saved` = pick addressId; `new` = inline form */
  addressMode: 'saved' | 'new';
  addressId: string | null;
  address: CheckoutAddressDraft;
  saveNewAddress: boolean;
}

const STORAGE_KEY = 'lc-checkout-draft';

const emptyAddress = (): CheckoutAddressDraft => ({
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
});

function defaultDraft(): CheckoutDraft {
  return {
    step: 1,
    name: '',
    email: '',
    cpf: '',
    phone: '',
    addressMode: 'new',
    addressId: null,
    address: emptyAddress(),
    saveNewAddress: true,
  };
}

@Injectable({ providedIn: 'root' })
export class CheckoutDraftService {
  readonly draft = signal<CheckoutDraft>(this.read());

  patch(partial: Partial<CheckoutDraft>): void {
    this.draft.update((d) => {
      const next = { ...d, ...partial };
      if (partial.address) {
        next.address = { ...d.address, ...partial.address };
      }
      this.write(next);
      return next;
    });
  }

  setStep(step: 1 | 2 | 3): void {
    this.patch({ step });
  }

  clear(): void {
    const empty = defaultDraft();
    this.draft.set(empty);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private read(): CheckoutDraft {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultDraft();
      return { ...defaultDraft(), ...(JSON.parse(raw) as CheckoutDraft) };
    } catch {
      return defaultDraft();
    }
  }

  private write(draft: CheckoutDraft): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }
}
