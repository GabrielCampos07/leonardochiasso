import { Component, inject } from '@angular/core';
import { ChromeService } from '../../../core/chrome.service';
import { AdminSessionService } from '../../../core/admin-session.service';
import { ROUTES } from '../../../core/routes';

@Component({
  selector: 'lc-utility',
  standalone: true,
  imports: [],
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
      height: 12px;
      background: var(--lc-ash);
      flex-shrink: 0;
    }
    .utility__phone {
      display: none;
    }
    @media (min-width: 700px) {
      .utility__sep,
      .utility__phone {
        display: block;
      }
    }
    .utility__actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    @media (min-width: 480px) {
      .utility__actions {
        gap: 18px;
      }
    }
    .utility__icon {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--lc-void);
      flex-shrink: 0;
    }
    .utility__desktop-only {
      display: none;
    }
    @media (min-width: 900px) {
      .utility__desktop-only {
        display: inline-flex;
      }
    }
    .utility__admin {
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--lc-void);
      padding: 4px 0;
      border: none;
      background: transparent;
      cursor: pointer;
    }
    .utility__admin--on {
      font-weight: 500;
    }
    .utility__admin:hover {
      opacity: 0.65;
    }
  `,
})
export class LcUtility {
  readonly chrome = inject(ChromeService);
  readonly admin = inject(AdminSessionService);
  readonly adminRoute = ROUTES.admin;
}
