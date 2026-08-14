import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChromeService, NavActive } from '../../../core/chrome.service';
import { MOBILE_NAV } from '../../../core/nav.config';

@Component({
  selector: 'lc-menu-sheet',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (chrome.mobileMenu()) {
      <div class="sheet" role="dialog" aria-label="Menu">
        <div class="sheet__scrim" (click)="chrome.closeMobile()"></div>
        <div class="sheet__panel">
          <div class="sheet__head">
            <p class="sheet__logo">LEONARDO<br />CHIASSO</p>
            <button type="button" aria-label="Fechar" (click)="chrome.closeMobile()">✕</button>
          </div>
          <nav class="sheet__nav">
            @for (item of nav; track $index) {
              @if (item.type === 'link' && item.link; as link) {
                @if (link.route) {
                  <a
                    [routerLink]="link.route"
                    [queryParams]="link.queryParams ?? null"
                    [fragment]="link.fragment ?? undefined"
                    (click)="go(link.active)"
                    >{{ link.label }}</a
                  >
                } @else {
                  <a href="#" (click)="$event.preventDefault()">{{ link.label }}</a>
                }
              } @else if (item.type === 'group' && item.group; as group) {
                <details [attr.open]="group.open ? '' : null">
                  <summary>{{ group.label }}</summary>
                  @for (sub of group.links; track sub.label) {
                    @if (sub.route) {
                      <a
                        [routerLink]="sub.route"
                        [queryParams]="sub.queryParams ?? null"
                        [fragment]="sub.fragment ?? undefined"
                        (click)="go(sub.active)"
                        >{{ sub.label }}</a
                      >
                    } @else {
                      <a href="#" (click)="$event.preventDefault()">{{ sub.label }}</a>
                    }
                  }
                </details>
              }
            }
          </nav>
        </div>
      </div>
    }
  `,
  styles: `
    .sheet {
      position: fixed;
      inset: 0;
      z-index: 60;
    }
    .sheet__scrim {
      position: absolute;
      inset: 0;
      background: rgb(14 12 14 / 35%);
    }
    .sheet__panel {
      position: absolute;
      inset: 0 auto 0 0;
      width: min(100%, 390px);
      background: var(--lc-white);
      padding: 24px;
      overflow: auto;
    }
    .sheet__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }
    .sheet__logo {
      font-family: var(--lc-font-display);
      font-weight: 300;
      letter-spacing: 0.24em;
      font-size: 14px;
      line-height: 1.2;
    }
    .sheet__nav a,
    .sheet__nav summary {
      display: block;
      font-family: var(--lc-font-display);
      font-size: 13px;
      letter-spacing: 0.18em;
      padding: 14px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--lc-ash) 35%, transparent);
    }
    .sheet__nav details a {
      padding-left: 12px;
      font-family: var(--lc-font-body);
      font-size: 14px;
      letter-spacing: 0.04em;
      color: color-mix(in srgb, var(--lc-void) 75%, var(--lc-ash));
    }
    .sheet__nav summary::-webkit-details-marker {
      display: none;
    }
  `,
})
export class LcMenuSheet {
  readonly chrome = inject(ChromeService);
  readonly nav = MOBILE_NAV;

  go(active?: NavActive): void {
    if (active) this.chrome.setActive(active);
    this.chrome.closeMobile();
  }
}
