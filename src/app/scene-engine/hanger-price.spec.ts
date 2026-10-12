import { PRICES_ON_REQUEST } from '../core/pricing';
import {
  HIDDEN_ON_SITE_SUFFIX,
  PRICE_ON_INQUIRY_LABEL,
  formatHangerTooltip,
  hangerPriceFromFields,
  hangerPriceLabel,
  resolveCurrentPrice,
} from './hanger-price';

describe('hangerPriceLabel', () => {
  it('formats a numeric price in pt-BR and marks it when hidden on the site', () => {
    expect(hangerPriceLabel(289)).toMatch(/R\$\s*289,00/);
    expect(hangerPriceLabel(7200)).toMatch(/R\$\s*7\.200,00/);
    if (PRICES_ON_REQUEST) {
      expect(hangerPriceLabel(7200)).toContain('oculto no site');
      expect(hangerPriceLabel(7200)).toContain(HIDDEN_ON_SITE_SUFFIX.trim());
    }
    expect(hangerPriceLabel(0)).toBe(PRICE_ON_INQUIRY_LABEL);
  });

  it('uses the existing label when there is no numeric price', () => {
    expect(hangerPriceLabel(null, 'Sob consulta')).toBe('Sob consulta');
    expect(hangerPriceLabel(null, 'Sob medida')).toBe('Sob medida');
    expect(hangerPriceLabel(null)).toBe(PRICE_ON_INQUIRY_LABEL);
  });
});

describe('resolveCurrentPrice', () => {
  it('prefers promo, then current, then catalog price', () => {
    expect(resolveCurrentPrice({ price: 400, currentPrice: 320, promoPrice: 289 })).toBe(289);
    expect(resolveCurrentPrice({ price: 400, currentPrice: 320 })).toBe(320);
    expect(resolveCurrentPrice({ price: 289 })).toBe(289);
    expect(resolveCurrentPrice({ priceCents: 28900 })).toBe(289);
  });
});

describe('hangerPriceFromFields', () => {
  it('uses the live current/promo price, not stock', () => {
    expect(hangerPriceFromFields({ price: 400, promoPrice: 289 })).toMatch(/R\$\s*289,00/);
    expect(hangerPriceFromFields({ priceLabel: 'Sob consulta' })).toBe('Sob consulta');
  });

  it('matches the admin list and the 3D tooltip', () => {
    const label = hangerPriceFromFields({ price: 7200 });
    expect(formatHangerTooltip('Vestido', label)).toBe(`Vestido · ${label}`);
    if (PRICES_ON_REQUEST) {
      expect(label).toMatch(/R\$\s*7\.200,00 \(oculto no site\)/);
    }
    expect(hangerPriceFromFields({ price: 0, priceLabel: '' })).toBe(PRICE_ON_INQUIRY_LABEL);
  });
});

describe('formatHangerTooltip', () => {
  it('joins name and BRL price', () => {
    expect(formatHangerTooltip('Blusa laço / calça cetim', hangerPriceLabel(289))).toBe(
      `Blusa laço / calça cetim · ${hangerPriceLabel(289)}`,
    );
    expect(formatHangerTooltip('Blusa laço / calça cetim', hangerPriceLabel(289))).toMatch(
      /Blusa laço \/ calça cetim · R\$\s*289,00/,
    );
  });
});
