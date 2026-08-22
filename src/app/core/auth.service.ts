import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CustomerAccount {
  id: string;
  email: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  lgpdConsent: boolean;
}

interface DemoStoredAccount extends CustomerAccount {
  password: string;
}

const DEMO_SESSION_KEY = 'lc-demo-session';
const DEMO_ACCOUNTS_KEY = 'lc-demo-accounts';

const DEMO_GUEST: CustomerAccount = {
  id: 'demo-atelier',
  email: 'atelier@leonardochiasso.com',
  name: 'Atelier Leonardo Chiasso',
  cpf: null,
  phone: null,
};

/**
 * With `environment.demoMode`, sessions live in localStorage (no Nest cookie).
 * Otherwise customer sessions use httpOnly `lc_session` + withCredentials.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly demo = environment.demoMode;

  readonly user = signal<CustomerAccount | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  /** False until the first `me()` round-trip settles — avoids UI flicker. */
  readonly resolved = signal(false);

  constructor() {
    // Do not probe /api/auth/me on every page load — commerce is optional and
    // anonymous visitors would get a noisy 401. Guards/pages call me() when needed.
    if (this.demo) {
      this.me().subscribe();
    } else {
      this.resolved.set(true);
    }
  }

  register(payload: RegisterPayload): Observable<CustomerAccount> {
    if (this.demo) {
      if (!payload.lgpdConsent) {
        return throwError(() => ({
          error: { message: 'É necessário consentir com a LGPD.' },
        }));
      }
      const accounts = this.readDemoAccounts();
      if (accounts.some((a) => a.email.toLowerCase() === payload.email.toLowerCase())) {
        return throwError(() => ({
          error: { message: 'Já existe uma conta com este e-mail.' },
        }));
      }
      const account: DemoStoredAccount = {
        id: `demo-${crypto.randomUUID()}`,
        email: payload.email.trim(),
        name: payload.name.trim() || 'Cliente',
        password: payload.password,
        cpf: null,
        phone: null,
      };
      accounts.push(account);
      this.writeDemoAccounts(accounts);
      const session = this.toPublic(account);
      this.persistDemoSession(session);
      this.setUser(session);
      return of(session);
    }

    return this.http
      .post<CustomerAccount>(`${this.base}/api/auth/register`, payload, {
        withCredentials: true,
      })
      .pipe(tap((customer) => this.setUser(customer)));
  }

  login(payload: LoginPayload): Observable<CustomerAccount> {
    if (this.demo) {
      const accounts = this.readDemoAccounts();
      const found = accounts.find(
        (a) =>
          a.email.toLowerCase() === payload.email.trim().toLowerCase() &&
          a.password === payload.password,
      );
      if (found) {
        const session = this.toPublic(found);
        this.persistDemoSession(session);
        this.setUser(session);
        return of(session);
      }
      // Demo convenience: any credentials create a one-off session (client preview).
      const session: CustomerAccount = {
        id: `demo-${crypto.randomUUID()}`,
        email: payload.email.trim() || DEMO_GUEST.email,
        name: payload.email.trim().split('@')[0] || 'Cliente demo',
        cpf: null,
        phone: null,
      };
      this.persistDemoSession(session);
      this.setUser(session);
      return of(session);
    }

    return this.http
      .post<CustomerAccount>(`${this.base}/api/auth/login`, payload, {
        withCredentials: true,
      })
      .pipe(tap((customer) => this.setUser(customer)));
  }

  logout(): Observable<void> {
    if (this.demo) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      this.setUser(null);
      return of(undefined);
    }

    return this.http
      .post<void>(`${this.base}/api/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        tap(() => this.setUser(null)),
      );
  }

  /** Hydrates `user` from the session cookie; resolves to null when signed out. */
  me(): Observable<CustomerAccount | null> {
    if (this.demo) {
      const session = this.readDemoSession();
      this.setUser(session);
      return of(session);
    }

    return this.http
      .get<CustomerAccount>(`${this.base}/api/auth/me`, { withCredentials: true })
      .pipe(
        catchError(() => of(null)),
        tap((customer) => this.setUser(customer)),
      );
  }

  /** Demo / local UX shortcut — no API when `demoMode`. */
  devLogin(): Observable<CustomerAccount> {
    if (this.demo) {
      this.persistDemoSession(DEMO_GUEST);
      this.setUser(DEMO_GUEST);
      return of(DEMO_GUEST);
    }

    return this.http
      .post<CustomerAccount>(`${this.base}/api/auth/dev-login`, {}, { withCredentials: true })
      .pipe(tap((customer) => this.setUser(customer)));
  }

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Observable<CustomerAccount> {
    if (this.demo) {
      const user = this.user();
      if (!user) {
        return throwError(() => ({ error: { message: 'Faça login novamente.' } }));
      }
      const accounts = this.readDemoAccounts();
      const idx = accounts.findIndex((a) => a.id === user.id);
      if (idx >= 0) {
        if (accounts[idx].password !== payload.currentPassword) {
          return throwError(() => ({ error: { message: 'Senha atual incorreta.' } }));
        }
        accounts[idx] = { ...accounts[idx], password: payload.newPassword };
        this.writeDemoAccounts(accounts);
      }
      return of(user);
    }

    return this.http
      .post<CustomerAccount>(`${this.base}/api/auth/password`, payload, {
        withCredentials: true,
      })
      .pipe(tap((customer) => this.setUser(customer)));
  }

  changeEmail(payload: {
    email: string;
    currentPassword: string;
  }): Observable<CustomerAccount> {
    if (this.demo) {
      const user = this.user();
      if (!user) {
        return throwError(() => ({ error: { message: 'Faça login novamente.' } }));
      }
      const next = { ...user, email: payload.email.trim() };
      this.persistDemoSession(next);
      this.setUser(next);
      const accounts = this.readDemoAccounts();
      const idx = accounts.findIndex((a) => a.id === user.id);
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], email: next.email };
        this.writeDemoAccounts(accounts);
      }
      return of(next);
    }

    return this.http
      .post<CustomerAccount>(`${this.base}/api/auth/email`, payload, {
        withCredentials: true,
      })
      .pipe(tap((customer) => this.setUser(customer)));
  }

  /** Updates local session cache after profile PATCH (e.g. CPF/phone). */
  applyUser(customer: CustomerAccount): void {
    if (this.demo) this.persistDemoSession(customer);
    this.setUser(customer);
  }

  private setUser(customer: CustomerAccount | null): void {
    this.user.set(customer);
    this.resolved.set(true);
  }

  private toPublic(account: DemoStoredAccount): CustomerAccount {
    const { password: _pw, ...rest } = account;
    return rest;
  }

  private readDemoSession(): CustomerAccount | null {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      return raw ? (JSON.parse(raw) as CustomerAccount) : null;
    } catch {
      return null;
    }
  }

  private persistDemoSession(customer: CustomerAccount): void {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(customer));
  }

  private readDemoAccounts(): DemoStoredAccount[] {
    try {
      const raw = localStorage.getItem(DEMO_ACCOUNTS_KEY);
      return raw ? (JSON.parse(raw) as DemoStoredAccount[]) : [];
    } catch {
      return [];
    }
  }

  private writeDemoAccounts(accounts: DemoStoredAccount[]): void {
    localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  }
}

/** Turns a Nest error payload (string or class-validator array) into one line. */
export function authErrorMessage(error: unknown, fallback: string): string {
  const message = (error as HttpErrorResponse | undefined)?.error?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
