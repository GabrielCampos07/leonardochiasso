import { COLLECTION_COVER_FALLBACK_HEX } from '../core/collection-cover';
import {
  applyCorsBeforeSrc,
  FALLBACK_WIDTH,
  fitLabelText,
  isSharedTexture,
  LABEL_DEFAULT_WIDTH,
  makeFallbackTexture,
  makeLabelTexture,
  makePlaceholderTexture,
  makeSoldOutTexture,
  SOLD_OUT_TEXTURE_HEIGHT,
  SOLD_OUT_TEXTURE_WIDTH,
  TEXTURE_BITMAP_ORIENTATION,
  TEXTURE_CROSS_ORIGIN,
  textureCacheUrl,
} from './texture-loader';

describe('textureCacheUrl', () => {
  it('appends tex=1 on a bare CDN url', () => {
    expect(textureCacheUrl('https://pub-example.r2.dev/pdp/plp-bateau-thumb.webp')).toBe(
      'https://pub-example.r2.dev/pdp/plp-bateau-thumb.webp?tex=1',
    );
  });

  it('applies tex=1 to the pdp thumb fallback the same way as the primary', () => {
    expect(textureCacheUrl('https://cdn.example/pdp/plp-organic-thumb.webp')).toContain('tex=1');
    expect(textureCacheUrl('https://cdn.example/pdp/plp-organic-thumb.webp?w=400')).toBe(
      'https://cdn.example/pdp/plp-organic-thumb.webp?w=400&tex=1',
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

describe('ImageBitmap orientation', () => {
  it('flips Y in createImageBitmap so hangers and trays stay upright', () => {
    expect(TEXTURE_BITMAP_ORIENTATION).toBe('flipY');
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
    const texture = makeFallbackTexture(COLLECTION_COVER_FALLBACK_HEX, 'Vestido Longo Radial');
    expect(texture.image.width).toBe(FALLBACK_WIDTH);
    expect(texture.image.height).toBeGreaterThanOrEqual(128);
    texture.dispose();
  });
});

describe('fitLabelText', () => {
  it('keeps a short name and ellipsizes a long one to the plate width', () => {
    expect(fitLabelText('Bateau', 400)).toBe('Bateau');
    const fitted = fitLabelText('Pantalona rasgo Vestido LG Bateau extra', 160);
    expect(fitted.endsWith('…')).toBeTrue();
    expect(fitted.length).toBeLessThan(36);
  });
});

describe('label and placeholder canvases', () => {
  it('reuses the painted canvas for the same label', () => {
    const a = makeLabelTexture('Organic Dreams', { width: 768, height: 120 });
    const b = makeLabelTexture('Organic Dreams', { width: 768, height: 120 });
    expect(a.image).toBe(b.image);
    expect(a.image.width).toBe(LABEL_DEFAULT_WIDTH);
    a.dispose();
    b.dispose();
  });

  it('paints a large readable Esgotado badge', () => {
    const texture = makeSoldOutTexture();
    expect(texture.image.width).toBe(SOLD_OUT_TEXTURE_WIDTH);
    expect(texture.image.height).toBe(SOLD_OUT_TEXTURE_HEIGHT);
    expect(SOLD_OUT_TEXTURE_WIDTH).toBeGreaterThanOrEqual(256);
    expect(SOLD_OUT_TEXTURE_HEIGHT).toBeGreaterThanOrEqual(80);
    texture.dispose();
  });

  it('shares a tiny placeholder until photos stream in', () => {
    const a = makePlaceholderTexture();
    const b = makePlaceholderTexture();
    expect(isSharedTexture(a)).toBeTrue();
    expect(a).toBe(b);
    expect(a.image).toBe(b.image);
    expect(a.image.width).toBeLessThanOrEqual(64);
  });

  it('returns a new live placeholder if the shared instance was disposed', () => {
    const a = makePlaceholderTexture();
    a.dispose();
    const b = makePlaceholderTexture();
    expect(b).not.toBe(a);
    expect(isSharedTexture(b)).toBeTrue();
    expect(b.image.width).toBeGreaterThan(0);
  });
});
