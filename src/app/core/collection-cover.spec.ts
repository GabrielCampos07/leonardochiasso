import {
  CATALOG_COLLECTION_COVERS,
  catalogCollectionCoverUrl,
  collectionCoverUrl,
  collectionMembershipSortOrder,
  coversByCollectionSlug,
  liveCollectionPieces,
  mergeCoverProducts,
  piecePhotoUrl,
  productBelongsToCollection,
  resolveCollectionCover,
} from './collection-cover';
import {
  ADMIN_NIPONIC_NAME_ONLY,
  ADMIN_ORGANIC_BY_ID,
  PROD_COLLECTIONS,
  PROD_PRODUCTS,
} from './collection-cover.fixtures';

describe('catalogCollectionCoverUrl', () => {
  it('maps the three Dreams slugs and names to the pre-#30 PRODUCTS thumbs', () => {
    expect(catalogCollectionCoverUrl('organic-dreams')).toContain('plp-calca-thumb');
    expect(catalogCollectionCoverUrl({ name: 'Niponic Dreams' })).toContain(
      'plp-look-obi-organza-thumb',
    );
    expect(catalogCollectionCoverUrl('brazilian-dreams')).toContain(
      'plp-colete-bermuda-saia-echarpe-thumb',
    );
    expect(catalogCollectionCoverUrl('teste-col-capa')).toBeNull();
  });
});

describe('piecePhotoUrl', () => {
  it('prefers thumb, then primary media, then gallery', () => {
    expect(piecePhotoUrl({ thumb: '  thumb.jpg  ', gallery: ['g.jpg'] })).toBe('thumb.jpg');
    expect(
      piecePhotoUrl({
        media: [
          { cdnUrl: 'second.jpg', sortOrder: 1 },
          { cdnUrl: 'primary.jpg', isPrimary: true, sortOrder: 4 },
        ],
      }),
    ).toBe('primary.jpg');
    expect(piecePhotoUrl({ gallery: ['g.jpg'], imageUrl: 'u.jpg' })).toBe('g.jpg');
    expect(piecePhotoUrl({ thumb: '   ' })).toBeNull();
  });

  it('reads prod media.cdnUrl and admin aliases (url, mediaAsset.cdnUrl)', () => {
    expect(piecePhotoUrl(PROD_PRODUCTS[0]!)).toContain('plp-calca-thumb.webp');
    expect(piecePhotoUrl(ADMIN_ORGANIC_BY_ID)).toContain('plp-calca-thumb.webp');
    expect(piecePhotoUrl(ADMIN_NIPONIC_NAME_ONLY)).toContain('plp-look-obi-organza-thumb.webp');
  });
});

describe('collectionCoverUrl', () => {
  it('skips archived pieces and picks the first live photo by sortOrder', () => {
    expect(
      collectionCoverUrl([
        { thumb: 'gone.jpg', sortOrder: 0, archivedAt: '2026-10-12T12:00:00.000Z' },
        { thumb: '', sortOrder: 1 },
        { thumb: 'live.jpg', sortOrder: 2 },
        { thumb: 'later.jpg', sortOrder: 3 },
      ]),
    ).toBe('live.jpg');
  });

  it('keeps source order when sortOrder is missing', () => {
    expect(collectionCoverUrl([{ thumb: 'first.jpg' }, { thumb: 'second.jpg' }])).toBe('first.jpg');
  });

  it('returns null when no live piece has a photo', () => {
    expect(
      collectionCoverUrl([
        { thumb: 'gone.jpg', archivedAt: '2026-10-12' },
        { thumb: '  ', gallery: [] },
      ]),
    ).toBeNull();
  });

  it('restores the original cover when the archived piece is live again', () => {
    const pieces = [
      { thumb: 'cover.jpg', sortOrder: 0, archivedAt: '2026-10-12T12:00:00.000Z' as string | null },
      { thumb: 'other.jpg', sortOrder: 1, archivedAt: null as string | null },
    ];
    expect(collectionCoverUrl(pieces)).toBe('other.jpg');
    pieces[0]!.archivedAt = null;
    expect(collectionCoverUrl(pieces)).toBe('cover.jpg');
  });
});

