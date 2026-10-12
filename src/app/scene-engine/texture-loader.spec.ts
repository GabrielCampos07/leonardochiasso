import { applyCorsBeforeSrc, makeFallbackTexture, TEXTURE_CROSS_ORIGIN } from './texture-loader';

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
