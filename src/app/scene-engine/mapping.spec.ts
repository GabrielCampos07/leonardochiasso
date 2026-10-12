import {
  VITRINE_CAPACITY,
  mapCatalogToScene,
  mapJoiasToVitrines,
  racksForFirstFrame,
  removeHangerFromLayout,
  removeUnitFromLayout,
  replaceHanger,
  resolveProductRackId,
  toSceneHanger,
} from './mapping';
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

  it('omits Sem coleção when it would be empty', () => {
    const layout = mapCatalogToScene(collections, [products[0]!]);
    expect(layout.racks.some((r) => r.id === UNCOLLECTED_RACK_ID)).toBeFalse();
  });

  it('maps the current BRL price onto hangers', () => {
    const layout = mapCatalogToScene(collections, [
      { slug: 'vestido', name: 'Vestido', collectionSlug: 'organic-dreams', price: 289, stockQty: 2 },
    ]);
    expect(layout.racks[0]?.hangers[0]?.priceLabel).toMatch(/R\$\s*289,00/);
  });

  it('prefers promo/current price over the list price', () => {
    const layout = mapCatalogToScene(collections, [
      {
        slug: 'blusa',
        name: 'Blusa laço / calça cetim',
        collectionSlug: 'organic-dreams',
        price: 400,
        promoPrice: 289,
        stockQty: 6,
      },
    ]);
    expect(layout.racks[0]?.hangers[0]?.priceLabel).toMatch(/R\$\s*289,00/);
    expect(layout.racks[0]?.hangers[0]?.stockQty).toBe(6);
  });

  it('keeps live pieces when a collection is archived and drops archived pieces', () => {
    const layout = mapCatalogToScene(
      [
        ...collections,
        { slug: 'gone', name: 'Gone', sortOrder: 9, archivedAt: '2026-10-12T12:00:00.000Z' },
      ],
      [
        { slug: 'vestido', name: 'Vestido', collectionSlug: 'organic-dreams', stockQty: 1 },
        { slug: 'arquivo', name: 'Arquivo', collectionSlug: 'organic-dreams', archivedAt: '2026-10-12' },
      ],
    );
    expect(layout.racks.map((r) => r.id)).toEqual(['organic-dreams', 'niponic-dreams']);
    expect(layout.racks[0]?.hangers.map((h) => h.slug)).toEqual(['vestido']);
  });

  it('never hangs jewelry on clothing racks', () => {
    const layout = mapCatalogToScene(collections, [
      { slug: 'anel', name: 'Anel', collectionSlug: 'organic-dreams', pieceKind: 'jewelry', price: 180 },
      { slug: 'vestido', name: 'Vestido', collectionSlug: 'organic-dreams', stockQty: 1 },
    ]);
    expect(layout.racks[0]?.hangers.map((h) => h.slug)).toEqual(['vestido']);
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

describe('racksForFirstFrame', () => {
  it('builds only the focused collection first', () => {
    const racks = [
      { id: 'organic-dreams', name: 'Organic Dreams' },
      { id: 'niponic-dreams', name: 'Niponic Dreams' },
      { id: 'sem-colecao', name: 'Sem coleção' },
    ];
    const split = racksForFirstFrame(racks, 'organic-dreams');
    expect(split.immediate.map((r) => r.id)).toEqual(['organic-dreams']);
    expect(split.deferred.map((r) => r.id)).toEqual(['niponic-dreams', 'sem-colecao']);
  });
});

describe('mapJoiasToVitrines', () => {
  it('puts jewelry on glass vitrines, never on clothing racks, and splits after 3 shelves', () => {
    const pieces = Array.from({ length: VITRINE_CAPACITY + 2 }, (_, i) => ({
      slug: `joia-${i}`,
      name: `Joia ${i}`,
      collectionSlug: 'organic-dreams',
      pieceKind: 'jewelry' as const,
      price: 180,
    }));
    const vitrines = mapJoiasToVitrines(
      [{ slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 }],
      pieces,
    );
    expect(vitrines.every((u) => u.kind === 'vitrine')).toBeTrue();
    expect(vitrines.length).toBe(2);
    expect(vitrines[0]?.hangers).toHaveSize(VITRINE_CAPACITY);
    expect(vitrines[1]?.hangers).toHaveSize(2);
    expect(vitrines[0]?.hangers[0]?.kind).toBe('jewelry');
    expect(vitrines[0]?.hangers[0]?.priceLabel).toMatch(/R\$\s*180,00/);
  });

  it('omits archived jewelry and archived jewelry collections', () => {
    const vitrines = mapJoiasToVitrines(
      [{ slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1, archivedAt: '2026-10-12' }],
      [
        { slug: 'viva', name: 'Viva', collectionSlug: 'organic-dreams', pieceKind: 'jewelry' },
        { slug: 'morta', name: 'Morta', pieceKind: 'jewelry', archivedAt: '2026-10-12' },
      ],
    );
    expect(vitrines.map((u) => u.id)).toEqual(['vitrine:gioielli']);
    expect(vitrines[0]?.hangers.map((h) => h.slug)).toEqual(['viva']);
  });
});

describe('archive layout helpers', () => {
  it('removes a hanger or a whole unit without rewriting other racks', () => {
    const layout = mapCatalogToScene(
      [{ slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1 }],
      [
        { slug: 'vestido', name: 'Vestido', collectionSlug: 'organic-dreams', stockQty: 1 },
        { slug: 'jaqueta', name: 'Jaqueta', collectionSlug: 'organic-dreams', stockQty: 1 },
      ],
    );
    const withoutHanger = removeHangerFromLayout(layout, 'vestido');
    expect(withoutHanger.racks[0]?.hangers.map((h) => h.slug)).toEqual(['jaqueta']);
    expect(removeUnitFromLayout(layout, 'organic-dreams').racks).toEqual([]);
  });
});
