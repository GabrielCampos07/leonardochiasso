import {
  STAGING_BANNER_DEFAULT,
  STAGING_HOST,
  isProductionAdminHost,
  readEnvStagingBanner,
  resolveStagingBannerText,
} from './staging-banner';

describe('readEnvStagingBanner', () => {
  it('returns a trimmed non-empty string', () => {
    expect(readEnvStagingBanner({ stagingBanner: '  Ambiente de teste, dados reais  ' })).toBe(
      'Ambiente de teste, dados reais',
    );
  });

  it('treats missing, empty and non-string values as hidden', () => {
    expect(readEnvStagingBanner({})).toBe('');
    expect(readEnvStagingBanner({ stagingBanner: '' })).toBe('');
    expect(readEnvStagingBanner({ stagingBanner: '   ' })).toBe('');
    expect(readEnvStagingBanner({ stagingBanner: 1 as unknown as string })).toBe('');
    expect(readEnvStagingBanner(null)).toBe('');
    expect(readEnvStagingBanner(undefined)).toBe('');
  });
});

describe('resolveStagingBannerText', () => {
  it('prefers a non-empty environment.stagingBanner over hostname', () => {
    expect(
      resolveStagingBannerText({
        env: { stagingBanner: 'Cópia do PR 1' },
        hostname: 'leonardochiasso.com',
      }),
    ).toBe('Cópia do PR 1');
  });

  it('falls back to the default text on the staging hostname', () => {
    expect(
      resolveStagingBannerText({
        env: {},
        hostname: STAGING_HOST,
      }),
    ).toBe(STAGING_BANNER_DEFAULT);
    expect(
      resolveStagingBannerText({
        env: { stagingBanner: '' },
        hostname: 'STAGING.LEONARDOCHIASSO.COM',
      }),
    ).toBe(STAGING_BANNER_DEFAULT);
  });

  it('stays hidden on production hosts when the env flag is empty', () => {
    expect(
      resolveStagingBannerText({
        env: { stagingBanner: '' },
        hostname: 'leonardochiasso.com',
        queryPreview: '1',
        storagePreview: '1',
      }),
    ).toBeNull();
    expect(
      resolveStagingBannerText({
        env: {},
        hostname: 'www.leonardochiasso.com',
      }),
    ).toBeNull();
    expect(isProductionAdminHost('www.leonardochiasso.com')).toBeTrue();
  });

  it('ignores ?stagingBanner=1 and localStorage preview in production builds', () => {
    expect(
      resolveStagingBannerText({
        env: { stagingBanner: '', production: true },
        hostname: 'localhost',
        production: true,
        queryPreview: '1',
        storagePreview: '1',
      }),
    ).toBeNull();
  });

  it('stays hidden on localhost unless a preview override is set', () => {
    expect(
      resolveStagingBannerText({
        env: { stagingBanner: '' },
        hostname: 'localhost',
      }),
    ).toBeNull();
    expect(
      resolveStagingBannerText({
        env: {},
        hostname: '127.0.0.1',
        queryPreview: '1',
      }),
    ).toBe(STAGING_BANNER_DEFAULT);
    expect(
      resolveStagingBannerText({
        env: {},
        hostname: 'localhost',
        storagePreview: '1',
      }),
    ).toBe(STAGING_BANNER_DEFAULT);
  });
});
