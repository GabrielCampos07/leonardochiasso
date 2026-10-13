import {
  syncCollectionGenderOrders,
  syncProductGenderOrders,
} from './collection-gender-order.sync';

describe('CollectionGenderOrder sync', () => {
  it('appends a product to matching lists and removes it from lists it left', async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          category: { slug: 'masculino' },
          collections: [{ collectionId: 'col-1' }],
        }),
      },
      collectionGenderOrder: {
        findMany: jest.fn().mockResolvedValue([
          { collectionId: 'col-1', gender: 'feminino', sortOrder: 0 },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 3 } }),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    await syncProductGenderOrders(db as never, 'p1');

    expect(db.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: {
        productId: 'p1',
        OR: [{ collectionId: 'col-1', gender: 'feminino' }],
      },
    });
    expect(db.collectionGenderOrder.create).toHaveBeenCalledWith({
      data: {
        collectionId: 'col-1',
        productId: 'p1',
        gender: 'masculino',
        sortOrder: 4,
      },
    });
  });

  it('unissex appends to both lists of a collection when missing', async () => {
    const db = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'u1', category: { slug: 'unissex' } },
        ]),
      },
      collectionGenderOrder: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    await syncCollectionGenderOrders(db as never, 'col-1', ['u1']);

    expect(db.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-1', productId: { notIn: ['u1'] } },
    });
    expect(db.collectionGenderOrder.createMany).toHaveBeenCalledWith({
      data: [
        { collectionId: 'col-1', productId: 'u1', gender: 'feminino', sortOrder: 0 },
        { collectionId: 'col-1', productId: 'u1', gender: 'masculino', sortOrder: 0 },
      ],
    });
  });

  it('clears the table when a collection has no products', async () => {
    const db = {
      collectionGenderOrder: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    await syncCollectionGenderOrders(db as never, 'col-1', []);
    expect(db.collectionGenderOrder.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: 'col-1' },
    });
  });
});
