import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const SESSION_KEY = 'lc-admin-session';

@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private readonly unlocked = signal(this.readSession());

  readonly isLoggedIn = computed(() => this.unlocked());

  /** Admin panel available only when a password is configured. */
  readonly isEnabled = computed(() => Boolean(environment.adminPassword?.trim()));

  login(password: string): boolean {
    const expected = environment.adminPassword?.trim() ?? '';
    if (!expected || password !== expected) return false;
    sessionStorage.setItem(SESSION_KEY, '1');
    this.unlocked.set(true);
    return true;
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.unlocked.set(false);
  }

  private readSession(): boolean {
    if (!environment.adminPassword?.trim()) return false;
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }
}