describe('resolveCollectionCover with prod-shaped fixtures', () => {
  it('uses the pre-#30 catalog thumbs for Organic / Niponic / Brazilian', () => {
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[0],
        products: PROD_PRODUCTS,
      }),
    ).toBe(catalogCollectionCoverUrl('organic-dreams'));
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[1],
        products: PROD_PRODUCTS,
      }),
    ).toBe(catalogCollectionCoverUrl('niponic-dreams'));
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[2],
        products: PROD_PRODUCTS,
      }),
    ).toBe(catalogCollectionCoverUrl('brazilian-dreams'));
  });

  it('derives a custom collection from the first live member photo', () => {
    expect(
      resolveCollectionCover({
        collection: { slug: 'teste-col-capa', name: 'Teste col capa' },
        products: [
          {
            thumb: 'gone.jpg',
            archivedAt: '2026-10-12T12:00:00.000Z',
            collections: [{ slug: 'teste-col-capa', sortOrder: 0 }],
          },
          { thumb: 'live.jpg', collections: [{ slug: 'teste-col-capa', sortOrder: 1 }] },
        ],
      }),
    ).toBe('live.jpg');
  });

  it('matches membership by collection id when slug is missing', () => {
    expect(productBelongsToCollection(ADMIN_ORGANIC_BY_ID, PROD_COLLECTIONS[0]!)).toBeTrue();
    expect(
      collectionCoverUrl([
        {
          ...ADMIN_ORGANIC_BY_ID,
          sortOrder: collectionMembershipSortOrder(
            ADMIN_ORGANIC_BY_ID.collections,
            PROD_COLLECTIONS[0]!,
          ),
        },
      ]),
    ).toContain('plp-calca-thumb.webp');
  });

  it('matches membership by collection name / collectionSlug', () => {
    expect(productBelongsToCollection(ADMIN_NIPONIC_NAME_ONLY, PROD_COLLECTIONS[1]!)).toBeTrue();
    expect(piecePhotoUrl(ADMIN_NIPONIC_NAME_ONLY)).toContain('plp-look-obi-organza-thumb.webp');
  });

  it('prefers the pre-#30 catalog thumb over derived or DTO coverImage', () => {
    expect(
      resolveCollectionCover({
        collection: { ...PROD_COLLECTIONS[0], coverImage: 'https://cdn.example/stored-organic.jpg' },
        products: [{ thumb: 'other.jpg', collections: [{ slug: 'organic-dreams', sortOrder: 0 }] }],
      }),
    ).toBe(catalogCollectionCoverUrl('organic-dreams'));
  });

  it('does not treat DTO coverImage as a stored Collection field', () => {
    expect(
      resolveCollectionCover({
        collection: { slug: 'teste-col-capa', coverImage: 'https://cdn.example/stored.jpg' },
        products: [
          { thumb: 'live.jpg', collections: [{ slug: 'teste-col-capa', sortOrder: 0 }] },
        ],
      }),
    ).toBe('live.jpg');
  });
});

