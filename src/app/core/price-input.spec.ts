import {
  PRICE_INVALID_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  formatPriceCentsInput,
  formatPriceInput,
  parsePricePtBr,
  priceInputError,
} from './price-input';

describe('parsePricePtBr', () => {
  it('treats a dot followed by exactly 3 digits as thousands', () => {
    expect(parsePricePtBr('14.800')).toEqual({ ok: true, reais: 14800 });
    expect(parsePricePtBr('1.250.000')).toEqual({ ok: true, reais: 1_250_000 });
    expect(parsePricePtBr('1.250')).toEqual({ ok: true, reais: 1250 });
  });

  it('treats a dot followed by 1–2 digits as decimal and a comma as decimal', () => {
    expect(parsePricePtBr('12.50')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('12.5')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('12,50')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('1.250,50')).toEqual({ ok: true, reais: 1250.5 });
    expect(parsePricePtBr('14.800,00')).toEqual({ ok: true, reais: 14800 });
    expect(parsePricePtBr(12.5)).toEqual({ ok: true, reais: 12.5 });
  });

  it('rejects empty, invalid, and negative values', () => {
    expect(parsePricePtBr('')).toEqual({ ok: false, error: PRICE_REQUIRED_MESSAGE });
    expect(parsePricePtBr('   ')).toEqual({ ok: false, error: PRICE_REQUIRED_MESSAGE });
    expect(parsePricePtBr('abc')).toEqual({ ok: false, error: PRICE_INVALID_MESSAGE });
    expect(parsePricePtBr('14.80.0')).toEqual({ ok: false, error: PRICE_INVALID_MESSAGE });
    expect(parsePricePtBr('-12,50')).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
    expect(parsePricePtBr(-3)).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
    expect(priceInputError('12,50')).toBe('');
    expect(priceInputError('')).toBe(PRICE_REQUIRED_MESSAGE);
  });
});

describe('formatPriceCentsInput', () => {
  it('formats priceCents unambiguously in pt-BR', () => {
    expect(formatPriceCentsInput(1_480_000)).toBe('14.800,00');
    expect(formatPriceInput(14800)).toBe('14.800,00');
    expect(formatPriceCentsInput(1250)).toBe('12,50');
  });
});
