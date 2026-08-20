export const environment = {
  production: true,
  /** Production storefront — catalog and admin via Nest API + S3 CDN. */
  demoMode: false,
  apiBaseUrl: 'https://api.leonardochiasso.com',
  /** Removed from bundle — admin auth is server-side only. */
  adminPassword: '',
};
