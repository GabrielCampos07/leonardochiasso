import { mapApiProduct } from './catalog.service';

describe('mapApiProduct collection badges', () => {
  it('does not use an archived collection as the product badge', () => {
    const product = mapApiProduct({
      id: 'p1',
      slug: 'vestido',
      name: 'Vestido',
      description: '',
      details: [],
      shipping: null,
      priceCents: 10000,
      currency: 'BRL',
      color: null,
      size: null,
      fabric: null,
      season: null,
      category: 'feminino',
      collection: 'TESTE-COL-UX-R',
      collections: [
        { slug: 'teste-col-ux-r', name: 'TESTE-COL-UX-R', archivedAt: '2026-10-12T12:00:00.000Z' },
      ],
      thumb: '',
      gallery: [],
    });
    expect(product.collection).toBe('' as never);
    expect(product.collectionSlug).toBe('' as never);
  });
});
