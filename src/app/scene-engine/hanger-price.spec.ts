import {
  formatHangerTooltip,
  hangerPriceFromFields,
  hangerPriceLabel,
  resolveCurrentPrice,
} from './hanger-price';

describe('hangerPriceLabel', () => {
  it('formats a numeric price in pt-BR', () => {
    expect(hangerPriceLabel(289)).toMatch(/R\$\s*289,00/);
    expect(hangerPriceLabel(0)).toMatch(/R\$\s*0,00/);
  });

  it('uses the existing label when there is no numeric price', () => {
    expect(hangerPriceLabel(null, 'Sob consulta')).toBe('Sob consulta');
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
