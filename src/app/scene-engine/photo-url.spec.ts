import { apiProductToSceneInput } from './from-catalog';
import { toSceneHanger } from './mapping';
import {
  clampTooltip,
  derivedThumbUrl,
  fullImageUrl,
  hangerTextureUrls,
  mergeProductPhotos,
  primaryImageUrl,
  textureJobId,
  thumbImageUrl,
} from './photo-url';
import { textureCacheUrl } from './texture-loader';

/** Shape taken from live `GET https://api.leonardochiasso.com/api/products` (2026-10-12). */
const PROD_BATEAU = {
  slug: 'vestido-longo-bateau',
  name: 'Vestido Lg Bateau',
  thumb: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-bateau-thumb.webp',
  gallery: [
    'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/pdp-bateau-01.webp',
    'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/pdp-bateau-02.webp',
  ],
  imageBindings: [],
  media: [
    {
      id: '487b3868-9231-4b35-aab0-d80c85f416b5',
      cdnUrl: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-bateau-thumb.webp',
      role: 'thumb',
      altPt: 'Vestido Lg Bateau',
      sortOrder: 0,
      isPrimary: true,
    },
    {
      id: 'gallery-1',
      cdnUrl: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/pdp-bateau-01.webp',
      role: 'gallery',
      altPt: null,
      sortOrder: 1,
      isPrimary: false,
    },
  ],
};

const PROD_THUMB = PROD_BATEAU.thumb;

describe('primaryImageUrl (prod catalog shape)', () => {
  it('resolves isPrimary / role thumb → cdnUrl from a live /api/products payload', () => {
    expect(primaryImageUrl(PROD_BATEAU)).toBe(PROD_THUMB);
    expect(PROD_BATEAU.imageBindings).toEqual([]);
  });

  it('prefers isPrimary cdnUrl over thumb and later gallery media', () => {
    expect(
      primaryImageUrl({
        thumb: 'https://cdn.example/thumb.webp',
        media: [
          { cdnUrl: 'https://cdn.example/gallery.webp', role: 'gallery', sortOrder: 0 },
          { cdnUrl: 'https://cdn.example/primary.webp', role: 'pdp', isPrimary: true, sortOrder: 4 },
        ],
      }),
    ).toBe('https://cdn.example/primary.webp');
  });

  it('uses role thumb when isPrimary is absent', () => {
    expect(
      primaryImageUrl({
        thumb: 'https://cdn.example/thumb.webp',
        media: [
          { cdnUrl: 'https://cdn.example/role-thumb.webp', role: 'thumb', sortOrder: 2 },
          { cdnUrl: 'https://cdn.example/gallery.webp', role: 'gallery', sortOrder: 0 },
        ],
      }),
    ).toBe('https://cdn.example/role-thumb.webp');
  });

  it('falls back to thumb when media has no primary or thumb role', () => {
    expect(
      primaryImageUrl({
        thumb: 'https://cdn.example/thumb.webp',
        media: [{ cdnUrl: 'https://cdn.example/gallery.webp', role: 'gallery', sortOrder: 0 }],
      }),
    ).toBe('https://cdn.example/thumb.webp');
  });

  it('falls back to the first media cdnUrl when thumb is empty', () => {
    expect(
      primaryImageUrl({
        thumb: '',
        media: [
          { cdnUrl: 'https://cdn.example/second.webp', sortOrder: 2 },
          { cdnUrl: 'https://cdn.example/first.webp', sortOrder: 0 },
        ],
      }),
    ).toBe('https://cdn.example/first.webp');
  });

  it('reads nested mediaAsset.cdnUrl from a raw admin include', () => {
    expect(
      primaryImageUrl({
        imageBindings: [],
        media: [
          {
            isPrimary: true,
            role: 'thumb',
            mediaAsset: {
              cdnUrl: 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-bateau-thumb.webp',
              role: 'thumb',
            },
          },
        ],
      }),
    ).toBe(PROD_THUMB);
  });

  it('maps a prod DTO onto a hanger imageUrl', () => {
    const hanger = toSceneHanger(
      apiProductToSceneInput({
        id: '1',
        slug: PROD_BATEAU.slug,
        name: PROD_BATEAU.name,
        description: '',
        details: [],
        shipping: null,
        priceCents: 0,
        currency: 'BRL',
        color: null,
        size: null,
        fabric: null,
        season: null,
        category: 'feminino',
        collection: 'Organic Dreams',
        thumb: PROD_BATEAU.thumb,
        gallery: PROD_BATEAU.gallery,
        imageBindings: [],
        media: PROD_BATEAU.media,
      }),
      'organic-dreams',
    );
    expect(hanger.thumbUrl).toBe(PROD_THUMB);
    expect(hanger.imageUrl).toBe(PROD_BATEAU.gallery[0]);
    expect(fullImageUrl(PROD_BATEAU)).toBe(PROD_BATEAU.gallery[0]);
  });
});

