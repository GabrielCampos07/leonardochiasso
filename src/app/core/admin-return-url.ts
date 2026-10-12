import { Router, UrlTree } from '@angular/router';
import { ROUTES } from './routes';

/** Only same-origin admin paths — never the login screen itself. */
export function safeAdminReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  const path = (trimmed.split('?')[0] ?? '').split('#')[0] ?? '';
  if (path === ROUTES.admin || !path.startsWith(`${ROUTES.admin}/`)) return null;
  return trimmed;
}

export function adminLoginDestination(raw: string | null | undefined): string {
  return safeAdminReturnUrl(raw) ?? ROUTES.adminProducts;
}

export function adminLoginUrlTree(router: Pick<Router, 'createUrlTree'>, returnUrl: string): UrlTree {
  return router.createUrlTree([ROUTES.admin], { queryParams: { returnUrl } });
}

export function adminProductsListRedirect(mode: 'list' | '3d'): string | null {
  return mode === '3d' ? ROUTES.admin3d : null;
}

export function leaveAdmin3dToList(): { mode: 'list'; url: string } {
  return { mode: 'list', url: ROUTES.adminProducts };
}
