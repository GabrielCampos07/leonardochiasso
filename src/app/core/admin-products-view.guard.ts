import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { adminProductsListRedirect } from './admin-return-url';
import { AdminViewModeService } from './admin-view-mode.service';

/** When `lc.admin.viewMode` is `3d`, the products list opens the atelier instead. */
export const adminProductsViewGuard: CanActivateFn = () => {
  const viewMode = inject(AdminViewModeService);
  const router = inject(Router);
  const dest = adminProductsListRedirect(viewMode.mode());
  return dest ? router.createUrlTree([dest]) : true;
};
