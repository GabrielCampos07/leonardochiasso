import {
  catalogCollectionCover,
  derivedCollectionCover,
  resolveCollectionCoverImage,
} from './collection-cover';

const organicMembers = [
  {
    sortOrder: 0,
    product: {
      archivedAt: null,
      media: [
        {
          sortOrder: 0,
          isPrimary: true,
          mediaAsset: {
            cdnUrl:
              'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-calca-thumb.webp',
          },
        },
      ],
    },
  },
  {
    sortOrder: 1,
    product: {
      archivedAt: null,
      media: [
        {
          sortOrder: 0,
          isPrimary: true,
          mediaAsset: {
            cdnUrl:
              'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-bateau-thumb.webp',
          },
        },
      ],
    },
  },
];

describe('catalogCollectionCover', () => {
  it('maps Organic / Niponic / Brazilian to the pre-#30 PRODUCTS thumbs', () => {
    expect(catalogCollectionCover('organic-dreams')).toContain('plp-calca-thumb.webp');
    expect(catalogCollectionCover('niponic-dreams')).toContain('plp-look-obi-organza-thumb.webp');
    expect(catalogCollectionCover('brazilian-dreams')).toContain(
      'plp-colete-bermuda-saia-echarpe-thumb.webp',
    );
    expect(catalogCollectionCover('teste-col-capa')).toBeNull();
  });
});

describe('derivedCollectionCover', () => {
  it('picks the first live member photo by product_collections.sortOrder', () => {
    expect(derivedCollectionCover(organicMembers)).toContain('plp-calca-thumb.webp');
  });

  it('skips archived members even when they are first', () => {
    expect(
      derivedCollectionCover([
        {
          sortOrder: 0,
          product: {
            archivedAt: new Date('2026-10-12T12:00:00Z'),
            media: [{ mediaAsset: { cdnUrl: 'https://cdn.example/gone.jpg' } }],
          },
        },
        organicMembers[1]!,
      ]),
    ).toContain('plp-bateau-thumb.webp');
  });
});

describe('resolveCollectionCoverImage', () => {
  it('prefers the pre-#30 catalog thumb for Organic even without members', () => {
    expect(resolveCollectionCoverImage('organic-dreams', [])).toBe(
      catalogCollectionCover('organic-dreams'),
    );
    expect(resolveCollectionCoverImage('organic-dreams', organicMembers)).toContain(
      'plp-calca-thumb.webp',
    );
  });

  it('ignores a DTO cover URL that is not a catalog slug', () => {
    expect(
      resolveCollectionCoverImage('https://cdn.example/stored-organic.jpg', organicMembers),
    ).toContain('plp-calca-thumb.webp');
  });

  it('derives a custom collection and returns null only when nothing exists', () => {
    expect(resolveCollectionCoverImage('teste-col-capa', organicMembers)).toContain(
      'plp-calca-thumb.webp',
    );
    expect(resolveCollectionCoverImage('teste-col-capa', [])).toBeNull();
    expect(
      resolveCollectionCoverImage(null, [
        {
          sortOrder: 0,
          product: { archivedAt: new Date(), media: [] },
        },
      ]),
    ).toBeNull();
  });
});
