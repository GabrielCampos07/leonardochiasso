import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { headerBrandMark } from '../../../core/brand-lines';
import { ChromeService } from '../../../core/chrome.service';
import { HEADER_NAV, HeaderNavItem } from '../../../core/nav.config';
import { ROUTES, genderFromUrl, lookbookPath } from '../../../core/routes';

@Component({
  selector: 'lc-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header
      class="header"
      [class.header--collapsed]="chrome.navCollapsed()"
      (mouseleave)="chrome.closeMega()"
    >
      <div class="header__brand">
        <a
          [routerLink]="home"
          class="header__logo"
          (click)="chrome.setActive('default')"
        >
          <img
            src="assets/brand/logo-black.png"
            alt="Leonardo Chiasso"
            width="420"
            height="29"
          />
        </a>
        @if (brandMark(); as mark) {
          <span class="header__line" aria-hidden="true">{{ mark }}</span>
        }
      </div>

      <nav class="header__nav" aria-label="Principal">
        @for (item of nav(); track item.key) {
          @if (item.route) {
            <a
              class="header__link"
              [routerLink]="item.route"
              [queryParams]="item.queryParams ?? null"
              [fragment]="item.fragment ?? undefined"
              [class.is-active]="isNavActive(item)"
              (click)="onNavClick(item)"
              (mouseenter)="onNavEnter(item)"
            >
              {{ item.label }}
            </a>
          } @else {
            <button
              class="header__link"
              type="button"
              [class.is-active]="chrome.mega() === item.mega || chrome.navActive() === item.active"
              (mouseenter)="onNavEnter(item)"
              (click)="onNavClick(item)"
            >
              {{ item.label }}
            </button>
          }
        }
      </nav>
    </header>
  `,
  styles: `
    .header {
      position: relative;
      z-index: 40;
      background: var(--lc-white);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 20px 24px 16px;
      transition: none;
    }
    @media (min-width: 900px) {
      .header {
        padding: 28px 40px 24px;
      }
    }
    .header--collapsed {
      gap: 0;
      padding: 12px 24px 14px;
    }
    @media (min-width: 900px) {
      .header--collapsed {
        padding: 14px 40px 16px;
      }
    }
    .header__brand {
      position: relative;
      display: block;
      max-width: min(420px, 88vw);
      margin-inline: auto;
    }
    .header__logo {
      display: block;
      width: 100%;
    }
    .header__logo img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 40px;
      object-fit: contain;
      transition: none;
    }
    .header--collapsed .header__logo img {
      max-height: 28px;
    }
    .header__line {
      position: absolute;
      right: -8px;
      bottom: -2px;
      transform: translateX(100%);
      padding-left: 10px;
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--lc-void) 62%, transparent);
      line-height: 1;
      pointer-events: none;
      white-space: nowrap;
    }
    @media (min-width: 900px) {
      .header__line {
        font-size: 11px;
        letter-spacing: 0.2em;
        padding-left: 12px;
        bottom: 0;
      }
    }
    .header--collapsed .header__line {
      font-size: 9px;
      padding-left: 8px;
    }
    .header__nav {
      display: none;
      justify-content: center;
      flex-wrap: wrap;
      gap: 40px;
      width: 100%;
      max-height: 80px;
      opacity: 1;
      overflow: hidden;
      visibility: visible;
    }
    @media (min-width: 900px) {
      .header__nav {
        display: flex;
      }
    }
    .header--collapsed .header__nav {
      max-height: 0;
      opacity: 0;
      margin: 0;
      pointer-events: none;
      visibility: hidden;
    }
    .header__link {
      position: relative;
      font-family: var(--lc-font-display);
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.12em;
      padding-bottom: 6px;
      color: var(--lc-void);
      background: none;
      border: none;
      cursor: pointer;
    }
    .header__link::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: var(--lc-void);
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
    }
    .header__link.is-active::after,
    .header__link:hover::after {
      transform: scaleX(1);
    }
  `,
})
export class LcHeader {
  readonly chrome = inject(ChromeService);
  private readonly router = inject(Router);
  readonly home = ROUTES.home;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly brandMark = computed(() =>
    headerBrandMark({
      url: this.url(),
      navActive: this.chrome.navActive(),
      mega: this.chrome.mega(),
    }),
  );

  /** On a collection lookbook, Feminino / Masculino stay here and filter the grid. */
  readonly nav = computed((): HeaderNavItem[] => {
    const path = (this.url().split('?')[0] ?? '').split('#')[0] ?? '';
    const match = /^\/lookbook\/([^/]+)$/.exec(path);
    const slug = match?.[1];
    if (!slug) return HEADER_NAV;
    return HEADER_NAV.map((item) => {
      if (item.key !== 'feminino' && item.key !== 'masculino') return item;
      return {
        ...item,
        route: lookbookPath(slug),
        fragment: undefined,
      };
    });
  });

  onNavEnter(item: HeaderNavItem): void {
    if (this.chrome.navCollapsed()) return;
    if (item.mega) this.chrome.openMega(item.mega);
    else this.chrome.closeMega();
  }

  onNavClick(item: HeaderNavItem): void {
    if (item.active) this.chrome.setActive(item.active);
    if (item.key === 'about' || item.queryParams?.['categoria']) this.chrome.closeMega();
    if (!item.route) this.chrome.openMega(item.mega);
  }

  /** URL wins for Feminino/Masculino — avoids stale chrome (e.g. PDP forcing feminino). */
  isNavActive(item: HeaderNavItem): boolean {
    if (item.key === 'feminino' || item.key === 'masculino') {
      const fromUrl = genderFromUrl(this.url());
      if (fromUrl) return item.active === fromUrl;
    }
    return this.chrome.navActive() === item.active;
  }
}
