export const environment = {
  production: true,
  /**
   * Client preview on Hostinger — no API.
   * Catalog, auth, account, wishlist and checkout use localStorage / in-memory data.
   */
  demoMode: true,
  apiBaseUrl: '',
  /** Boutique admin (`/admin`) — localStorage catalog; change after launch. */
  adminPassword: 'atelier2026',
};
