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

  password = '';
  readonly error = signal('');

  constructor() {
    if (!this.session.isEnabled()) {
      void this.router.navigateByUrl(ROUTES.home);
      return;
    }
    if (this.session.isLoggedIn()) {
      void this.router.navigateByUrl(ROUTES.adminProducts);
    }
  }

  submit(): void {
    this.error.set('');
    if (!this.session.login(this.password)) {
      this.error.set('Senha incorreta. Tente de novo.');
      return;
    }
    void this.router.navigateByUrl(ROUTES.adminProducts);
  }
}
