import { mapProduct } from './catalog.mapper';

describe('mapProduct collection badges', () => {
  function product(over: Record<string, unknown> = {}) {
    return {
      id: 'p1',
      slug: 'vestido',
      name: 'Vestido',
      description: '',
      details: [],
      shippingCopy: null,
      priceCents: 100,
      currency: 'BRL',
      color: null,
      size: null,
      fabric: null,
      season: null,
      status: 'published',
      stockQty: 1,
      categoryId: 'c1',
      pieces: [],
      colorVariants: [],
      imageBindings: [],
      artCouture: false,
      recommendOrder: 0,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { slug: 'feminino' },
      collections: [],
      media: [],
      ...over,
    } as never;
  }

  it('hides archived collections from the badge label and keeps the join in collections', () => {
    const dto = mapProduct(
      product({
        collections: [
          {
            collection: {
              slug: 'teste-col-ux-r',
              name: 'TESTE-COL-UX-R',
              archivedAt: new Date('2026-10-12T12:00:00Z'),
            },
          },
          {
            collection: {
              slug: 'organic-dreams',
              name: 'Organic Dreams',
              archivedAt: null,
            },
          },
        ],
      }),
    );
    expect(dto.collection).toBe('Organic Dreams');
    expect(dto.collections.map((c) => c.slug)).toEqual([
      'teste-col-ux-r',
      'organic-dreams',
    ]);
    expect(dto.collections[0]?.archivedAt).toBe('2026-10-12T12:00:00.000Z');
  });
});
