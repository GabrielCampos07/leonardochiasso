import { formatPriceLabel } from '../core/product.model';

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
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  if (typeof source.priceCents === 'number' && Number.isFinite(source.priceCents)) {
    return source.priceCents / 100;
  }
  return null;
}

/** Admin 3D shows the live numeric price, not the storefront “sob consulta” policy. */
export function hangerPriceLabel(price?: number | null, label?: string | null): string {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return formatPriceLabel(price);
  }
  const trimmed = label?.trim();
  if (trimmed) return trimmed;
  return formatPriceLabel(0);
}

export function hangerPriceFromFields(source: ScenePriceFields): string {
  return hangerPriceLabel(resolveCurrentPrice(source), source.priceLabel);
}

export function formatHangerTooltip(name: string, priceLabel: string): string {
  return `${name} · ${priceLabel}`;
}
