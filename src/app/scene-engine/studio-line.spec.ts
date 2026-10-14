import { ART_PIECES } from '../core/arte.data';
import { mapAtelierToScene } from './mapping';
import {
  ARTE_COLLECTION_SLUG,
  CASA_COLLECTION_SLUG,
  CASA_COMING_SOON_TEXT,
  isEditorialArtSlug,
  markComingSoonRacks,
  mergeArtProducts,
  mergeStudioLineCollections,
  omitEditorialArtFromLiveOrder,
  stockroomCountLabel,
} from './studio-line';

describe('studio-line Arte / Casa', () => {
  it('injects unpublished Arte and Casa when the admin list omits them', () => {
    const merged = mergeStudioLineCollections([
      { slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 },
    ]);
    expect(merged.map((c) => c.slug)).toEqual([
      'organic-dreams',
      ARTE_COLLECTION_SLUG,
      CASA_COLLECTION_SLUG,
    ]);
    expect(merged.find((c) => c.slug === ARTE_COLLECTION_SLUG)?.publishedAt).toBeNull();
    expect(merged.find((c) => c.slug === CASA_COLLECTION_SLUG)?.publishedAt).toBeNull();
  });

  it('keeps API Arte / Casa rows instead of duplicating them', () => {
    const merged = mergeStudioLineCollections([
      { slug: ARTE_COLLECTION_SLUG, name: 'Arte', sortOrder: 2, publishedAt: null },
      { slug: CASA_COLLECTION_SLUG, name: 'Casa', sortOrder: 3, publishedAt: null },
    ]);
    expect(merged.filter((c) => c.slug === ARTE_COLLECTION_SLUG)).toHaveSize(1);
    expect(merged.filter((c) => c.slug === CASA_COLLECTION_SLUG)).toHaveSize(1);
  });

  it('hangs existing art works on Arte and leaves Casa empty with Em breve', () => {
    const layout = mapAtelierToScene([], []);
    const arte = layout.racks.find((r) => r.id === ARTE_COLLECTION_SLUG);
    const casa = layout.racks.find((r) => r.id === CASA_COLLECTION_SLUG);
    expect(arte?.unpublished).toBeTrue();
    expect(arte?.hangers.map((h) => h.slug)).toEqual(ART_PIECES.map((p) => p.slug));
    expect(arte?.hangers[0]?.name).toBe(ART_PIECES[0]?.title);
    expect(casa?.hangers).toEqual([]);
    expect(casa?.comingSoon).toBeTrue();
    expect(casa?.unpublished).toBeTrue();
    expect(stockroomCountLabel(casa?.hangers.length ?? 0, casa?.comingSoon)).toBe(
      CASA_COMING_SOON_TEXT,
    );
  });

  it('does not duplicate an art work that is already a catalog product', () => {
    const first = ART_PIECES[0]!;
    const merged = mergeArtProducts([
      {
        slug: first.slug,
        name: 'Catalog Gioconda',
        collectionSlug: ARTE_COLLECTION_SLUG,
      },
    ]);
    expect(merged.filter((p) => p.slug === first.slug)).toHaveSize(1);
    expect(merged.find((p) => p.slug === first.slug)?.name).toBe('Catalog Gioconda');
  });

  it('keeps editorial art slugs out of the membership PUT unless they are already members', () => {
    expect(isEditorialArtSlug('monalisa')).toBeTrue();
    expect(
      omitEditorialArtFromLiveOrder(['monalisa', 'vestido'], ['vestido']),
    ).toEqual(['vestido']);
    expect(
      omitEditorialArtFromLiveOrder(['monalisa', 'vestido'], ['monalisa', 'vestido']),
    ).toEqual(['monalisa', 'vestido']);
  });

  it('drops Em breve once Casa has hangers', () => {
    const marked = markComingSoonRacks({
      racks: [
        {
          id: CASA_COLLECTION_SLUG,
          name: 'Casa',
          sortOrder: 91,
          kind: 'rack',
          hangers: [
            {
              productId: 'vaso',
              slug: 'vaso',
              name: 'Vaso',
              imageUrl: null,
              stockQty: 1,
              priceLabel: '',
              status: 'published',
              rackId: CASA_COLLECTION_SLUG,
              kind: 'garment',
            },
          ],
        },
      ],
    });
    expect(marked.racks[0]?.comingSoon).toBeUndefined();
  });
});
