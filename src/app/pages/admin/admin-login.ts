import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminSessionService } from '../../core/admin-session.service';
import { ROUTES } from '../../core/routes';

@Component({
  selector: 'lc-admin-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLoginPage {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);

  email = 'admin@leonardochiasso.com';
  password = '';
  readonly error = signal('');

  constructor() {
    if (!this.session.isEnabled()) {
      void this.router.navigateByUrl(ROUTES.home);
      return;
    }
    if (this.session.isLoggedIn()) {
      void this.router.navigateByUrl(ROUTES.adminProducts);
      return;
    }
    // Cookie may still be valid — check once on /admin only (not on public pages).
    this.session.ensureSession().subscribe((ok) => {
      if (ok) void this.router.navigateByUrl(ROUTES.adminProducts);
    });
  }

  submit(): void {
    this.error.set('');
    this.session.login(this.email, this.password).subscribe({
      next: (ok) => {
        if (!ok) {
          this.error.set('Credenciais incorretas.');
          return;
        }
        void this.router.navigateByUrl(ROUTES.adminProducts);
      },
      error: (err: unknown) => {
        const http = err as { status?: number; error?: { message?: string | string[] } };
        if (http?.status === 401) {
          this.error.set('Credenciais incorretas.');
          return;
        }
        if (http?.status === 0) {
          this.error.set('API indisponível. Confira se o Nest está rodando em localhost:3000.');
          return;
        }
        const msg = http?.error?.message;
        this.error.set(
          Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : 'Falha no login.',
        );
      },
    });
  }
}
