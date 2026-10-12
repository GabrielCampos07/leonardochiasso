export const environment = {
  production: false,
  /**
   * Local boutique preview — use in-browser PRODUCTS catalog (same as Hostinger demo).
   * Set `false` to exercise Nest Admin API (Phase 4a CMS: list/reorder/create/upload).
   */
  demoMode: false,
  apiBaseUrl: 'http://localhost:3000',
  /** Empty locally — `src/assets/media` is served by `ng serve`. */
  cdnBaseUrl: '',
  /** Local admin panel password (`/admin`). Not for production security. */
  adminPassword: '123',
  stagingBanner: '',
  /**
   * Force `/admin/3d` fixtures (no Nest). Leave false to hit the real admin API
   * when `apiBaseUrl` is up. Override anytime with `?mock=1` or
   * `localStorage.setItem('lc.admin.3d.mock','1')`.
   */
  admin3dMock: false,
};
