import { AfterViewInit, Component, HostBinding, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Admin3dBootService, hideStaticAtelierBoot } from '../../core/admin-3d-boot.service';
import { AdminSessionService } from '../../core/admin-session.service';
import { AdminViewMode, AdminViewModeService } from '../../core/admin-view-mode.service';
import { adminAtelierSectionLabel } from '../../core/admin-archive';
import { ROUTES } from '../../core/routes';
import { readStagingBannerStorage, resolveStagingBannerText } from '../../core/staging-banner';
import { LcConfirmDialog } from '../../shared/components/feedback/confirm-dialog';
import { LcToastHost } from '../../shared/components/feedback/toast-host';

@Component({
  selector: 'lc-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, LcToastHost, LcConfirmDialog],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell implements AfterViewInit {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly viewMode = inject(AdminViewModeService);
  private readonly sceneBoot = inject(Admin3dBootService);

  readonly home = ROUTES.home;
  readonly products = ROUTES.adminProducts;
  readonly collections = ROUTES.adminCollections;
  readonly joias = ROUTES.adminJoias;
  readonly loggedIn = this.session.isLoggedIn;
  readonly stagingBanner = resolveStagingBannerText({
    env: environment,
    hostname: typeof window === 'undefined' ? '' : window.location.hostname,
    production: environment.production,
    queryPreview:
      typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('stagingBanner'),
    storagePreview: readStagingBannerStorage(),
  });

  private readonly url = signal(this.router.url);

  readonly sectionLabel = computed(() => adminAtelierSectionLabel(this.url()));
  readonly navOpen = signal(false);

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

  readonly showSceneBoot = computed(() => this.sceneHost && !this.sceneBoot.ready());

  @HostBinding('class.admin-shell--banner')
  get bannerHost(): boolean {
    return Boolean(this.stagingBanner);
  }

  constructor() {
    if (this.sceneHost) this.sceneBoot.begin();
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        const path = e.url.split('?')[0] ?? '';
        const alreadyOnScene = this.sceneHost;
        this.url.set(e.url);
        if (path.startsWith(ROUTES.admin3d) && !alreadyOnScene) this.sceneBoot.begin();
      }
      if (e instanceof NavigationEnd) {
        this.url.set(e.urlAfterRedirects);
        if (!(e.urlAfterRedirects.split('?')[0] ?? '').startsWith(ROUTES.admin3d)) {
          this.sceneBoot.reset();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Chrome is in the DOM. Drop the full-viewport HTML overlay so the
    // header stays visible while "Montando o ateliê…" paints in <main>.
    hideStaticAtelierBoot();
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

  toggleNav(event?: Event): void {
    event?.stopPropagation();
    this.navOpen.update((open) => !open);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.navOpen()) this.navOpen.set(false);
  }

  logout(): void {
    this.navOpen.set(false);
    this.session.logout();
    void this.router.navigateByUrl(ROUTES.admin);
  }
}
