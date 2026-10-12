import {
  collectionCoverUrl,
  collectionMembershipSortOrder,
  coversByCollectionSlug,
  liveCollectionPieces,
  piecePhotoUrl,
} from './collection-cover';

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
    expect(
      collectionCoverUrl([{ thumb: 'first.jpg' }, { thumb: 'second.jpg' }]),
    ).toBe('first.jpg');
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
