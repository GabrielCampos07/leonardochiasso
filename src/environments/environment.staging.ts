export const environment = {
  production: true,
  /** Staging — catalog and admin via Nest API de staging (Neon branch própria). */
  demoMode: false,
  apiBaseUrl: 'https://api-staging.leonardochiasso.com',
  /** Mesmo CDN da prod (somente leitura de mídia). */
  cdnBaseUrl: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev',
  adminPassword: '',
};
