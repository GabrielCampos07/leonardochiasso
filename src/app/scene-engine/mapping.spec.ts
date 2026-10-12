import { mapCatalogToScene, replaceHanger, resolveProductRackId, toSceneHanger } from './mapping';
import { UNCOLLECTED_RACK_ID, UNCOLLECTED_RACK_NAME, primaryImageUrl } from './types';

describe('mapCatalogToScene', () => {
  const collections = [
    { slug: 'niponic-dreams', name: 'Niponic Dreams', sortOrder: 2 },
    { slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 },
  ];

  const products = [
    {
      slug: 'vestido',
      name: 'Vestido',
      collectionSlug: 'organic-dreams',
      status: 'published',
      stockQty: 4,
      media: [{ cdnUrl: 'https://cdn.example/vestido.jpg', sortOrder: 0 }],
    },
    {
      slug: 'jaqueta',
      name: 'Jaqueta',
      collectionSlugs: ['niponic-dreams'],
      status: 'draft',
      stockQty: 1,
      thumb: 'https://cdn.example/jaqueta.jpg',
    },
    {
      slug: 'avulsa',
      name: 'Peça avulsa',
      collectionSlug: '',
      collectionSlugs: [],
      status: 'published',
      stockQty: 0,
      gallery: ['https://cdn.example/avulsa.jpg'],
    },
    {
      slug: 'orfao',
      name: 'Coleção sumiu',
      collectionSlug: 'colecao-apagada',
      stockQty: 2,
    },
  ];

  it('orders racks by sortOrder and appends Sem coleção', () => {
    const layout = mapCatalogToScene(collections, products);
    expect(layout.racks.map((r) => r.id)).toEqual([
      'organic-dreams',
      'niponic-dreams',
      UNCOLLECTED_RACK_ID,
    ]);
    expect(layout.racks[2]?.name).toBe(UNCOLLECTED_RACK_NAME);
  });

  it('places products on the matching rack and orphans on Sem coleção', () => {
    const layout = mapCatalogToScene(collections, products);
    expect(layout.racks[0]?.hangers.map((h) => h.slug)).toEqual(['vestido']);
    expect(layout.racks[1]?.hangers.map((h) => h.slug)).toEqual(['jaqueta']);
    expect(layout.racks[2]?.hangers.map((h) => h.slug)).toEqual(['avulsa', 'orfao']);
  });

  it('maps name, media[0], stock and draft status onto hangers', () => {
    const layout = mapCatalogToScene(collections, products);
    const vestido = layout.racks[0]?.hangers[0];
    expect(vestido).toEqual(
      jasmine.objectContaining({
        name: 'Vestido',
        imageUrl: 'https://cdn.example/vestido.jpg',
        stockQty: 4,
        status: 'published',
      }),
    );
    const jaqueta = layout.racks[1]?.hangers[0];
    expect(jaqueta?.status).toBe('draft');
    expect(jaqueta?.stockQty).toBe(1);
    expect(jaqueta?.imageUrl).toBe('https://cdn.example/jaqueta.jpg');
  });

  it('always includes Sem coleção even when every product has a collection', () => {
    const layout = mapCatalogToScene(collections, [products[0]!]);
    expect(layout.racks.some((r) => r.id === UNCOLLECTED_RACK_ID)).toBeTrue();
    expect(layout.racks.find((r) => r.id === UNCOLLECTED_RACK_ID)?.hangers).toEqual([]);
  });
});

describe('resolveProductRackId', () => {
  const known = new Set(['organic-dreams']);

  it('prefers an explicit collectionSlugs match', () => {
    expect(
      resolveProductRackId({ slug: 'a', name: 'A', collectionSlugs: ['organic-dreams'] }, known),
    ).toBe('organic-dreams');
  });

  it('falls back to Sem coleção', () => {
    expect(resolveProductRackId({ slug: 'a', name: 'A' }, known)).toBe(UNCOLLECTED_RACK_ID);
  });
});

describe('toSceneHanger / primaryImageUrl', () => {
  it('prefers isPrimary media over sortOrder and thumb', () => {
    expect(
      primaryImageUrl({
        slug: 'a',
        name: 'A',
        media: [
          { cdnUrl: 'second.jpg', sortOrder: 0 },
          { cdnUrl: 'primary.jpg', sortOrder: 2, isPrimary: true },
        ],
        thumb: 'thumb.jpg',
      }),
    ).toBe('primary.jpg');
  });

  it('uses thumb when media has no primary or thumb role', () => {
    expect(
      primaryImageUrl({
        slug: 'a',
        name: 'A',
        media: [{ cdnUrl: 'gallery.jpg', role: 'gallery', sortOrder: 0 }],
        thumb: 'thumb.jpg',
      }),
    ).toBe('thumb.jpg');
  });

  it('clamps stock and defaults status', () => {
    const hanger = toSceneHanger({ slug: 'a', name: '  A  ', stockQty: -3 }, 'r');
    expect(hanger.stockQty).toBe(0);
    expect(hanger.status).toBe('published');
    expect(hanger.name).toBe('A');
  });
});

describe('replaceHanger', () => {
  it('updates a hanger without rebuilding sibling racks', () => {
    const layout = mapCatalogToScene(
      [{ slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 }],
      [
        { slug: 'a', name: 'A', collectionSlug: 'organic-dreams', stockQty: 1 },
        { slug: 'b', name: 'B', collectionSlug: 'organic-dreams', stockQty: 2 },
      ],
    );
    const next = toSceneHanger(
      { slug: 'a', name: 'A editada', collectionSlug: 'organic-dreams', stockQty: 9, status: 'draft' },
      'organic-dreams',
    );
    const updated = replaceHanger(layout, next);
    expect(updated.racks[0]?.hangers.find((h) => h.slug === 'a')?.name).toBe('A editada');
    expect(updated.racks[0]?.hangers.find((h) => h.slug === 'a')?.stockQty).toBe(9);
    expect(updated.racks[0]?.hangers.find((h) => h.slug === 'b')?.name).toBe('B');
  });
});
