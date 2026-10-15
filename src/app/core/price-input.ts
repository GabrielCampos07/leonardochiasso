/** pt-BR price text: comma is decimal, dots are thousands. "12.50" is still 12.50. */

export const PRICE_REQUIRED_MESSAGE = 'Informe o preço.';
export const PRICE_INVALID_MESSAGE = 'Preço inválido.';
export const PRICE_NEGATIVE_MESSAGE = 'Preço não pode ser negativo.';

export type PriceParseOk = { ok: true; reais: number };
export type PriceParseErr = { ok: false; error: string };
export type PriceParseResult = PriceParseOk | PriceParseErr;

export function parsePricePtBr(raw: string | number | null | undefined): PriceParseResult {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, error: PRICE_INVALID_MESSAGE };
    if (raw < 0) return { ok: false, error: PRICE_NEGATIVE_MESSAGE };
    return { ok: true, reais: raw };
  }

  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, error: PRICE_REQUIRED_MESSAGE };
  if (/[^\d.,\s-]/.test(text)) return { ok: false, error: PRICE_INVALID_MESSAGE };

  const compact = text.replace(/\s/g, '');
  if (!compact || compact === '-' || compact === ',' || compact === '.') {
    return { ok: false, error: PRICE_INVALID_MESSAGE };
  }

  let normalized: string;
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  if (hasComma) {
    if ((compact.match(/,/g) ?? []).length > 1) {
      return { ok: false, error: PRICE_INVALID_MESSAGE };
    }
    normalized = compact.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const parts = compact.split('.');
    const last = parts[parts.length - 1] ?? '';
    if (parts.length > 1 && last.length > 0 && last.length <= 2) {
      normalized = `${parts.slice(0, -1).join('')}.${last}`;
    } else {
      normalized = parts.join('');
    }
  } else {
    normalized = compact;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: PRICE_INVALID_MESSAGE };
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false, error: PRICE_INVALID_MESSAGE };
  if (n < 0) return { ok: false, error: PRICE_NEGATIVE_MESSAGE };
  return { ok: true, reais: n };
}

export function priceInputError(raw: string | number | null | undefined): string {
  const parsed = parsePricePtBr(raw);
  return parsed.ok ? '' : parsed.error;
}