describe('hangerTextureUrls', () => {
  it('uses only the thumb for the default 3D load', () => {
    const urls = hangerTextureUrls({
      imageUrl: 'https://cdn.example/pdp/pdp-bateau-01.webp',
      thumbUrl: 'https://cdn.example/pdp/plp-bateau-thumb.webp',
    });
    expect(urls).toEqual(['https://cdn.example/pdp/plp-bateau-thumb.webp']);
    expect(textureCacheUrl(urls[0]!)).toBe('https://cdn.example/pdp/plp-bateau-thumb.webp?tex=1');
    expect(
      hangerTextureUrls(
        {
          imageUrl: 'https://cdn.example/pdp/pdp-bateau-01.webp',
          thumbUrl: 'https://cdn.example/pdp/plp-bateau-thumb.webp',
        },
        'full',
      ),
    ).toEqual(['https://cdn.example/pdp/pdp-bateau-01.webp']);
    expect(textureJobId('bateau', 'full')).toBe('bateau:full');
  });

  it('falls back to the full pdp photo when thumb is missing', () => {
    expect(derivedThumbUrl('https://cdn.example/pdp/pdp-bateau-01.webp')).toBe(
      'https://cdn.example/pdp/plp-bateau-thumb.webp',
    );
    expect(hangerTextureUrls({ imageUrl: 'https://cdn.example/pdp/pdp-bateau-01.webp' })).toEqual([
      'https://cdn.example/pdp/pdp-bateau-01.webp',
    ]);
  });

  it('does not duplicate when the primary already is the thumb', () => {
    expect(thumbImageUrl(PROD_BATEAU)).toBe(PROD_THUMB);
    expect(hangerTextureUrls({ imageUrl: PROD_THUMB, thumbUrl: PROD_THUMB })).toEqual([PROD_THUMB]);
    expect(hangerTextureUrls({ imageUrl: PROD_THUMB, thumbUrl: PROD_THUMB }, 'full')).toEqual([]);
  });

  it('reads role thumb from media when product.thumb is empty', () => {
    expect(
      thumbImageUrl({
        thumb: '',
        media: [{ cdnUrl: 'https://cdn.example/pdp/plp-role-thumb.webp', role: 'thumb' }],
      }),
    ).toBe('https://cdn.example/pdp/plp-role-thumb.webp');
  });
});

describe('mergeProductPhotos', () => {
  it('keeps admin photos when they already resolve', () => {
    const admin = { slug: 'a', thumb: 'https://cdn.example/admin.webp', media: [] };
    const merged = mergeProductPhotos(admin, PROD_BATEAU);
    expect(primaryImageUrl(merged)).toBe('https://cdn.example/admin.webp');
  });

  it('copies storefront thumb/media when the admin row has no photo', () => {
    const admin = {
      slug: PROD_BATEAU.slug,
      name: PROD_BATEAU.name,
      thumb: '',
      media: [] as typeof PROD_BATEAU.media,
      imageBindings: [],
    };
    const merged = mergeProductPhotos(admin, PROD_BATEAU);
    expect(primaryImageUrl(merged)).toBe(PROD_THUMB);
    expect(merged.media?.[0]?.cdnUrl).toBe(PROD_THUMB);
  });
});

describe('clampTooltip', () => {
  it('offsets from the cursor and stays inside the viewport', () => {
    const pos = clampTooltip(100, 80, { width: 200, height: 60 }, { width: 800, height: 600 });
    expect(pos.x).toBe(116);
    expect(pos.y).toBe(98);
  });

  it('clamps to the bottom-right edge', () => {
    const pos = clampTooltip(790, 590, { width: 200, height: 60 }, { width: 800, height: 600 });
    expect(pos.x).toBe(592);
    expect(pos.y).toBe(532);
  });
});
