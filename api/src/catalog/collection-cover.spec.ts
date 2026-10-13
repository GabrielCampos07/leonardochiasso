import {
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
  it('prefers a stored cover that is not from an archived piece', () => {
    expect(
      resolveCollectionCoverImage('https://cdn.example/stored-organic.jpg', organicMembers),
    ).toBe('https://cdn.example/stored-organic.jpg');
  });

  it('drops a stored cover that only belongs to an archived piece', () => {
    const archived = 'https://cdn.example/gone.jpg';
    expect(
      resolveCollectionCoverImage(archived, [
        {
          sortOrder: 0,
          product: {
            archivedAt: new Date('2026-10-12T12:00:00Z'),
            media: [{ mediaAsset: { cdnUrl: archived } }],
          },
        },
        organicMembers[1]!,
      ]),
    ).toContain('plp-bateau-thumb.webp');
  });

  it('returns null only when there is no stored cover and no live photo', () => {
    expect(resolveCollectionCoverImage(null, [])).toBeNull();
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