describe('coversByCollectionSlug', () => {
  it('picks the first live photo by collection sortOrder for custom collections', () => {
    const covers = coversByCollectionSlug([
      {
        thumb: 'gone.jpg',
        archivedAt: '2026-10-12T12:00:00.000Z',
        collections: [{ slug: 'teste-col-capa', sortOrder: 0 }],
      },
      {
        thumb: '',
        collections: [{ slug: 'teste-col-capa', sortOrder: 1 }],
      },
      {
        thumb: 'live.jpg',
        collections: [{ slug: 'teste-col-capa', sortOrder: 2 }],
      },
      {
        thumb: 'later.jpg',
        collections: [{ slug: 'teste-col-capa', sortOrder: 3 }],
      },
    ]);
    expect(covers['teste-col-capa']).toBe('live.jpg');
  });

  it('uses the pre-#30 catalog thumbs for Organic / Niponic / Brazilian even with no products', () => {
    const covers = coversByCollectionSlug([], PROD_COLLECTIONS);
    expect(covers['organic-dreams']).toBe(catalogCollectionCoverUrl('organic-dreams'));
    expect(covers['niponic-dreams']).toBe(catalogCollectionCoverUrl('niponic-dreams'));
    expect(covers['brazilian-dreams']).toBe(catalogCollectionCoverUrl('brazilian-dreams'));
    expect(covers['organic-dreams']).toContain('plp-calca-thumb');
    expect(covers['niponic-dreams']).toContain('plp-look-obi-organza-thumb');
    expect(covers['brazilian-dreams']).toContain('plp-colete-bermuda-saia-echarpe-thumb');
  });

  it('keeps the catalog map keys even when no collection meta is passed', () => {
    expect(Object.keys(CATALOG_COLLECTION_COVERS).sort()).toEqual(
      ['brazilian-dreams', 'niponic-dreams', 'organic-dreams'].sort(),
    );
    const covers = coversByCollectionSlug([]);
    expect(covers['organic-dreams']).toContain('plp-calca-thumb');
  });

  it('still finds a cover when admin rows omit collections[].slug', () => {
    const covers = coversByCollectionSlug(
      [ADMIN_ORGANIC_BY_ID, ADMIN_NIPONIC_NAME_ONLY],
      PROD_COLLECTIONS,
    );
    expect(covers['organic-dreams']).toContain('plp-calca-thumb.webp');
    expect(covers['niponic-dreams']).toContain('plp-look-obi-organza-thumb.webp');
  });

  it('restores the original cover when the archived piece is live again', () => {
    const products = [
      {
        thumb: 'cover.jpg',
        archivedAt: '2026-10-12T12:00:00.000Z' as string | null,
        collections: [{ slug: 'teste-col-capa', sortOrder: 0 }],
      },
      {
        thumb: 'other.jpg',
        archivedAt: null as string | null,
        collections: [{ slug: 'teste-col-capa', sortOrder: 1 }],
      },
    ];
    expect(coversByCollectionSlug(products)['teste-col-capa']).toBe('other.jpg');
    products[0]!.archivedAt = null;
    expect(coversByCollectionSlug(products)['teste-col-capa']).toBe('cover.jpg');
  });
});

describe('collectionMembershipSortOrder', () => {
  it('reads product_collections.sortOrder for a slug', () => {
    expect(
      collectionMembershipSortOrder(
        [
          { slug: 'niponic-dreams', sortOrder: 4 },
          { slug: 'organic-dreams', sortOrder: 0 },
        ],
        'organic-dreams',
      ),
    ).toBe(0);
    expect(collectionMembershipSortOrder([{ slug: 'organic-dreams' }], 'organic-dreams')).toBeNull();
  });

  it('reads sortOrder when membership is keyed by collection id', () => {
    expect(
      collectionMembershipSortOrder(
        [{ id: PROD_COLLECTIONS[0]!.id, sortOrder: 0 }],
        PROD_COLLECTIONS[0]!,
      ),
    ).toBe(0);
  });
});

describe('productBelongsToCollection', () => {
  it('matches slug, id, or display name', () => {
    expect(productBelongsToCollection(PROD_PRODUCTS[0]!, PROD_COLLECTIONS[0]!)).toBeTrue();
    expect(productBelongsToCollection(ADMIN_ORGANIC_BY_ID, PROD_COLLECTIONS[0]!)).toBeTrue();
    expect(productBelongsToCollection(ADMIN_NIPONIC_NAME_ONLY, PROD_COLLECTIONS[1]!)).toBeTrue();
    expect(productBelongsToCollection(PROD_PRODUCTS[0]!, PROD_COLLECTIONS[1]!)).toBeFalse();
  });
});

describe('mergeCoverProducts', () => {
  it('fills missing admin photos from the public catalog row', () => {
    const merged = mergeCoverProducts(
      [{ slug: 'calca-pantalona-rasgo', thumb: '', collections: [] }],
      PROD_PRODUCTS,
    );
    expect(merged[0]?.thumb).toContain('plp-calca-thumb.webp');
    expect(merged[0]?.collections?.[0]?.slug).toBe('organic-dreams');
  });
});

describe('liveCollectionPieces', () => {
  it('drops archived rows and sorts by collection sortOrder', () => {
    const rows = liveCollectionPieces([
      { thumb: 'b.jpg', sortOrder: 2 },
      { thumb: 'gone.jpg', sortOrder: 0, archivedAt: '2026-10-12' },
      { thumb: 'a.jpg', sortOrder: 1 },
    ]);
    expect(rows.map((r) => r.thumb)).toEqual(['a.jpg', 'b.jpg']);
  });
});
