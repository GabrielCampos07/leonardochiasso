import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { adminLoginUrlTree } from './admin-return-url';
import { AdminSessionService } from './admin-session.service';
import { ROUTES } from './routes';

/** Requires admin session; otherwise sends to /admin login with returnUrl. */
export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const session = inject(AdminSessionService);
  const router = inject(Router);

  if (!session.isEnabled()) {
    return router.createUrlTree([ROUTES.home]);
  }
  if (session.isLoggedIn()) return true;

  return session.ensureSession().pipe(
    map((ok) => (ok ? true : adminLoginUrlTree(router, state.url))),
  );
};
