import {
  applyCorsBeforeSrc,
  makeFallbackTexture,
  TEXTURE_CROSS_ORIGIN,
  textureCacheUrl,
} from './texture-loader';

describe('textureCacheUrl', () => {
  it('appends tex=1 on a bare CDN url', () => {
    expect(textureCacheUrl('https://pub-example.r2.dev/pdp/plp-bateau-thumb.webp')).toBe(
      'https://pub-example.r2.dev/pdp/plp-bateau-thumb.webp?tex=1',
    );
  });

  it('preserves an existing query string', () => {
    expect(textureCacheUrl('https://cdn.example/p.webp?w=800&v=2')).toBe(
      'https://cdn.example/p.webp?w=800&v=2&tex=1',
    );
  });

  it('does not duplicate tex when it is already present', () => {
    expect(textureCacheUrl('https://cdn.example/p.webp?tex=1')).toBe('https://cdn.example/p.webp?tex=1');
  });

  it('keeps a hash and leaves data URLs alone', () => {
    expect(textureCacheUrl('https://cdn.example/p.webp#hero')).toBe('https://cdn.example/p.webp?tex=1#hero');
    expect(textureCacheUrl('data:image/png;base64,aaa')).toBe('data:image/png;base64,aaa');
  });
});

describe('applyCorsBeforeSrc', () => {
  it('sets crossOrigin anonymous before src is assigned', () => {
    const image = { crossOrigin: null as string | null, src: '' };
    applyCorsBeforeSrc(image);
    expect(image.crossOrigin).toBe(TEXTURE_CROSS_ORIGIN);
    expect(image.crossOrigin).toBe('anonymous');
    expect(image.src).toBe('');
    image.src = 'https://pub-example.r2.dev/peca.jpg';
    expect(image.crossOrigin).toBe('anonymous');
  });
});

describe('makeFallbackTexture', () => {
  it('paints a named fallback instead of a blank gray plane', () => {
    const texture = makeFallbackTexture('#c8c2b8', 'Vestido Longo Radial');
    expect(texture.image.width).toBeGreaterThanOrEqual(128);
    expect(texture.image.height).toBeGreaterThanOrEqual(128);
    texture.dispose();
  });
});
