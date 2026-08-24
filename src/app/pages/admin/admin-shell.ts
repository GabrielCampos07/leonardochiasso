import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AdminSessionService } from '../../core/admin-session.service';
import { ROUTES } from '../../core/routes';

@Component({
  selector: 'lc-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);

  readonly home = ROUTES.home;
  readonly products = ROUTES.adminProducts;
  readonly collections = ROUTES.adminCollections;
  readonly joias = ROUTES.adminJoias;
  readonly loggedIn = this.session.isLoggedIn;

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl(ROUTES.admin);
  }
}
