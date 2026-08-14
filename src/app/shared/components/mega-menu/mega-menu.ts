import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChromeService, MegaKey } from '../../../core/chrome.service';
import { MEGA_MENUS, MEGA_STUB_TITLES } from '../../../core/nav.config';

@Component({
  selector: 'lc-mega-menu',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (chrome.mega(); as mega) {
      <div class="mega" (mouseenter)="chrome.openMega(mega)" (mouseleave)="chrome.closeMega()">
        <div class="mega__inner">
          @if (menus[mega]; as cfg) {
            <div class="mega__cols">
              @for (col of cfg.columns; track $index) {
                <div [class.mega__col--featured]="col.featured">
                  @if (col.title) {
                    <h3>{{ col.title }}</h3>
                  }
                  @for (link of col.links; track link.label; let i = $index) {
                    @if (link.route) {
                      <a
                        [routerLink]="link.route"
                        [queryParams]="link.queryParams ?? null"
                        [class.mega__link--featured]="col.featured && i === 0"
                        (click)="close()"
                        >{{ link.label }}</a
                      >
                    } @else {
                      <a href="#" (click)="$event.preventDefault()">{{ link.label }}</a>
                    }
                  }
                </div>
              }
            </div>
          } @else {
            <div class="mega__stub">
              <p class="lc-label-outline">{{ stubTitle(mega) }}</p>
              <p class="lc-body-s">Em breve — coleção em preparação.</p>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .mega {
      position: absolute;
      left: 0;
      right: 0;
      top: 100%;
      z-index: 35;
      background: var(--lc-white);
      border-bottom: 1px solid color-mix(in srgb, var(--lc-ash) 40%, transparent);
      box-shadow: 0 18px 40px rgb(14 12 14 / 6%);
      display: none;
    }
    @media (min-width: 900px) {
      .mega {
        display: block;
      }
    }
    .mega__inner {
      max-width: var(--lc-max);
      margin: 0 auto;
      padding: var(--lc-space-40);
    }
    .mega__cols {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--lc-space-40);
    }
    .mega__cols h3 {
      font-family: var(--lc-font-display);
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 16px;
      font-weight: 400;
    }
    .mega__cols a {
      display: block;
      font-family: var(--lc-font-body);
      font-size: 14px;
      margin-bottom: 10px;
      color: var(--lc-void);
    }
    .mega__cols a:hover {
      color: var(--lc-ash);
    }
    .mega__link--featured {
      font-family: var(--lc-font-display);
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 400;
      margin-bottom: 16px;
    }
    .mega__stub {
      padding: var(--lc-space-24) 0;
      text-align: center;
    }
    .mega__stub .lc-body-s {
      margin-top: 12px;
      color: var(--lc-ash);
    }
  `,
})
export class LcMegaMenu {
  readonly chrome = inject(ChromeService);
  readonly menus = MEGA_MENUS;

  stubTitle(mega: Exclude<MegaKey, null>): string {
    return MEGA_STUB_TITLES[mega] ?? mega.toUpperCase();
  }

  close(): void {
    this.chrome.closeMega();
  }
}
