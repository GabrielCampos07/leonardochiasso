import { PRICES_ON_REQUEST } from '../core/pricing';
import { formatPriceLabel } from '../core/product.model';

export const HIDDEN_ON_SITE_SUFFIX = ' (oculto no site)';
export const PRICE_ON_INQUIRY_LABEL = 'Sob consulta';

export interface ScenePriceFields {
  price?: number | null;
  currentPrice?: number | null;
  promoPrice?: number | null;
  priceCents?: number | null;
  priceLabel?: string | null;
}

/** Prefer promo / current selling price, then the catalog price. */
export function resolveCurrentPrice(source: ScenePriceFields): number | null {
  for (const n of [source.promoPrice, source.currentPrice, source.price]) {
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
  }
  if (typeof source.priceCents === 'number' && Number.isFinite(source.priceCents) && source.priceCents > 0) {
    return source.priceCents / 100;
  }
  return null;
}

/** Same label in the admin list and the 3D tooltip. */
export function hangerPriceLabel(price?: number | null, label?: string | null): string {
  if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
    const formatted = formatPriceLabel(price);
    return PRICES_ON_REQUEST ? `${formatted}${HIDDEN_ON_SITE_SUFFIX}` : formatted;
  }
  const trimmed = label?.trim();
  if (trimmed && !isZeroPriceLabel(trimmed)) return trimmed;
  return PRICE_ON_INQUIRY_LABEL;
}

export function hangerPriceFromFields(source: ScenePriceFields): string {
  return hangerPriceLabel(resolveCurrentPrice(source), source.priceLabel);
}

export function formatHangerTooltip(name: string, priceLabel: string): string {
  return `${name} · ${priceLabel}`;
}

function isZeroPriceLabel(label: string): boolean {
  return /^r\$\s*0([.,]0+)?$/i.test(label.replace(/\s/g, ' ').trim());
}
