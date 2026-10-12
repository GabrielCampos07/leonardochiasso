import { Component, HostBinding, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AdminSessionService } from '../../core/admin-session.service';
import { AdminViewMode, AdminViewModeService } from '../../core/admin-view-mode.service';
import { ROUTES } from '../../core/routes';
import { LcConfirmDialog } from '../../shared/components/feedback/confirm-dialog';
import { LcToastHost } from '../../shared/components/feedback/toast-host';

@Component({
  selector: 'lc-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, LcToastHost, LcConfirmDialog],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly viewMode = inject(AdminViewModeService);

  readonly home = ROUTES.home;
  readonly products = ROUTES.adminProducts;
  readonly collections = ROUTES.adminCollections;
  readonly joias = ROUTES.adminJoias;
  readonly loggedIn = this.session.isLoggedIn;

  private readonly url = signal(this.router.url);

  readonly selectedView = computed<AdminViewMode>(() => {
    const path = this.url().split('?')[0] ?? '';
    if (path.startsWith(ROUTES.admin3d)) return '3d';
    if (path.startsWith(ROUTES.adminProducts)) return 'list';
    return this.viewMode.mode();
  });

  @HostBinding('class.admin-shell--scene')
  get sceneHost(): boolean {
    return (this.url().split('?')[0] ?? '').startsWith(ROUTES.admin3d);
  }

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.url.set(e.urlAfterRedirects);
    });
  }

  setViewMode(mode: AdminViewMode): void {
    this.viewMode.setMode(mode);
    void this.router.navigateByUrl(mode === '3d' ? ROUTES.admin3d : ROUTES.adminProducts);
  }

  onViewKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next: AdminViewMode =
      event.key === 'Home' || event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 'list' : '3d';
    this.setViewMode(next);
    queueMicrotask(() => {
      const btn = document.getElementById(`admin-view-${next}`);
      btn?.focus();
    });
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl(ROUTES.admin);
  }
}
