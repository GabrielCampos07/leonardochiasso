import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';


export interface ProfileDto {
  id: string;
  email: string;
  name: string;
  cpf: string | null;
  phone: string | null;
}

export interface AddressDto {
  id: string;
  label: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export type AddressBody = Omit<AddressDto, 'id' | 'isDefault'> & {
  isDefault?: boolean;
  label?: string | null;
};

const DEMO_ADDRESSES_KEY = 'lc-demo-addresses';

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly demo = environment.demoMode;

  getProfile(): Observable<ProfileDto> {
    if (this.demo) {
      const user = this.auth.user();
      return of({
        id: user?.id ?? 'demo',
        email: user?.email ?? '',
        name: user?.name ?? '',
        cpf: user?.cpf ?? null,
        phone: user?.phone ?? null,
      });
    }
    return this.http.get<ProfileDto>(`${this.base}/api/account/profile`, {
      withCredentials: true,
    });
  }

  updateProfile(body: {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
  }): Observable<ProfileDto> {
    if (this.demo) {
      const user = this.auth.user();
      const profile: ProfileDto = {
        id: user?.id ?? 'demo',
        email: body.email ?? user?.email ?? '',
        name: body.name ?? user?.name ?? '',
        cpf: body.cpf !== undefined ? body.cpf : (user?.cpf ?? null),
        phone: body.phone !== undefined ? body.phone : (user?.phone ?? null),
      };
      this.auth.applyUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        cpf: profile.cpf,
        phone: profile.phone,
      });
      return of(profile);
    }

    return this.http
      .patch<ProfileDto>(`${this.base}/api/account/profile`, body, {
        withCredentials: true,
      })
      .pipe(
        tap((profile) => {
          this.auth.applyUser({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            cpf: profile.cpf,
            phone: profile.phone,
          });
        }),
      );
  }

  listAddresses(): Observable<AddressDto[]> {
    if (this.demo) return of(this.readDemoAddresses());
    return this.http.get<AddressDto[]>(`${this.base}/api/account/addresses`, {
      withCredentials: true,
    });
  }

  createAddress(body: AddressBody): Observable<AddressDto> {
    if (this.demo) {
      const list = this.readDemoAddresses();
      const address: AddressDto = {
        id: `addr-${crypto.randomUUID()}`,
        label: body.label ?? null,
        cep: body.cep,
        street: body.street,
        number: body.number,
        complement: body.complement ?? null,
        district: body.district,
        city: body.city,
        state: body.state,
        isDefault: body.isDefault ?? list.length === 0,
      };
      if (address.isDefault) {
        list.forEach((a) => (a.isDefault = false));
      }
      list.push(address);
      this.writeDemoAddresses(list);
      return of(address);
    }
    return this.http.post<AddressDto>(`${this.base}/api/account/addresses`, body, {
      withCredentials: true,
    });
  }

  updateAddress(id: string, body: AddressBody): Observable<AddressDto> {
    if (this.demo) {
      const list = this.readDemoAddresses();
      const idx = list.findIndex((a) => a.id === id);
      if (idx < 0) return of(list[0]);
      const next: AddressDto = {
        ...list[idx],
        label: body.label ?? null,
        cep: body.cep,
        street: body.street,
        number: body.number,
        complement: body.complement ?? null,
        district: body.district,
        city: body.city,
        state: body.state,
        isDefault: body.isDefault ?? list[idx].isDefault,
      };
      if (next.isDefault) {
        list.forEach((a) => (a.isDefault = a.id === id));
      }
      list[idx] = next;
      this.writeDemoAddresses(list);
      return of(next);
    }
    return this.http.patch<AddressDto>(
      `${this.base}/api/account/addresses/${id}`,
      body,
      { withCredentials: true },
    );
  }

  deleteAddress(id: string): Observable<void> {
    if (this.demo) {
      this.writeDemoAddresses(this.readDemoAddresses().filter((a) => a.id !== id));
      return of(undefined);
    }
    return this.http.delete<void>(`${this.base}/api/account/addresses/${id}`, {
      withCredentials: true,
    });
  }

  private readDemoAddresses(): AddressDto[] {
    try {
      const raw = localStorage.getItem(DEMO_ADDRESSES_KEY);
      return raw ? (JSON.parse(raw) as AddressDto[]) : [];
    } catch {
      return [];
    }
  }

  private writeDemoAddresses(list: AddressDto[]): void {
    localStorage.setItem(DEMO_ADDRESSES_KEY, JSON.stringify(list));
  }
}
