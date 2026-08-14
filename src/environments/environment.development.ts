export const environment = {
  production: false,
  /**
   * Local boutique preview — use in-browser PRODUCTS catalog (same as Hostinger demo).
   * Set false only when exercising the Nest API with a fresh seed.
   */
  demoMode: true,
  apiBaseUrl: 'http://localhost:3000',
  /** Local admin panel password (`/admin`). Not for production security. */
  adminPassword: 'atelier2026',
};
