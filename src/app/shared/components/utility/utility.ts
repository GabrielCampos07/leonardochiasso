import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { CartService } from '../../../core/cart.service';
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
          <div class="utility__account" #accountWrap>
            <button
              class="utility__icon"
              type="button"
              [attr.aria-label]="auth.user() ? 'Minha conta' : 'Entrar'"
              [attr.aria-expanded]="panelOpen()"
              aria-haspopup="dialog"
              (click)="toggleAccount($event)"
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
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 19c1.5-3.2 3.8-4.8 7-4.8s5.5 1.6 7 4.8" />
              </svg>
              @if (auth.user()) {
                <span class="utility__dot" aria-hidden="true"></span>
              }
            </button>

            @if (panelOpen() && auth.user()) {
              <div class="utility__dropdown" role="menu" aria-label="Conta">
                <a
                  role="menuitem"
                  [routerLink]="accountRoute"
                  (click)="closePanel()"
                  >Perfil</a
                >
                <a
                  role="menuitem"
                  [routerLink]="ordersRoute"
                  (click)="closePanel()"
                  >Pedidos</a
                >
                <button role="menuitem" type="button" (click)="signOut()">Sair</button>
              </div>
            }
          </div>

          <button class="utility__icon utility__desktop-only" type="button" aria-label="Localização">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              aria-hidden="true"
            >
              <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z" />
              <circle cx="12" cy="10" r="2" />
            </svg>
          </button>
          <button class="utility__icon" type="button" aria-label="Buscar">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6" />
              <path d="M16.5 16.5 20 20" />
            </svg>
          </button>
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
          <button
            class="utility__icon utility__bag"
            type="button"
            aria-label="Sacola"
            (click)="cart.toggle()"
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
              <path d="M6 8h12l-1 12H7L6 8z" />
              <path d="M9 8V7a3 3 0 0 1 6 0v1" />
            </svg>
            @if (cart.count() > 0) {
              <span class="utility__badge">{{ cart.count() }}</span>
            }
          </button>
        </div>
      </div>
    </div>

    @if (sessionModalOpen()) {
      <div
        class="session"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-title"
      >
        <button
          class="session__scrim"
          type="button"
          aria-label="Fechar"
          (click)="closePanel()"
        ></button>
        <div class="session__panel">
          <button class="session__close" type="button" aria-label="Fechar" (click)="closePanel()">
            ✕
          </button>
          <h2 id="session-title">Escolha uma opção para iniciar uma sessão</h2>
          <div class="session__actions">
            <a class="session__btn session__btn--solid" [routerLink]="loginRoute" (click)="closePanel()">
              Entre ou Cadastre-se por e-mail
            </a>
            <a class="session__btn session__btn--ghost" [routerLink]="registerRoute" (click)="closePanel()">
              Criar conta
            </a>
          </div>
        </div>
      </div>
    }
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
        /* Keep hamburger + icons breathing room on narrow phones */
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
    .utility__account {
      position: relative;
    }
    .utility__icon {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--lc-void);
      position: relative;
      flex-shrink: 0;
    }
    .utility__icon svg {
      width: 24px;
      height: 24px;
      display: block;
      flex-shrink: 0;
    }
    .utility__dot {
      position: absolute;
      top: 0;
      right: 1px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--lc-void);
    }
    .utility__wish,
    .utility__bag {
      position: relative;
    }
    .utility__badge {
      position: absolute;
      top: -4px;
      right: -6px;
      min-width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--lc-void);
      color: var(--lc-white);
      font-size: 9px;
      line-height: 14px;
      text-align: center;
      font-family: var(--lc-font-body);
    }
    .utility__desktop-only {
      display: none;
    }
    @media (min-width: 900px) {
      .utility__desktop-only {
        display: inline-flex;
      }
    }
    .utility__dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 60;
      min-width: 180px;
      padding: 8px 0;
      background: var(--lc-white);
      border: 1px solid var(--lc-void);
      display: flex;
      flex-direction: column;
    }
    .utility__dropdown a,
    .utility__dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 12px 18px;
      font-family: var(--lc-font-body);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      color: var(--lc-void);
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .utility__dropdown a:hover,
    .utility__dropdown button:hover {
      background: color-mix(in srgb, var(--lc-ash) 18%, transparent);
    }

    .session {
      position: fixed;
      inset: 0;
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .session__scrim {
      position: absolute;
      inset: 0;
      background: rgb(14 12 14 / 55%);
      border: none;
      cursor: pointer;
    }
    .session__panel {
      position: relative;
      z-index: 1;
      width: min(420px, 100%);
      padding: 48px 40px 40px;
      background: var(--lc-white);
      color: var(--lc-void);
      text-align: center;
    }
    .session__close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 28px;
      height: 28px;
      font-size: 0.85rem;
      color: var(--lc-void);
      line-height: 1;
    }
    .session__panel h2 {
      margin: 0 0 28px;
      font-family: var(--lc-font-body);
      font-weight: 400;
      font-size: 1.05rem;
      line-height: 1.45;
      letter-spacing: 0.01em;
    }
    .session__actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .session__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 12px 20px;
      font-family: var(--lc-font-body);
      font-size: 0.85rem;
      letter-spacing: 0.02em;
      text-align: center;
    }
    .session__btn--solid {
      background: var(--lc-void);
      color: var(--lc-white);
    }
    .session__btn--ghost {
      background: transparent;
      color: var(--lc-void);
      border: 1px solid var(--lc-void);
    }
    .session__btn:hover {
      opacity: 0.82;
    }
  `,
})
export class LcUtility {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly chrome = inject(ChromeService);
  readonly wishlist = inject(WishlistService);

  @ViewChild('accountWrap') private accountWrap?: ElementRef<HTMLElement>;

  readonly wishlistRoute = ROUTES.wishlist;
  readonly accountRoute = ROUTES.account;
  readonly ordersRoute = ROUTES.orders;
  readonly loginRoute = ROUTES.login;
  readonly registerRoute = ROUTES.register;

  readonly panelOpen = signal(false);
  readonly sessionModalOpen = computed(
    () => this.panelOpen() && !this.auth.user(),
  );

  toggleAccount(event: Event): void {
    event.stopPropagation();
    this.panelOpen.update((open) => !open);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  signOut(): void {
    this.closePanel();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl(ROUTES.home),
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.panelOpen() || this.sessionModalOpen()) return;
    const wrap = this.accountWrap?.nativeElement;
    const target = event.target as Node | null;
    if (wrap && target && !wrap.contains(target)) {
      this.closePanel();
    }
  }
}
