import { parseStockQty } from './admin-product-form';

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
