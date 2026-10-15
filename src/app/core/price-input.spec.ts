import {
  PRICE_AMBIGUOUS_MESSAGE,
  PRICE_DECIMALS_MESSAGE,
  PRICE_INVALID_MESSAGE,
  PRICE_MAX_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  formatPriceCentsInput,
  formatPriceInput,
  parsePricePtBr,
  priceInputError,
} from './price-input';

describe('parsePricePtBr', () => {
  it('parses "14800" as 14800.00', () => {
    expect(parsePricePtBr('14800')).toEqual({ ok: true, reais: 14800 });
  });

  it('parses "14.800" as 14800.00', () => {
    expect(parsePricePtBr('14.800')).toEqual({ ok: true, reais: 14800 });
  });

  it('parses "14.800,00" as 14800.00', () => {
    expect(parsePricePtBr('14.800,00')).toEqual({ ok: true, reais: 14800 });
  });

  it('parses "1.250" as 1250.00', () => {
    expect(parsePricePtBr('1.250')).toEqual({ ok: true, reais: 1250 });
  });

  it('parses "12,5" and "12.5" as 12.50', () => {
    expect(parsePricePtBr('12,5')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('12.5')).toEqual({ ok: true, reais: 12.5 });
  });

  it('strips "R$" and surrounding spaces from "R$ 14.800" and " 14.800 "', () => {
    expect(parsePricePtBr('R$ 14.800')).toEqual({ ok: true, reais: 14800 });
    expect(parsePricePtBr(' 14.800 ')).toEqual({ ok: true, reais: 14800 });
  });

  it('rejects "1,250" as ambiguous (comma followed by exactly 3 digits)', () => {
    expect(parsePricePtBr('1,250')).toEqual({ ok: false, error: PRICE_AMBIGUOUS_MESSAGE });
    expect(priceInputError('1,250')).toBe(PRICE_AMBIGUOUS_MESSAGE);
  });

  it('treats extra grouped thousands and mixed decimals', () => {
    expect(parsePricePtBr('1.250.000')).toEqual({ ok: true, reais: 1_250_000 });
    expect(parsePricePtBr('12.50')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('12,50')).toEqual({ ok: true, reais: 12.5 });
    expect(parsePricePtBr('1.250,50')).toEqual({ ok: true, reais: 1250.5 });
    expect(parsePricePtBr(12.5)).toEqual({ ok: true, reais: 12.5 });
  });

  it('parses "0" as 0.00', () => {
    expect(parsePricePtBr('0')).toEqual({ ok: true, reais: 0 });
    expect(parsePricePtBr('0,00')).toEqual({ ok: true, reais: 0 });
  });

  it('parses "0,01" as 0.01', () => {
    expect(parsePricePtBr('0,01')).toEqual({ ok: true, reais: 0.01 });
  });

  it('parses "1.000" as 1000.00', () => {
    expect(parsePricePtBr('1.000')).toEqual({ ok: true, reais: 1000 });
  });

  it('rejects values above R$ 9.999.999,99', () => {
    expect(parsePricePtBr('9.999.999,99')).toEqual({ ok: true, reais: 9_999_999.99 });
    expect(parsePricePtBr('10.000.000')).toEqual({ ok: false, error: PRICE_MAX_MESSAGE });
    expect(parsePricePtBr('10000000')).toEqual({ ok: false, error: PRICE_MAX_MESSAGE });
    expect(parsePricePtBr(10_000_000)).toEqual({ ok: false, error: PRICE_MAX_MESSAGE });
  });

  it('rejects "12,999" and "12,5000" with more than 2 decimal places', () => {
    expect(parsePricePtBr('12,999')).toEqual({ ok: false, error: PRICE_AMBIGUOUS_MESSAGE });
    expect(parsePricePtBr('12,5000')).toEqual({ ok: false, error: PRICE_DECIMALS_MESSAGE });
  });

  it('rejects spaces inside the number ("1 2")', () => {
    expect(parsePricePtBr('1 2')).toEqual({ ok: false, error: PRICE_INVALID_MESSAGE });
    expect(parsePricePtBr(' 14.800 ')).toEqual({ ok: true, reais: 14800 });
  });

  it('rejects "-0" as a negative', () => {
    expect(parsePricePtBr('-0')).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
    expect(parsePricePtBr('-0,00')).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
    expect(parsePricePtBr(-0)).toEqual({ ok: false, error: PRICE_NEGATIVE_MESSAGE });
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
