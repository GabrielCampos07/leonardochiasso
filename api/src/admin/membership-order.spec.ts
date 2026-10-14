import {
  mergeLiveOrderIntoMembership,
  rewriteDerivedGenderOrders,
  sortMembersBySortOrder,
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
        { id: 'b', sortOrder: 2 },
        { id: 'a', sortOrder: 0 },
        { id: 'c', sortOrder: 1 },
      ]).map((row) => row.id),
    ).toEqual(['a', 'c', 'b']);
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
});
