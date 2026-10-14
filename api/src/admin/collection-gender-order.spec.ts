import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

const FEM = '11111111-1111-4111-8111-111111111111';
const UNI = '22222222-2222-4222-8222-222222222222';
const MAS = '33333333-3333-4333-8333-333333333333';
const EXTRA = '44444444-4444-4444-8444-444444444444';

function collectionWithMembers() {
  return {
    id: 'col-1',
    slug: 'organic-dreams',
    products: [
      {
        productId: FEM,
        sortOrder: 2,
        product: { id: FEM, category: { slug: 'feminino' } },
      },
      {
        productId: UNI,
        sortOrder: 0,
        product: { id: UNI, category: { slug: 'unissex' } },
      },
      {
        productId: MAS,
        sortOrder: 1,
        product: { id: MAS, category: { slug: 'masculino' } },
      },
    ],
    genderOrders: [
      { productId: FEM, gender: 'feminino', sortOrder: 0 },
    ],
  };
}

describe('AdminCollectionsService gender order', () => {
  function make() {
    const tx = {
      collectionGenderOrder: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      collection: {
        findUnique: jest.fn().mockResolvedValue(collectionWithMembers()),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
      collectionGenderOrder: tx.collectionGenderOrder,
      product: tx.product,
    };
    return { service: new AdminCollectionsService(prisma as never), prisma, tx };
  }

  it('GET returns stored feminino order and appends missing unissex by sortOrder', async () => {
    const { service } = make();
    const result = await service.getGenderOrder('organic-dreams', 'feminino');
    expect(result).toEqual({
      collection: 'organic-dreams',
      gender: 'feminino',
      productIds: [FEM, UNI],
    });
  });

  it('GET masculino includes unissex and uses ProductCollection.sortOrder when table is empty', async () => {
    const { service, prisma } = make();
    prisma.collection.findUnique.mockResolvedValue({
      ...collectionWithMembers(),
      genderOrders: [],
    });
    const result = await service.getGenderOrder('organic-dreams', 'masculino');
    expect(result.productIds).toEqual([UNI, MAS]);
  });

  it('GET rejects missing or invalid gender', async () => {
    const { service } = make();
    await expect(service.getGenderOrder('organic-dreams', undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.getGenderOrder('organic-dreams', 'unissex')).rejects.toThrow(
      'gender is required and must be feminino or masculino.',
    );
  });

  it('GET 404s when the collection is missing', async () => {
    const { service, prisma } = make();
    prisma.collection.findUnique.mockResolvedValue(null);
    await expect(service.getGenderOrder('sumiu', 'feminino')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('PUT rewrites sortOrder 0..n-1 transactionally', async () => {
    const { service, tx } = make();
    const result = await service.setGenderOrder('organic-dreams', 'feminino', [
      UNI,
      FEM,
    ]);
    expect(result).toEqual({
      collection: 'organic-dreams',
      gender: 'feminino',
      productIds: [UNI, FEM],
    });
    expect(tx.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-1', gender: 'feminino' },
    });
    expect(tx.collectionGenderOrder.createMany).toHaveBeenCalledWith({
      data: [
        { collectionId: 'col-1', productId: UNI, gender: 'feminino', sortOrder: 0 },
        { collectionId: 'col-1', productId: FEM, gender: 'feminino', sortOrder: 1 },
      ],
    });
  });

  it('PUT rejects duplicates', async () => {
    const { service, tx } = make();
    await expect(
      service.setGenderOrder('organic-dreams', 'feminino', [FEM, FEM]),
    ).rejects.toThrow('A lista de peças contém itens repetidos.');
    expect(tx.collectionGenderOrder.deleteMany).not.toHaveBeenCalled();
  });

  it('PUT rejects ids that are not in the collection', async () => {
    const { service } = make();
    await expect(
      service.setGenderOrder('organic-dreams', 'feminino', [FEM, UNI, EXTRA]),
    ).rejects.toThrow(
      `Peças que não pertencem a esta coleção: ${EXTRA}`,
    );
  });

  it('PUT rejects a masculino piece on the feminino list', async () => {
    const { service } = make();
    await expect(
      service.setGenderOrder('organic-dreams', 'feminino', [FEM, UNI, MAS]),
    ).rejects.toThrow(
      `Peças fora do filtro feminino (aceita feminino ou unissex): ${MAS}`,
    );
  });

  it('PUT rejects a list that is missing a matching product', async () => {
    const { service } = make();
    await expect(
      service.setGenderOrder('organic-dreams', 'feminino', [FEM]),
    ).rejects.toThrow(
      `A ordem deve conter exatamente as peças ativas feminino (incluindo unissex) desta coleção (faltando ${UNI}).`,
    );
  });
});
