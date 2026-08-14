/**
 * Temporary boutique policy: all retail prices show as on-request.
 * Flip to false when numeric prices go live again.
 */
export const PRICES_ON_REQUEST = true;

export const PRICE_ON_REQUEST_LABEL = 'Preço sob consulta';

/** Label to show in UI (PLP, PDP, cart, wishlist). */
export function displayPriceLabel(fallback?: string | null): string {
  if (PRICES_ON_REQUEST) return PRICE_ON_REQUEST_LABEL;
  return fallback?.trim() || PRICE_ON_REQUEST_LABEL;
}
