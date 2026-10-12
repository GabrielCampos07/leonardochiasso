export const environment = {
  production: false,
  /** When true, catalog/auth/checkout run entirely in the browser (no Nest API). */
  demoMode: true,
  /** Public catalog API origin (no trailing slash). Empty = same-origin / relative. */
  apiBaseUrl: 'http://localhost:3000',
  /** Empty = keep relative `assets/media/...` (local Angular serve). */
  cdnBaseUrl: '',
  /** Empty = admin panel disabled. */
  adminPassword: '',
  /**
   * When true, `/admin/3d` uses in-repo fixtures instead of the Nest API.
   * Also enabled by `?mock=1` or localStorage `lc.admin.3d.mock=1`.
   */
  admin3dMock: true,
};
