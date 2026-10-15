import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PRODUCT_GENDER_MESSAGE } from '../../catalog/gender';
import {
  CollectionGenderQueryDto,
  CreateProductDto,
  ReorderCollectionGenderDto,
  SetCollectionProductsDto,
  UpdateProductDto,
} from './admin-products.dto';

const baseCreate = {
  name: 'Peça',
  slug: 'peca',
  collectionSlug: 'organic-dreams',
  priceCents: 1000,
};

describe('admin product gender DTO', () => {
  it('accepts feminino, masculino and unissex on create', async () => {
    for (const category of ['feminino', 'masculino', 'unissex'] as const) {
      const dto = plainToInstance(CreateProductDto, { ...baseCreate, category });
      expect(await validate(dto)).toEqual([]);
    }
  });

  it('rejects unknown gender on create and update', async () => {
    const create = plainToInstance(CreateProductDto, {
      ...baseCreate,
      category: 'outro',
    });
    const createErrors = await validate(create);
    expect(createErrors[0]?.constraints).toEqual(
      expect.objectContaining({ isIn: PRODUCT_GENDER_MESSAGE }),
    );

    const update = plainToInstance(UpdateProductDto, { category: 'kids' });
    const updateErrors = await validate(update);
    expect(updateErrors[0]?.constraints).toEqual(
      expect.objectContaining({ isIn: PRODUCT_GENDER_MESSAGE }),
    );
  });

  it('requires gender=feminino|masculino on the order query', async () => {
    expect(await validate(plainToInstance(CollectionGenderQueryDto, { gender: 'feminino' }))).toEqual([]);
    expect(await validate(plainToInstance(CollectionGenderQueryDto, { gender: 'masculino' }))).toEqual([]);

    const missing = await validate(plainToInstance(CollectionGenderQueryDto, {}));
    expect(JSON.stringify(missing)).toContain(
      'gender is required and must be feminino or masculino.',
    );

    const unissex = await validate(
      plainToInstance(CollectionGenderQueryDto, { gender: 'unissex' }),
    );
    expect(JSON.stringify(unissex)).toContain(
      'gender is required and must be feminino or masculino.',
    );
  });

  it('rejects priceCents above R$ 9.999.999,99', async () => {
    const create = await validate(
      plainToInstance(CreateProductDto, { ...baseCreate, category: 'feminino', priceCents: 1_000_000_000 }),
    );
    expect(create.find((e) => e.property === 'priceCents')?.constraints?.max).toBe(
      'Preço máximo: R$ 9.999.999,99.',
    );

    const update = await validate(plainToInstance(UpdateProductDto, { priceCents: 1_000_000_000 }));
    expect(update.find((e) => e.property === 'priceCents')?.constraints?.max).toBe(
      'Preço máximo: R$ 9.999.999,99.',
    );

    const ok = await validate(
      plainToInstance(CreateProductDto, { ...baseCreate, category: 'feminino', priceCents: 999_999_999 }),
    );
    expect(ok.filter((e) => e.property === 'priceCents')).toEqual([]);
  });

  it('requires UUID productIds on the reorder body', async () => {
    const ok = await validate(
      plainToInstance(ReorderCollectionGenderDto, {
        productIds: ['3f1c2b4a-1234-4abc-8def-0123456789ab'],
      }),
    );
    expect(ok).toEqual([]);

    const bad = await validate(
      plainToInstance(ReorderCollectionGenderDto, { productIds: ['not-a-uuid'] }),
    );
    expect(bad.length).toBeGreaterThan(0);
  });

  it('rejects duplicate slugs on PUT /products', async () => {
    const ok = await validate(
      plainToInstance(SetCollectionProductsDto, { productSlugs: ['peca-a', 'peca-b'] }),
    );
    expect(ok).toEqual([]);

    const dup = await validate(
      plainToInstance(SetCollectionProductsDto, {
        productSlugs: ['peca-a', 'peca-a'],
      }),
    );
    expect(JSON.stringify(dup)).toContain('A lista de peças contém slugs repetidos.');
  });
});
