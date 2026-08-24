import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

const LOCAL_SESSION_KEY = 'lc-admin-session';
const EDIT_MODE_KEY = 'lc-admin-edit-mode';

export interface AdminUser {
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl.replace(/\/$/, '');

  private readonly user = signal<AdminUser | null>(null);
  private readonly localUnlocked = signal(this.readLocalSession());
  private readonly editModeOn = signal(this.readEditMode());

  readonly isLoggedIn = computed(() => this.user() !== null || this.localUnlocked());
  readonly editMode = computed(() => this.editModeOn() && this.isLoggedIn());

  /** Admin available when API is configured or legacy password exists. */
  readonly isEnabled = computed(
    () => Boolean(this.apiBase) || Boolean(environment.adminPassword?.trim()),
  );

  toggleEditMode(): void {
    const next = !this.editModeOn();
    this.editModeOn.set(next);
    try {
      sessionStorage.setItem(EDIT_MODE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  login(email: string, password: string): Observable<boolean> {
    if (this.apiBase) {
      return this.http
        .post<AdminUser>(`${this.apiBase}/api/admin/auth/login`, {
          email: email.trim(),
          password,
        }, {
          withCredentials: true,
        })
        .pipe(
          tap((u) => {
            this.user.set(u);
            this.localUnlocked.set(false);
            this.editModeOn.set(true);
            sessionStorage.setItem(EDIT_MODE_KEY, '1');
          }),
          map(() => true),
          catchError((err: unknown) => throwError(() => err)),
        );
    }

    const expected = environment.adminPassword?.trim() ?? '';
    const ok = Boolean(expected) && password === expected;
    if (ok) {
      sessionStorage.setItem(LOCAL_SESSION_KEY, '1');
      this.localUnlocked.set(true);
      this.editModeOn.set(true);
      sessionStorage.setItem(EDIT_MODE_KEY, '1');
    }
    return of(ok);
  }

  /** Legacy single-password login (no email). */
  loginPassword(password: string): Observable<boolean> {
    return this.login('admin@local', password);
  }

  logout(): void {
    if (this.apiBase && this.user()) {
      this.http
        .post(`${this.apiBase}/api/admin/auth/logout`, {}, { withCredentials: true })
        .subscribe({ complete: () => this.clearSession() });
      return;
    }
    this.clearSession();
  }

  /**
   * Hydrate session from cookie — only call from admin routes/login.
   * Do not probe on public pages (would 401 every visitor).
   */
  refreshMe(): Observable<AdminUser | null> {
    if (!this.apiBase) return of(null);
    return this.http
      .get<AdminUser>(`${this.apiBase}/api/admin/auth/me`, { withCredentials: true })
      .pipe(
        tap((u) => this.user.set(u)),
        catchError(() => {
          this.user.set(null);
          return of(null);
        }),
      );
  }

  /**
   * Restore admin + edit bar after refresh / new tab on the storefront.
   * Only hits `/me` when this browser already opted into edit mode (sessionStorage),
   * so regular visitors never get a 401 probe.
   */
  hydrateStorefrontSession(): Observable<boolean> {
    if (!this.apiBase) return of(this.isLoggedIn());
    if (this.user()) return of(true);
    if (!this.readEditMode() && !this.readLocalSession()) return of(false);
    return this.refreshMe().pipe(map((u) => u !== null));
  }

  /** Session check for guards / admin login — always re-probes /me when user is unknown. */
  ensureSession(): Observable<boolean> {
    if (!this.apiBase) return of(this.isLoggedIn());
    if (this.user()) return of(true);
    // Do not cache failures: a prior 401 on /admin must not block post-login navigation.
    return this.refreshMe().pipe(map((u) => u !== null));
  }

  private clearSession(): void {
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.setItem(EDIT_MODE_KEY, '0');
    this.user.set(null);
    this.localUnlocked.set(false);
    this.editModeOn.set(false);
  }

  private readLocalSession(): boolean {
    if (!environment.adminPassword?.trim()) return false;
    try {
      return sessionStorage.getItem(LOCAL_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readEditMode(): boolean {
    try {
      return sessionStorage.getItem(EDIT_MODE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
