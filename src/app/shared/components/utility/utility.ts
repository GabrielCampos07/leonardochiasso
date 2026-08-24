import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChromeService } from '../../../core/chrome.service';
import { ROUTES } from '../../../core/routes';
import { WishlistService } from '../../../core/wishlist.service';

@Component({
  selector: 'lc-utility',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="utility" [class.utility--collapsed]="chrome.navCollapsed()">
      <div class="utility__inner">
        <div class="utility__left">
          <button
            class="utility__menu"
            type="button"
            aria-label="Menu"
            (click)="chrome.toggleMobile()"
          >
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="0" y="1" width="14" height="1.5" fill="currentColor" />
              <rect x="0" y="6.25" width="14" height="1.5" fill="currentColor" />
              <rect x="0" y="11.5" width="14" height="1.5" fill="currentColor" />
            </svg>
          </button>
          <a class="utility__contact" href="mailto:Contact&#64;leonardochiasso.com">
            <span class="utility__contact-label">ATENDIMENTO PERSONALIZADO</span>
            <span class="utility__sep" aria-hidden="true"></span>
            <span class="utility__phone">(62) 99999-0000</span>
          </a>
        </div>

        <div class="utility__actions">
          <a
            class="utility__icon utility__wish"
            [routerLink]="wishlistRoute"
            aria-label="Favoritos"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              aria-hidden="true"
            >
              <path
                d="M12 19s-6.5-4.2-8.5-8A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 20.5 11c-2 3.8-8.5 8-8.5 8z"
              />
            </svg>
            @if (wishlist.count() > 0) {
              <span class="utility__badge">{{ wishlist.count() }}</span>
            }
          </a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .utility {
      height: 40px;
      border-bottom: 1px solid color-mix(in srgb, var(--lc-ash) 45%, transparent);
      background: var(--lc-white);
    }
    .utility--collapsed {
      height: 0;
      border-bottom-color: transparent;
      overflow: hidden;
      pointer-events: none;
    }
    .utility--collapsed .utility__contact {
      opacity: 0;
      pointer-events: none;
      max-width: 0;
      overflow: hidden;
    }
    .utility__inner {
      max-width: var(--lc-max);
      margin: 0 auto;
      height: 100%;
      padding: 0 var(--lc-space-24);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      color: var(--lc-void);
    }
    @media (min-width: 768px) {
      .utility__inner {
        padding: 0 var(--lc-space-40);
      }
    }
    .utility__left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }
    .utility__menu {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 40px;
      margin-left: -12px;
      color: var(--lc-void);
      flex-shrink: 0;
    }
    .utility__menu svg {
      width: 18px;
      height: 18px;
    }
    @media (min-width: 900px) {
      .utility__menu {
        display: none;
      }
    }
    .utility__contact {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--lc-void);
      white-space: nowrap;
    }
    .utility__contact:hover {
      opacity: 0.7;
    }
    .utility__contact-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (max-width: 419px) {
      .utility__contact-label {
        max-width: 11ch;
      }
    }
    .utility__sep {
      display: none;
      width: 1px;
      height: 10px;
      background: color-mix(in srgb, var(--lc-ash) 70%, transparent);
      flex-shrink: 0;
    }
    @media (min-width: 520px) {
      .utility__sep {
        display: block;
      }
    }
    .utility__phone {
      flex-shrink: 0;
    }
    @media (max-width: 359px) {
      .utility__phone {
        display: none;
      }
    }
    .utility__actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .utility__icon {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      color: var(--lc-void);
    }
    .utility__icon:hover {
      opacity: 0.7;
    }
    .utility__icon svg {
      width: 24px;
      height: 24px;
    }
    .utility__badge {
      position: absolute;
      top: -2px;
      right: -4px;
      min-width: 14px;
      height: 14px;
      padding: 0 3px;
      border-radius: 999px;
      background: var(--lc-void);
      color: var(--lc-white);
      font-family: var(--lc-font-display);
      font-size: 9px;
      line-height: 14px;
      text-align: center;
    }
  `,
})
export class LcUtility {
  readonly chrome = inject(ChromeService);
  readonly wishlist = inject(WishlistService);
  readonly wishlistRoute = ROUTES.wishlist;
}
