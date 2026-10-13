import { collectionSelectLabel, parseStockQty } from './admin-product-form';

describe('parseStockQty', () => {
  it('keeps integers at or above zero', () => {
    expect(parseStockQty(0)).toBe(0);
    expect(parseStockQty(12)).toBe(12);
    expect(parseStockQty('8')).toBe(8);
  });

  it('clamps negatives and rounds fractions', () => {
    expect(parseStockQty(-3)).toBe(0);
    expect(parseStockQty(2.6)).toBe(3);
    expect(parseStockQty('')).toBe(0);
    expect(parseStockQty(null)).toBe(0);
  });
});

describe('collectionSelectLabel', () => {
  it('shows the collection name instead of the slug for custom collections', () => {
    expect(collectionSelectLabel('teste-col-capa', 'Teste col capa')).toBe('Teste col capa');
    expect(
      collectionSelectLabel('teste-col-capa', 'teste-col-capa', [
        { slug: 'teste-col-capa', name: 'Teste col capa' },
      ]),
    ).toBe('Teste col capa');
  });

  it('keeps official collection labels', () => {
    expect(collectionSelectLabel('organic-dreams')).toBe('Organic Dreams');
  });
});
