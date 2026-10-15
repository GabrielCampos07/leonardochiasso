import { formatAdminPriceLabel, formatPriceLabel } from './product.model';

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
});

describe('formatAdminPriceLabel (admin preview)', () => {
  it('shows 1480000 cents as R$ 14.800,00', () => {
    expect(asBrl(formatAdminPriceLabel(1_480_000 / 100))).toBe('R$ 14.800,00');
  });
});
