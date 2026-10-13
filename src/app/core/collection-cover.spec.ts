import {
  collectionCoverUrl,
  collectionMembershipSortOrder,
  coversByCollectionSlug,
  liveCollectionPieces,
  mergeCoverProducts,
  piecePhotoUrl,
  productBelongsToCollection,
  resolveCollectionCover,
  storedCoverIsFromArchivedPiece,
} from './collection-cover';
import {
  ADMIN_NIPONIC_NAME_ONLY,
  ADMIN_ORGANIC_BY_ID,
  PROD_COLLECTIONS,
  PROD_PRODUCTS,
} from './collection-cover.fixtures';

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
  it('uses the first live piece photo by product_collections.sortOrder', () => {
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[0],
        products: PROD_PRODUCTS,
      }),
    ).toContain('plp-calca-thumb.webp');
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[1],
        products: PROD_PRODUCTS,
      }),
    ).toContain('plp-look-obi-organza-thumb.webp');
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[2],
        products: PROD_PRODUCTS,
      }),
    ).toContain('plp-colete-bermuda-saia-thumb.webp');
  });

  it('matches membership by collection id when slug is missing', () => {
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[0],
        products: [ADMIN_ORGANIC_BY_ID],
      }),
    ).toContain('plp-calca-thumb.webp');
  });

  it('matches membership by collection name / collectionSlug', () => {
    expect(
      resolveCollectionCover({
        collection: PROD_COLLECTIONS[1],
        products: [ADMIN_NIPONIC_NAME_ONLY],
      }),
    ).toContain('plp-look-obi-organza-thumb.webp');
  });

  it('prefers a stored coverImage when it is not from an archived piece', () => {
    expect(
      resolveCollectionCover({
        collection: { ...PROD_COLLECTIONS[0], coverImage: 'https://cdn.example/stored-organic.jpg' },
        products: PROD_PRODUCTS,
      }),
    ).toBe('https://cdn.example/stored-organic.jpg');
  });

  it('ignores a stored cover that only belongs to an archived piece and derives the next live photo', () => {
    const archivedCover = PROD_PRODUCTS[0]!.thumb!;
    const products = [
      { ...PROD_PRODUCTS[0]!, archivedAt: '2026-10-12T12:00:00.000Z' },
      PROD_PRODUCTS[1]!,
    ];
    expect(storedCoverIsFromArchivedPiece(archivedCover, products)).toBeTrue();
    expect(
      resolveCollectionCover({
        collection: { ...PROD_COLLECTIONS[0], coverImage: archivedCover },
        products,
      }),
    ).toContain('plp-bateau-thumb.webp');
  });
});

describe('coversByCollectionSlug', () => {
  it('picks the first live photo by collection sortOrder', () => {
    const covers = coversByCollectionSlug([
      {
        thumb: 'gone.jpg',
        archivedAt: '2026-10-12T12:00:00.000Z',
        collections: [{ slug: 'organic-dreams', sortOrder: 0 }],
      },
      {
        thumb: '',
        collections: [{ slug: 'organic-dreams', sortOrder: 1 }],
      },
      {
        thumb: 'live.jpg',
        collections: [{ slug: 'organic-dreams', sortOrder: 2 }],
      },
      {
        thumb: 'later.jpg',
        collections: [{ slug: 'organic-dreams', sortOrder: 3 }],
      },
    ]);
    expect(covers['organic-dreams']).toBe('live.jpg');
  });

  it('derives Organic / Niponic / Brazilian from the real public product shape', () => {
    const covers = coversByCollectionSlug(PROD_PRODUCTS, PROD_COLLECTIONS);
    expect(covers['organic-dreams']).toContain('plp-calca-thumb.webp');
    expect(covers['niponic-dreams']).toContain('plp-look-obi-organza-thumb.webp');
    expect(covers['brazilian-dreams']).toContain('plp-colete-bermuda-saia-thumb.webp');
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
        collections: [{ slug: 'organic-dreams', sortOrder: 0 }],
      },
      {
        thumb: 'other.jpg',
        archivedAt: null as string | null,
        collections: [{ slug: 'organic-dreams', sortOrder: 1 }],
      },
    ];
    expect(coversByCollectionSlug(products)['organic-dreams']).toBe('other.jpg');
    products[0]!.archivedAt = null;
    expect(coversByCollectionSlug(products)['organic-dreams']).toBe('cover.jpg');
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
