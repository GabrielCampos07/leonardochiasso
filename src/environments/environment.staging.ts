export const environment = {
  production: true,
  /** Staging — catalog and admin via Nest MESMA API da prod. */
  demoMode: false,
  apiBaseUrl: 'https://api.leonardochiasso.com',
  /** Mesmo CDN da prod (somente leitura de mídia). */
  cdnBaseUrl: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev',
  adminPassword: '',
  stagingBanner: 'Ambiente de teste, dados reais',
  admin3dMock: false,
  adminUnpublishedPreviewBadge: false,
};
