export const environment = {
  production: true,
  /** Production storefront — catalog and admin via Nest API + S3 CDN. */
  demoMode: false,
  apiBaseUrl: 'https://api.leonardochiasso.com',
  /** Cloudflare R2 public URL (no trailing slash). Rewrites `assets/media/...`. */
  cdnBaseUrl: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev',
  /** Removed from bundle — admin auth is server-side only. */
  adminPassword: '',
};
