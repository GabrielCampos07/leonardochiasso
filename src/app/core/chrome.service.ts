import { Injectable, signal } from '@angular/core';

export type MegaKey = 'feminino' | 'masculino' | 'joia' | 'arte' | 'casa' | null;
export type NavActive = 'default' | 'feminino' | 'masculino' | 'about' | 'arte' | 'joias';

@Injectable({ providedIn: 'root' })
export class ChromeService {
  readonly mega = signal<MegaKey>(null);
  readonly mobileMenu = signal(false);
  readonly navActive = signal<NavActive>('default');
  /** Chanel-style: hide category nav while scrolling down. */
  readonly navCollapsed = signal(false);

  private lastScrollY = 0;
  /** Ignore scroll while collapse settles (prevents sticky flicker). */
  private lockUntil = 0;
  private readonly topReveal = 80;
  private readonly deltaDown = 16;
  private readonly deltaUp = 16;
  /** Short lock — collapse is instant, no spacer scroll compensation. */
  private readonly lockMs = 120;

  openMega(key: MegaKey): void {
    this.mega.set(key);
    this.mobileMenu.set(false);
  }

  closeMega(): void {
    this.mega.set(null);
  }

  toggleMobile(): void {
    this.mobileMenu.update((v) => !v);
    if (this.mobileMenu()) this.mega.set(null);
  }

  closeMobile(): void {
    this.mobileMenu.set(false);
  }

  setActive(active: NavActive): void {
    this.navActive.set(active);
  }

  /** Call from shell on window scroll (Chanel: down hides nav, up / top shows). */
  onWindowScroll(scrollY: number): void {
    const now = performance.now();
    const y = Math.max(0, scrollY);

    if (now < this.lockUntil) {
      this.lastScrollY = y;
      return;
    }

    const delta = y - this.lastScrollY;
    this.lastScrollY = y;

    if (y < this.topReveal) {
      this.expandNav();
      return;
    }

    if (delta > this.deltaDown) {
      this.collapseNav();
    } else if (delta < -this.deltaUp) {
      this.expandNav();
    }
  }

  private collapseNav(): void {
    if (this.navCollapsed()) return;
    this.closeMega();
    this.navCollapsed.set(true);
    this.lockUntil = performance.now() + this.lockMs;
  }

  private expandNav(): void {
    if (!this.navCollapsed()) return;
    this.navCollapsed.set(false);
    this.lockUntil = performance.now() + this.lockMs;
  }
}
