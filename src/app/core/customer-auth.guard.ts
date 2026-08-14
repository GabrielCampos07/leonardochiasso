import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { ROUTES } from './routes';

/** Requires a logged-in customer; otherwise redirects to login with returnUrl. */
export const customerAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) return true;

  if (auth.resolved()) {
    return router.createUrlTree([ROUTES.login], {
      queryParams: { returnUrl: ROUTES.checkout },
    });
  }

  return auth.me().pipe(
    map((user) =>
      user
        ? true
        : router.createUrlTree([ROUTES.login], {
            queryParams: { returnUrl: ROUTES.checkout },
          }),
    ),
  );
};
