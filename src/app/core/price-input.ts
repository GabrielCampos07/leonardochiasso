/** pt-BR price text: comma is always decimal; a `.` + 3 digits is thousands. */

export const PRICE_REQUIRED_MESSAGE = 'Informe o preço.';
export const PRICE_INVALID_MESSAGE = 'Preço inválido.';
export const PRICE_NEGATIVE_MESSAGE = 'Preço não pode ser negativo.';
export const PRICE_AMBIGUOUS_MESSAGE =
  'Preço ambíguo. Use 1,25 para centavos ou 1.250 para milhar.';
export const PRICE_DECIMALS_MESSAGE = 'Use no máximo 2 casas decimais.';
export const PRICE_MAX_MESSAGE = 'Preço máximo: R$ 9.999.999,99.';
export const PRICE_MAX_CENTS = 999_999_999;
export const PRICE_MAX_REAIS = 9_999_999.99;

export type PriceParseOk = { ok: true; reais: number };
export type PriceParseErr = { ok: false; error: string; reais?: number };
export type PriceParseResult = PriceParseOk | PriceParseErr;

/**
 * Parse admin price text.
 * - `,` is the decimal separator (`12,50` = 12.50), except `,` + exactly 3 digits
 *   (`1,250`) which is ambiguous and rejected.
 * - `.` followed by exactly 3 digits is thousands (`14.800` = 14800, `1.250.000` = 1250000).
 * - `.` followed by 1–2 digits is decimal (`12.50` = 12.50, `12.5` = 12.50).
 * - Leading `R$` and surrounding spaces are stripped; spaces inside the number are rejected.
 * - More than 2 decimal digits is rejected. Max is R$ 9.999.999,99.
 */
export function parsePricePtBr(raw: string | number | null | undefined): PriceParseResult {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, error: PRICE_INVALID_MESSAGE };
    if (raw < 0 || Object.is(raw, -0)) return { ok: false, error: PRICE_NEGATIVE_MESSAGE };
    return finishParsed(raw);
  }

  const text = String(raw ?? '')
    .replace(/^\s*R\$\s*/i, '')
    .trim();
  if (!text) return { ok: false, error: PRICE_REQUIRED_MESSAGE };
  if (/\s/.test(text)) return { ok: false, error: PRICE_INVALID_MESSAGE };
  if (/[^\d.,-]/.test(text)) return { ok: false, error: PRICE_INVALID_MESSAGE };

  const compact = text;
  if (!compact || compact === '-' || compact === ',' || compact === '.') {
    return { ok: false, error: PRICE_INVALID_MESSAGE };
  }

  const sign = compact.startsWith('-') ? '-' : '';
  const body = sign ? compact.slice(1) : compact;
  if (!body || body.startsWith('-')) return { ok: false, error: PRICE_INVALID_MESSAGE };

  let normalized: string | null;
  const commaCount = (body.match(/,/g) ?? []).length;
  if (commaCount > 1) return { ok: false, error: PRICE_INVALID_MESSAGE };

  if (commaCount === 1) {
    const [intRaw = '', decRaw = ''] = body.split(',');
    if (!decRaw || !/^\d+$/.test(decRaw) || decRaw.includes('.')) {
      return { ok: false, error: PRICE_INVALID_MESSAGE };
    }
    if (decRaw.length === 3) {
      return { ok: false, error: PRICE_AMBIGUOUS_MESSAGE };
    }
    if (decRaw.length > 2) {
      return { ok: false, error: PRICE_DECIMALS_MESSAGE };
    }
    const integer = stripThousandsDots(intRaw);
    if (integer == null) return { ok: false, error: PRICE_INVALID_MESSAGE };
    normalized = `${sign}${integer}.${decRaw}`;
  } else if (body.includes('.')) {
    const parts = body.split('.');
    const last = parts[parts.length - 1] ?? '';
    if (last.length === 1 || last.length === 2) {
      const integer = stripThousandsDots(parts.slice(0, -1).join('.'));
      if (integer == null) return { ok: false, error: PRICE_INVALID_MESSAGE };
      normalized = `${sign}${integer}.${last}`;
    } else if (last.length === 3) {
      const integer = stripThousandsDots(body);
      if (integer == null) return { ok: false, error: PRICE_INVALID_MESSAGE };
      normalized = `${sign}${integer}`;
    } else if (last.length > 3) {
      return { ok: false, error: PRICE_DECIMALS_MESSAGE };
    } else {
      return { ok: false, error: PRICE_INVALID_MESSAGE };
    }
  } else {
    if (!/^\d+$/.test(body)) return { ok: false, error: PRICE_INVALID_MESSAGE };
    normalized = `${sign}${body}`;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: PRICE_INVALID_MESSAGE };
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false, error: PRICE_INVALID_MESSAGE };
  if (sign === '-' || n < 0 || Object.is(n, -0)) {
    return { ok: false, error: PRICE_NEGATIVE_MESSAGE };
  }
  return finishParsed(n);
}

function finishParsed(reais: number): PriceParseResult {
  const cents = Math.round(reais * 100);
  if (cents > PRICE_MAX_CENTS) {
    return { ok: false, error: PRICE_MAX_MESSAGE, reais: cents / 100 };
  }
  return { ok: true, reais: cents / 100 };
}

/** Each `.` in the integer part must be followed by exactly 3 digits. */
function stripThousandsDots(intPart: string): string | null {
  if (!intPart) return null;
  if (!intPart.includes('.')) {
    return /^\d+$/.test(intPart) ? intPart : null;
  }
  const groups = intPart.split('.');
  if (!groups[0] || !/^\d+$/.test(groups[0])) return null;
  for (let i = 1; i < groups.length; i++) {
    if (!/^\d{3}$/.test(groups[i] ?? '')) return null;
  }
  return groups.join('');
}

export function priceInputError(raw: string | number | null | undefined): string {
  const parsed = parsePricePtBr(raw);
  return parsed.ok ? '' : parsed.error;
}

/** Unambiguous pt-BR: 14800 → "14.800,00". */
export function formatPriceInput(reais: number): string {
  if (!Number.isFinite(reais)) return '';
  return formatPriceCentsInput(Math.round(reais * 100));
}

/** 1480000 cents → "14.800,00". */
export function formatPriceCentsInput(cents: number): string {
  if (!Number.isFinite(cents)) return '';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const intPart = String(Math.floor(abs / 100));
  const dec = String(abs % 100).padStart(2, '0');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${withThousands},${dec}`;
}
