import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { PATH } from './core/routes';
import { adminAuthGuard } from './core/admin-auth.guard';
import { LcShell } from './layout/shell';

function redirectGenderHome(categoria: 'feminino' | 'masculino') {
  return () =>
    inject(Router).createUrlTree(['/'], {
      queryParams: { categoria },
      fragment: 'colecoes',
    });
}

export const routes: Routes = [
  {
    path: PATH.home,
    component: LcShell,
    children: [
      {
        path: PATH.home,
        loadComponent: () =>
          import('./pages/landing/landing').then((m) => m.LandingPage),
      },
      {
        path: PATH.about,
        loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage),
      },
      {
        path: PATH.arte,
        pathMatch: 'full',
        loadComponent: () => import('./pages/arte/arte').then((m) => m.ArtePage),
      },
      {
        path: `${PATH.arte}/:slug`,
        loadComponent: () =>
          import('./pages/arte/arte-detail').then((m) => m.ArteDetailPage),
      },
      {
        path: PATH.joias,
        pathMatch: 'full',
        loadComponent: () => import('./pages/joias/joias').then((m) => m.JoiasPage),
      },
      {
        path: PATH.altaCostura,
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/alta-costura/alta-costura').then((m) => m.AltaCosturaPage),
      },
      {
        path: PATH.desfiles,
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/alta-costura/alta-costura-films.page').then(
            (m) => m.AltaCosturaFilmsPage,
          ),
      },
      {
        path: `${PATH.desfiles}/:slug`,
        loadComponent: () =>
          import('./pages/alta-costura/alta-costura-desfile').then(
            (m) => m.AltaCosturaDesfilePage,
          ),
      },
      {
        path: PATH.lookbook,
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/alta-costura/alta-costura-lookbook-hub').then(
            (m) => m.AltaCosturaLookbookHubPage,
          ),
      },
      {
        path: `${PATH.lookbook}/:slug/look-:lookNumber`,
        loadComponent: () =>
          import('./pages/alta-costura/alta-costura-look-detail').then(
            (m) => m.AltaCosturaLookPage,
          ),
      },
      {
        path: `${PATH.lookbook}/:slug`,
        loadComponent: () =>
          import('./pages/alta-costura/alta-costura-looks').then(
            (m) => m.AltaCosturaLooksPage,
          ),
      },
      // Legacy Alta Costura editorial URLs: keep links working without
      // exposing editorial content beneath the coming-soon landing.
      {
        path: `${PATH.altaCostura}/desfiles`,
        pathMatch: 'full',
        redirectTo: PATH.desfiles,
      },
      {
        path: `${PATH.altaCostura}/os-looks`,
        pathMatch: 'full',
        redirectTo: PATH.lookbook,
      },
      {
        path: `${PATH.altaCostura}/:slug/os-looks`,
        redirectTo: `${PATH.lookbook}/:slug`,
      },
      {
        path: `${PATH.altaCostura}/:slug/looks`,
        redirectTo: `${PATH.lookbook}/:slug`,
      },
      {
        path: `${PATH.altaCostura}/:slug/look-:lookNumber`,
        redirectTo: `${PATH.lookbook}/:slug/look-:lookNumber`,
      },
      {
        path: `${PATH.altaCostura}/:slug`,
        redirectTo: `${PATH.desfiles}/:slug`,
      },
      {
        path: `${PATH.legal}/:page`,
        loadComponent: () => import('./pages/legal/legal').then((m) => m.LegalPage),
      },
      {
        path: `${PATH.collection}/:collectionSlug`,
        loadComponent: () => import('./pages/plp/plp').then((m) => m.PlpPage),
      },
      {
        path: PATH.femininoNovidades,
        pathMatch: 'full',
        redirectTo: redirectGenderHome('feminino'),
      },
      {
        path: `${PATH.feminino}/:tipo`,
        loadComponent: () =>
          import('./pages/gender/gender-rtw').then((m) => m.GenderRtwPage),
        data: { gender: 'feminino' },
      },
      {
        path: `${PATH.masculino}/:tipo`,
        loadComponent: () =>
          import('./pages/gender/gender-rtw').then((m) => m.GenderRtwPage),
        data: { gender: 'masculino' },
      },
      {
        path: PATH.feminino,
        pathMatch: 'full',
        redirectTo: redirectGenderHome('feminino'),
      },
      {
        path: PATH.masculino,
        pathMatch: 'full',
        redirectTo: redirectGenderHome('masculino'),
      },
      {
        path: `${PATH.product}/:slug`,
        loadComponent: () => import('./pages/pdp/pdp').then((m) => m.PdpPage),
      },
      // Commerce routes removed — vitrine editorial only (no cart/checkout/account).
      { path: PATH.account, redirectTo: PATH.home },
      { path: PATH.wishlist, redirectTo: PATH.home },
      { path: PATH.orders, redirectTo: PATH.home },
      { path: PATH.login, redirectTo: PATH.home },
      { path: PATH.register, redirectTo: PATH.home },
      { path: `${PATH.checkout}/sucesso`, redirectTo: PATH.home },
      { path: `${PATH.checkout}/cancelado`, redirectTo: PATH.home },
      { path: PATH.checkout, redirectTo: PATH.home },
    ],
  },
  {
    path: PATH.admin,
    loadComponent: () =>
      import('./pages/admin/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin/admin-login').then((m) => m.AdminLoginPage),
      },
      {
        path: 'produtos',
        canActivate: [adminAuthGuard],
        loadComponent: () =>
          import('./pages/admin/admin-products').then((m) => m.AdminProductsPage),
      },
      {
        path: 'produtos/:slug',
        canActivate: [adminAuthGuard],
        loadComponent: () =>
          import('./pages/admin/admin-product-edit').then((m) => m.AdminProductEditPage),
      },
      {
        path: 'joias',
        canActivate: [adminAuthGuard],
        loadComponent: () =>
          import('./pages/admin/admin-joias').then((m) => m.AdminJoiasPage),
      },
      {
        path: 'joias/:slug',
        canActivate: [adminAuthGuard],
        loadComponent: () =>
          import('./pages/admin/admin-joia-edit').then((m) => m.AdminJoiaEditPage),
      },
      {
        path: 'colecoes',
        canActivate: [adminAuthGuard],
        loadComponent: () =>
          import('./pages/admin/admin-collections').then((m) => m.AdminCollectionsPage),
      },
      {
        path: 'colecoes/:slug',
        canActivate: [adminAuthGuard],
        loadComponent: () =>
          import('./pages/admin/admin-collection-edit').then((m) => m.AdminCollectionEditPage),
      },
    ],
  },
  { path: '**', redirectTo: PATH.home },
];
