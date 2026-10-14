import { BadRequestException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

const pc = (id: string, cat: string, archived = false, sortOrder = 0) => ({
  productId: id,
  sortOrder,
  product: { id, archivedAt: archived ? new Date() : null, category: { slug: cat } },
});

function setup() {
  const tx = {
    collectionGenderOrder: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
  const prisma = {
    collection: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1',
        slug: 'teste-colecao3',
        products: [pc('a', 'feminino', false, 0), pc('f1', 'feminino', true, 1), pc('u', 'unissex', false, 2), pc('m', 'masculino')],
        genderOrders: [],
      }),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { service: new AdminCollectionsService(prisma as never), tx };
}

describe('gender order ignores archived products', () => {
  it('GET excludes archived', async () => {
    const { service } = setup();
    const r = await service.getGenderOrder('teste-colecao3', 'feminino');
    expect(r.productIds).toEqual(['a', 'u']);
  });
  it('PUT accepts only active ids', async () => {
    const { service, tx } = setup();
    const r = await service.setGenderOrder('teste-colecao3', 'feminino', ['u', 'a']);
    expect(r.productIds).toEqual(['u', 'a']);
    expect(tx.collectionGenderOrder.createMany).toHaveBeenCalled();
  });
  it('PUT strips archived ids instead of 400', async () => {
    const { service } = setup();
    const r = await service.setGenderOrder('teste-colecao3', 'feminino', ['f1', 'a', 'u']);
    expect(r.productIds).toEqual(['a', 'u']);
  });
  it('PUT still 400s (PT) when an active piece is missing', async () => {
    const { service } = setup();
    await expect(service.setGenderOrder('teste-colecao3', 'feminino', ['a'])).rejects.toThrow(
      /faltando u/,
    );
    await expect(service.setGenderOrder('teste-colecao3', 'feminino', ['a'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
