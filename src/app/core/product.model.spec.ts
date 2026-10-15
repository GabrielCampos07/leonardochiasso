import { formatAdminPriceLabel, formatPriceLabel } from './product.model';
import { PRODUCTS } from './products';

function asBrl(label: string): string {
  return label.replace(/\u00a0/g, ' ');
}

describe('formatPriceLabel (public site)', () => {
  it('shows 1480000 cents as R$ 14.800 without ,00', () => {
    expect(asBrl(formatPriceLabel(1_480_000 / 100))).toBe('R$ 14.800');
  });

  it('shows 1250 cents as R$ 12,50', () => {
    expect(asBrl(formatPriceLabel(1250 / 100))).toBe('R$ 12,50');
  });

  it('shows 0, 0,01 and 1.000 without trailing ,00 on whole reais', () => {
    expect(asBrl(formatPriceLabel(0))).toBe('R$ 0');
    expect(asBrl(formatPriceLabel(0.01))).toBe('R$ 0,01');
    expect(asBrl(formatPriceLabel(1000))).toBe('R$ 1.000');
  });
});

describe('formatAdminPriceLabel (admin preview)', () => {
  it('shows 1480000 cents as R$ 14.800,00', () => {
    expect(asBrl(formatAdminPriceLabel(1_480_000 / 100))).toBe('R$ 14.800,00');
  });

  it('shows 0, 0,01 and 1.000 with two decimals', () => {
    expect(asBrl(formatAdminPriceLabel(0))).toBe('R$ 0,00');
    expect(asBrl(formatAdminPriceLabel(0.01))).toBe('R$ 0,01');
    expect(asBrl(formatAdminPriceLabel(1000))).toBe('R$ 1.000,00');
  });
});

describe('PRODUCTS fallback catalog', () => {
  it('uses formatPriceLabel for stored prices', () => {
    const first = PRODUCTS[0]!;
    expect(asBrl(first.priceLabel)).toBe(asBrl(formatPriceLabel(first.price)));
    const withPiece = PRODUCTS.find((p) => p.pieces?.length);
    const piece = withPiece?.pieces?.[0];
    if (piece) {
      expect(asBrl(piece.priceLabel)).toBe(asBrl(formatPriceLabel(piece.price)));
    }
  });
});
