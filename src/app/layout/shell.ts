import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ChromeService } from '../core/chrome.service';
import { genderFromUrl } from '../core/routes';
import { LcUtility } from '../shared/components/utility/utility';
import { LcHeader } from '../shared/components/header/header';
import { LcFooter } from '../shared/components/footer/footer';
import { LcMegaMenu } from '../shared/components/mega-menu/mega-menu';
import { LcMenuSheet } from '../shared/components/menu-sheet/menu-sheet';
import { LcEditToolbar } from '../shared/components/edit/edit-toolbar';
import { LcCartDrawer } from '../shared/components/cart-drawer/cart-drawer';
import { LcToastHost } from '../shared/components/feedback/toast-host';
import { LcConfirmDialog } from '../shared/components/feedback/confirm-dialog';

@Component({
  selector: 'lc-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    LcUtility,
    LcHeader,
    LcFooter,
    LcMegaMenu,
    LcMenuSheet,
    LcEditToolbar,
    LcCartDrawer,
    LcToastHost,
    LcConfirmDialog,
  ],
  template: `
    <div class="shell" [class.shell--nav-collapsed]="chrome.navCollapsed()">
      <div class="shell__chrome">
        <lc-utility />
        <lc-header />
        <lc-mega-menu />
      </div>
      <main class="shell__main">
        <router-outlet />
      </main>
      <lc-footer />
      <lc-menu-sheet />
      <lc-edit-toolbar />
      <lc-cart-drawer />
      <lc-toast-host />
      <lc-confirm-dialog />
    </div>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      background: var(--lc-white);
    }
    .shell__chrome {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--lc-white);
    }
    .shell__main {
      min-height: 50vh;
    }
  `,
})
export class LcShell {
  private readonly router = inject(Router);
  readonly chrome = inject(ChromeService);

  constructor() {
    this.router.events
      .pipe(
        takeUntilDestroyed(),
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.router.url),
        startWith(this.router.url),
      )
      .subscribe((url) => {
        const gender = genderFromUrl(url);
        if (gender) this.chrome.setActive(gender);
      });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.chrome.onWindowScroll(window.scrollY || document.documentElement.scrollTop);
  }
}
