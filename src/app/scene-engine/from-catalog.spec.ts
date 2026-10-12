import { COLLECTION_SLUGS } from '../core/routes';
import { apiProductToSceneInput, joiaToSceneInput, productToSceneInput } from './from-catalog';
import { hangerPriceFromFields } from './hanger-price';

describe('from-catalog prices', () => {
  it('keeps the product current price and label', () => {
    const input = productToSceneInput({
      id: 'x',
      slug: 'blusa-laco',
      name: 'Blusa laço / calça cetim',
      price: 289,
      priceCents: 28900,
      priceLabel: 'R$ 289,00',
      color: '',
      size: '',
      fabric: '',
      season: '',
      description: '',
      details: [],
      shipping: '',
      thumb: '',
      gallery: [],
      category: 'feminino',
      collection: 'Organic Dreams',
      collectionSlug: COLLECTION_SLUGS.organicDreams,
      stockQty: 3,
    });
    expect(input.price).toBe(289);
    expect(hangerPriceFromFields(input)).toMatch(/R\$\s*289,00/);
  });

  it('reads priceCents and optional promo from the API dto', () => {
    const input = apiProductToSceneInput({
      id: '1',
      slug: 'blusa-laco',
      name: 'Blusa laço / calça cetim',
      description: '',
      details: [],
      shipping: null,
      priceCents: 40000,
      currency: 'BRL',
      color: null,
      size: null,
      fabric: null,
      season: null,
      stockQty: 2,
      category: 'feminino',
      collection: 'Organic Dreams',
      collections: [{ slug: 'organic-dreams', name: 'Organic Dreams' }],
      thumb: '',
      gallery: [],
      promoPrice: 289,
    } as never);
    expect(input.price).toBe(400);
    expect(input.promoPrice).toBe(289);
    expect(hangerPriceFromFields(input)).toMatch(/R\$\s*289,00/);
  });

  it('keeps jewelry editorial labels when there is no numeric price', () => {
    const input = joiaToSceneInput({
      id: 'colar',
      slug: 'colar-dentes',
      title: 'Colar Dentes',
      description: '',
      price: null,
      priceLabel: 'Sob medida',
    });
    expect(input.pieceKind).toBe('jewelry');
    expect(hangerPriceFromFields(input)).toBe('Sob medida');
  });
});
