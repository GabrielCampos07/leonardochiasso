import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminSessionService } from './admin-session.service';
import { ROUTES } from './routes';

/** Requires admin session; otherwise sends to /admin login. */
export const adminAuthGuard: CanActivateFn = () => {
  const session = inject(AdminSessionService);
  const router = inject(Router);

  if (!session.isEnabled()) {
    return router.createUrlTree([ROUTES.home]);
  }
  if (session.isLoggedIn()) return true;

  return session.ensureSession().pipe(
    map((ok) => (ok ? true : router.createUrlTree([ROUTES.admin]))),
  );
};
