import { BadRequestException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

const pc = (id: string, cat: string, archived = false, sortOrder = 0) => ({
  productId: id,
  sortOrder,
  product: { id, archivedAt: archived ? new Date() : null, category: { slug: cat } },
});

function setup() {
  const collection = {
    id: 'c1',
    slug: 'teste-colecao3',
    products: [pc('a', 'feminino', false, 0), pc('f1', 'feminino', true, 1), pc('u', 'unissex', false, 2), pc('m', 'masculino')],
    genderOrders: [],
  };
  const tx = {
    collection: { findUnique: jest.fn().mockResolvedValue(collection) },
    collectionGenderOrder: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productCollection: { deleteMany: jest.fn(), createMany: jest.fn(), update: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ id: collection.id }]),
  };
  const prisma = {
    collection: { findUnique: jest.fn().mockResolvedValue(collection) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { service: new AdminCollectionsService(prisma as never), tx };
}

describe('gender order keeps archived pieces in position', () => {
  it('GET includes archived in membership order', async () => {
    const { service } = setup();
    const r = await service.getGenderOrder('teste-colecao3', 'feminino');
    expect(r.productIds).toEqual(['a', 'f1', 'u']);
  });
  it('PUT keeps archived in the per-gender copy', async () => {
    const { service, tx } = setup();
    const r = await service.setGenderOrder('teste-colecao3', 'feminino', ['u', 'f1', 'a']);
    expect(r.productIds).toEqual(['u', 'f1', 'a']);
    expect(tx.collectionGenderOrder.create).toHaveBeenCalled();
    expect(tx.collectionGenderOrder.createMany).not.toHaveBeenCalled();
  });
  it('PUT 400s when an archived piece is missing from the gender list', async () => {
    const { service, tx } = setup();
    await expect(
      service.setGenderOrder('teste-colecao3', 'feminino', ['u', 'a']),
    ).rejects.toThrow(/faltando f1/);
    expect(tx.productCollection.update).not.toHaveBeenCalled();
  });
  it('PUT still 400s (PT) when an active piece is missing', async () => {
    const { service } = setup();
    await expect(service.setGenderOrder('teste-colecao3', 'feminino', ['a'])).rejects.toThrow(
      /faltando/,
    );
    await expect(service.setGenderOrder('teste-colecao3', 'feminino', ['a'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
