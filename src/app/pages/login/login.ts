import { Component, inject, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, authErrorMessage } from '../../core/auth.service';
import { ROUTES } from '../../core/routes';
import { WishlistService } from '../../core/wishlist.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'lc-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth lc-container">
      <p class="lc-label-outline">Conta</p>
      <h1 class="auth__title">Entrar</h1>
      <form class="auth__form" (ngSubmit)="submit()">
        <label>
          <span>E-mail</span>
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
        </label>
        <label>
          <span>Senha</span>
          <input
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
          />
        </label>
        @if (error()) {
          <p class="auth__error">{{ error() }}</p>
        }
        <button class="auth__submit" type="submit" [disabled]="busy()">Entrar</button>
      </form>
      @if (devAuth) {
        <button class="auth__dev" type="button" [disabled]="busy()" (click)="devLogin()">
          Entrar em modo demonstração
        </button>
      }
      <p class="auth__alt">
        Não tem conta?
        <a [routerLink]="register">Criar conta</a>
      </p>
    </section>
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
    .auth__form input {
      border: none;
      border-bottom: 1px solid var(--lc-void);
      border-radius: 0;
      padding: 10px 0;
      font-family: var(--lc-font-body);
      font-size: 1rem;
      color: var(--lc-void);
      background: transparent;
      caret-color: var(--lc-void);
      outline: none;
      box-shadow: none;
      -webkit-appearance: none;
      appearance: none;
    }
    .auth__form input:focus {
      outline: none;
      border-bottom: 2px solid var(--lc-void);
      box-shadow: none;
    }
    .auth__form input:-webkit-autofill {
      -webkit-text-fill-color: var(--lc-void);
      caret-color: var(--lc-void);
      transition: background-color 99999s ease-in-out 0s;
      box-shadow: 0 0 0 1000px var(--lc-white) inset;
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
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly register = ROUTES.register;
  readonly devAuth = environment.demoMode || isDevMode();
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  private afterLoginPath(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return ROUTES.account;
  }

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.wishlist.syncAfterLogin();
        this.busy.set(false);
        void this.router.navigateByUrl(this.afterLoginPath());
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(authErrorMessage(err, 'Não foi possível entrar.'));
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
        void this.router.navigateByUrl(this.afterLoginPath());
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(authErrorMessage(err, 'Login de desenvolvedor indisponível.'));
      },
    });
  }
}
