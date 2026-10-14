import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProductDto, UpdateProductDto } from './admin-products.dto';

describe('stockQty validation', () => {
  it('rejects negative stock on update with PT message', () => {
    const errs = validateSync(plainToInstance(UpdateProductDto, { stockQty: -1 }));
    expect(errs[0]?.constraints?.min).toBe('Estoque não pode ser negativo.');
  });
  it('rejects negative stock on create', () => {
    const errs = validateSync(
      plainToInstance(CreateProductDto, {
        name: 'x', slug: 'x', category: 'feminino', collectionSlug: 'x', priceCents: 1, stockQty: -3,
      }),
    );
    expect(errs.find((e) => e.property === 'stockQty')).toBeDefined();
  });
  it('accepts zero', () => {
    expect(validateSync(plainToInstance(UpdateProductDto, { stockQty: 0 }))).toHaveLength(0);
  });
});
