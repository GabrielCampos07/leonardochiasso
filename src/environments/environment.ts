export const environment = {
  production: false,
  /** When true, catalog/auth/checkout run entirely in the browser (no Nest API). */
  demoMode: true,
  /** Public catalog API origin (no trailing slash). Empty = same-origin / relative. */
  apiBaseUrl: 'http://localhost:3000',
  /** Empty = admin panel disabled. */
  adminPassword: '',
};
