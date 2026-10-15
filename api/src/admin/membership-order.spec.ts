import {
  applyMembershipSortOrdersTwoPhase,
  mergeLiveOrderIntoMembership,
  rewriteDerivedGenderOrders,
  sortMembersBySortOrder,
  syncDerivedGenderOrders,
  tempSortOrder,
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

  it('two-phase membership swap parks A and B on temps before finals', async () => {
    const update = jest.fn().mockResolvedValue({});
    await applyMembershipSortOrdersTwoPhase(
      { productCollection: { update } },
      'col-teste',
      [
        { productId: 'id-a', sortOrder: 1 },
        { productId: 'id-b', sortOrder: 0 },
      ],
    );
    expect(update).toHaveBeenCalledTimes(4);
    expect(update.mock.calls.map((call) => call[0].data.sortOrder)).toEqual([
      tempSortOrder(1),
      tempSortOrder(0),
      1,
      0,
    ]);
  });

  it('two-phase membership rotate parks three rows before writing 0,1,2', async () => {
    const update = jest.fn().mockResolvedValue({});
    await applyMembershipSortOrdersTwoPhase(
      { productCollection: { update } },
      'col-teste',
      [
        { productId: 'id-a', sortOrder: 1 },
        { productId: 'id-b', sortOrder: 2 },
        { productId: 'id-c', sortOrder: 0 },
      ],
    );
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { productId_collectionId: { productId: 'id-a', collectionId: 'col-teste' } },
      data: { sortOrder: tempSortOrder(1) },
    });
    expect(update).toHaveBeenNthCalledWith(4, {
      where: { productId_collectionId: { productId: 'id-a', collectionId: 'col-teste' } },
      data: { sortOrder: 1 },
    });
    expect(update).toHaveBeenNthCalledWith(6, {
      where: { productId_collectionId: { productId: 'id-c', collectionId: 'col-teste' } },
      data: { sortOrder: 0 },
    });
    expect(update).toHaveBeenCalledTimes(6);
  });

  it('syncs a derived gender A<->B swap in two phases', async () => {
    const rows = [
      { productId: PLUMARIA, gender: 'feminino', sortOrder: 0 },
      { productId: CALCA, gender: 'feminino', sortOrder: 1 },
    ];
    const findMany = jest.fn().mockResolvedValue(rows);
    const create = jest.fn().mockResolvedValue({});
    const del = jest.fn().mockResolvedValue({});
    const update = jest.fn(
      async ({
        where,
        data,
      }: {
        where: {
          collectionId_gender_productId: { productId: string; gender: string };
        };
        data: { sortOrder: number };
      }) => {
        const row = rows.find(
          (item) =>
            item.productId === where.collectionId_gender_productId.productId &&
            item.gender === where.collectionId_gender_productId.gender,
        );
        if (!row) return null;
        const clash = rows.some((item) => item !== row && item.sortOrder === data.sortOrder);
        if (clash) throw new Error(`unique_sort_order: ${data.sortOrder}`);
        row.sortOrder = data.sortOrder;
        return row;
      },
    );
    await syncDerivedGenderOrders(
      { collectionGenderOrder: { findMany, create, update, delete: del } },
      'col-teste',
      [
        { productId: CALCA, gender: 'feminino' },
        { productId: PLUMARIA, gender: 'feminino' },
      ],
    );
    expect(create).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(4);
    expect(rows.map((row) => ({ productId: row.productId, sortOrder: row.sortOrder }))).toEqual([
      { productId: PLUMARIA, sortOrder: 1 },
      { productId: CALCA, sortOrder: 0 },
    ]);
  });
});
