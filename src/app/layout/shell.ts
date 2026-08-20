import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChromeService } from '../core/chrome.service';
import { LcUtility } from '../shared/components/utility/utility';
import { LcHeader } from '../shared/components/header/header';
import { LcFooter } from '../shared/components/footer/footer';
import { LcMegaMenu } from '../shared/components/mega-menu/mega-menu';
import { LcMenuSheet } from '../shared/components/menu-sheet/menu-sheet';
import { LcEditToolbar } from '../shared/components/edit/edit-toolbar';

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
  readonly chrome = inject(ChromeService);

  @HostListener('window:scroll')
  onScroll(): void {
    this.chrome.onWindowScroll(window.scrollY || document.documentElement.scrollTop);
  }
}
