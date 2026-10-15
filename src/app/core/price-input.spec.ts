import {
  PRICE_INVALID_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  parsePricePtBr,
  priceInputError,
} from './price-input';

describe('parsePricePtBr', () => {
  it('reads comma as the decimal separator and dots as thousands', () => {
    expect(parsePricePtBr('1.250,50')).toEqual({ ok: true, reais: 1250.5 });
    expect(parsePricePtBr('12,50')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('12.50')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('1.250')).toEqual({ ok: true, reais: 1250 });
    expect(parsePricePtBr(12.5)).toEqual({ ok: true, reais: 12.5 });
  });

  it('rejects empty, invalid, and negative values', () => {
    expect(parsePricePtBr('')).toEqual({ ok: false, error: PRICE_REQUIRED_MESSAGE });
    expect(parsePricePtBr('   ')).toEqual({ ok: false, error: PRICE_REQUIRED_MESSAGE });
    expect(parsePricePtBr('abc')).toEqual({ ok: false, error: PRICE_INVALID_MESSAGE });
    expect(parsePricePtBr('-12,50')).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
    expect(parsePricePtBr(-3)).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
    expect(priceInputError('12,50')).toBe('');
    expect(priceInputError('')).toBe(PRICE_REQUIRED_MESSAGE);
  });
});
