import { Component, inject, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/auth.service';
import { ROUTES } from '../../core/routes';
import { WishlistService } from '../../core/wishlist.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'lc-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth lc-container">
      <p class="lc-label-outline">Conta</p>
      <h1 class="auth__title">Criar conta</h1>
      <form class="auth__form" (ngSubmit)="submit()">
        <label>
          <span>Nome</span>
          <input type="text" name="name" [(ngModel)]="name" required autocomplete="name" />
        </label>
        <label>
          <span>E-mail</span>
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
        </label>
        <label>
          <span>Senha (mín. 8)</span>
          <input
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </label>
        <label class="auth__check">
          <input type="checkbox" name="lgpd" [(ngModel)]="lgpdConsent" />
          <span>
            Li e aceito o tratamento dos meus dados conforme a
            <button type="button" class="auth__policy-link" (click)="openLgpdModal($event)">
              política de privacidade (LGPD)
            </button>.
          </span>
        </label>
        @if (error()) {
          <p class="auth__error">{{ error() }}</p>
        }
        <button class="auth__submit" type="submit" [disabled]="busy() || !lgpdConsent">
          Criar conta
        </button>
      </form>
      @if (devAuth) {
        <button class="auth__dev" type="button" [disabled]="busy()" (click)="devLogin()">
          Entrar em modo demonstração
        </button>
      }
      <p class="auth__alt">
        Já tem conta?
        <a [routerLink]="login">Entrar</a>
      </p>
    </section>

    @if (lgpdOpen()) {
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="lgpd-title">
        <div class="modal__scrim" (click)="closeLgpdModal()"></div>
        <div class="modal__panel">
          <div class="modal__head">
            <h2 id="lgpd-title">Política de privacidade (LGPD)</h2>
            <button type="button" class="modal__close" aria-label="Fechar" (click)="closeLgpdModal()">
              ✕
            </button>
          </div>
          <div class="modal__body">
            <p class="modal__badge">Modelo — revisão jurídica pendente</p>
            <p>
              A Leonardo Chiasso / HempCouture trata dados pessoais para criar e gerir sua conta,
              processar pedidos, atendimento e, somente com consentimento, comunicações de marketing.
            </p>
            <p>
              Dados coletados neste cadastro: nome, e-mail e senha (armazenada de forma criptografada).
              Consentimento LGPD fica registrado com data e hora.
            </p>
            <p>
              Você pode solicitar acesso, correção ou exclusão dos dados pelo e-mail
              atelier&#64;leonardochiasso.com.
            </p>
            <p>
              Para o texto completo, veja também a página
              <a [routerLink]="privacyRoute" (click)="closeLgpdModal()">/legal/privacidade</a>.
            </p>
          </div>
          <div class="modal__foot">
            <button type="button" class="auth__submit" (click)="acceptFromModal()">
              Li e aceito
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .auth {
      padding: 64px 24px 96px;
      max-width: 420px;
    }
    .auth__title {
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: 2rem;
      letter-spacing: 0.04em;
      margin: 8px 0 32px;
      color: var(--lc-void);
    }
    .auth__form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .auth__form label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: var(--lc-font-body);
      font-size: 0.85rem;
      color: var(--lc-ash);
    }
    .auth__form input[type='text'],
    .auth__form input[type='email'],
    .auth__form input[type='password'] {
      border: none;
      border-bottom: 1px solid var(--lc-void);
      border-radius: 0;
      padding: 10px 0;
      font-family: var(--lc-font-body);
      font-size: 1rem;
      color: var(--lc-void);
      background: transparent;
      caret-color: var(--lc-void);
      accent-color: var(--lc-void);
      outline: none;
      box-shadow: none;
      -webkit-appearance: none;
      appearance: none;
    }
    .auth__form input[type='text']:focus,
    .auth__form input[type='email']:focus,
    .auth__form input[type='password']:focus {
      outline: none;
      border-bottom: 2px solid var(--lc-void);
      box-shadow: none;
    }
    .auth__form input[type='text']:-webkit-autofill,
    .auth__form input[type='email']:-webkit-autofill,
    .auth__form input[type='password']:-webkit-autofill {
      -webkit-text-fill-color: var(--lc-void);
      caret-color: var(--lc-void);
      transition: background-color 99999s ease-in-out 0s;
      box-shadow: 0 0 0 1000px var(--lc-white) inset;
    }
    .auth__check {
      flex-direction: row !important;
      align-items: flex-start;
      gap: 12px !important;
      color: var(--lc-void) !important;
      font-size: 0.8rem !important;
    }
    .auth__check input[type='checkbox'] {
      margin-top: 2px;
      accent-color: var(--lc-void);
    }
    .auth__policy-link {
      display: inline;
      padding: 0;
      border: none;
      background: none;
      color: var(--lc-void);
      text-decoration: underline;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .auth__submit {
      margin-top: 8px;
      background: var(--lc-void);
      color: var(--lc-white);
      border: none;
      padding: 14px 24px;
      font-family: var(--lc-font-display);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .auth__submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .auth__dev {
      margin-top: 12px;
      width: 100%;
      background: transparent;
      color: var(--lc-ash);
      border: 1px solid var(--lc-ash);
      padding: 12px 24px;
      font-family: var(--lc-font-body);
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .auth__dev:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .auth__error {
      color: #8b1a1a;
      font-size: 0.85rem;
    }
    .auth__alt {
      margin-top: 24px;
      font-size: 0.9rem;
      color: var(--lc-ash);
    }
    .auth__alt a {
      color: var(--lc-void);
      text-decoration: underline;
    }
    .modal {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal__scrim {
      position: absolute;
      inset: 0;
      background: rgb(14 12 14 / 45%);
    }
    .modal__panel {
      position: relative;
      z-index: 1;
      width: min(520px, 100%);
      max-height: min(80vh, 640px);
      background: var(--lc-white);
      color: var(--lc-void);
      display: flex;
      flex-direction: column;
    }
    .modal__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--lc-ash);
    }
    .modal__head h2 {
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: 1.1rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .modal__close {
      font-size: 1rem;
      line-height: 1;
      color: var(--lc-void);
    }
    .modal__body {
      padding: 24px;
      overflow: auto;
      font-family: var(--lc-font-body);
      font-size: 0.95rem;
      line-height: 1.55;
    }
    .modal__body p {
      margin: 0 0 14px;
    }
    .modal__badge {
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--lc-ash);
    }
    .modal__body a {
      text-decoration: underline;
    }
    .modal__foot {
      padding: 16px 24px 24px;
    }
    .modal__foot .auth__submit {
      width: 100%;
      margin-top: 0;
    }
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);

  readonly login = ROUTES.login;
  readonly privacyRoute = '/legal/privacidade';
  readonly devAuth = environment.demoMode || isDevMode();
  name = '';
  email = '';
  password = '';
  lgpdConsent = false;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly lgpdOpen = signal(false);

  openLgpdModal(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.lgpdOpen.set(true);
  }

  closeLgpdModal(): void {
    this.lgpdOpen.set(false);
  }

  acceptFromModal(): void {
    this.lgpdConsent = true;
    this.closeLgpdModal();
  }

  submit(): void {
    if (!this.lgpdConsent) return;
    this.busy.set(true);
    this.error.set('');
    this.auth
      .register({
        email: this.email,
        password: this.password,
        name: this.name,
        lgpdConsent: true,
      })
      .subscribe({
        next: () => {
          this.wishlist.syncAfterLogin();
          this.busy.set(false);
          void this.router.navigateByUrl(ROUTES.account);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(authErrorMessage(err, 'Não foi possível criar a conta.'));
        },
      });
  }

  devLogin(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.devLogin().subscribe({
      next: () => {
        this.wishlist.syncAfterLogin();
        this.busy.set(false);
        void this.router.navigateByUrl(ROUTES.account);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(authErrorMessage(err, 'Login de desenvolvedor indisponível.'));
      },
    });
  }
}
