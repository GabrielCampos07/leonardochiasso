import {
  mergeLiveOrderIntoMembership,
  rewriteDerivedGenderOrders,
  sortMembersBySortOrder,
  syncDerivedGenderOrders,
} from './membership-order';

const PLUMARIA = 'id-teste-plumaria';
const CALCA = 'id-teste-calca';
const ARQUIVO = 'id-teste-arquivo';

describe('membership-order (one collection order)', () => {
  it('merges a TESTE- gender list into the membership without dropping the rest', () => {
    const membership = [CALCA, ARQUIVO, PLUMARIA];
    expect(mergeLiveOrderIntoMembership(membership, [PLUMARIA, CALCA])).toEqual([
      PLUMARIA,
      ARQUIVO,
      CALCA,
    ]);
  });

  it('sorts junction rows by sortOrder', () => {
    expect(
      sortMembersBySortOrder([
        { productId: 'b', sortOrder: 2 },
        { productId: 'a', sortOrder: 0 },
        { productId: 'c', sortOrder: 1 },
      ]).map((row) => row.productId),
    ).toEqual(['a', 'c', 'b']);
  });

  it('breaks a sortOrder tie on productId', () => {
    expect(
      sortMembersBySortOrder([
        { productId: 'id-teste-z', sortOrder: 1 },
        { productId: 'id-teste-a', sortOrder: 1 },
        { productId: 'id-teste-m', sortOrder: 0 },
      ]).map((row) => row.productId),
    ).toEqual(['id-teste-m', 'id-teste-a', 'id-teste-z']);
  });

  it('rewrites derived gender rows from membership, unissex on both lists', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    await rewriteDerivedGenderOrders(
      { collectionGenderOrder: { deleteMany, createMany } },
      'col-teste',
      [
        { productId: PLUMARIA, gender: 'feminino' },
        { productId: 'id-teste-uni', gender: 'unissex' },
        { productId: 'id-teste-masc', gender: 'masculino' },
      ],
    );
    expect(deleteMany).toHaveBeenCalledWith({ where: { collectionId: 'col-teste' } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { collectionId: 'col-teste', productId: PLUMARIA, gender: 'feminino', sortOrder: 0 },
        { collectionId: 'col-teste', productId: 'id-teste-uni', gender: 'feminino', sortOrder: 1 },
        { collectionId: 'col-teste', productId: 'id-teste-uni', gender: 'masculino', sortOrder: 0 },
        { collectionId: 'col-teste', productId: 'id-teste-masc', gender: 'masculino', sortOrder: 1 },
      ],
    });
  });

  it('syncs only changed derived gender rows', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { productId: PLUMARIA, gender: 'feminino', sortOrder: 0 },
      { productId: 'id-teste-old', gender: 'feminino', sortOrder: 1 },
    ]);
    const create = jest.fn().mockResolvedValue({});
    const update = jest.fn().mockResolvedValue({});
    const del = jest.fn().mockResolvedValue({});
    await syncDerivedGenderOrders(
      { collectionGenderOrder: { findMany, create, update, delete: del } },
      'col-teste',
      [
        { productId: PLUMARIA, gender: 'feminino' },
        { productId: 'id-teste-uni', gender: 'unissex' },
      ],
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith({
      where: {
        collectionId_gender_productId: {
          collectionId: 'col-teste',
          gender: 'feminino',
          productId: 'id-teste-old',
        },
      },
    });
  });
});
