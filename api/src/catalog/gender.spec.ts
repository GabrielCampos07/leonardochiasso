import { BadRequestException } from '@nestjs/common';
import {
  GENDER_LIST_REQUIRED_MESSAGE,
  listsForProductGender,
  matchesGenderList,
  orderCollectionMembersByGenderBlocks,
  orderIdsByGenderList,
  parseGenderList,
  parseOptionalGenderList,
  sortByPublicGenderBlocks,
} from './gender';

describe('gender helpers', () => {
  it('accepts only feminino|masculino as list filters', () => {
    expect(parseGenderList('feminino')).toBe('feminino');
    expect(parseGenderList('masculino')).toBe('masculino');
    expect(() => parseGenderList(undefined)).toThrow(BadRequestException);
    expect(() => parseGenderList('unissex')).toThrow(GENDER_LIST_REQUIRED_MESSAGE);
    expect(() => parseGenderList('outro')).toThrow(GENDER_LIST_REQUIRED_MESSAGE);
    expect(parseOptionalGenderList(undefined)).toBeUndefined();
    expect(parseOptionalGenderList('')).toBeUndefined();
  });

  it('puts unissex on both lists and matches either filter', () => {
    expect(listsForProductGender('feminino')).toEqual(['feminino']);
    expect(listsForProductGender('masculino')).toEqual(['masculino']);
    expect(listsForProductGender('unissex')).toEqual(['feminino', 'masculino']);
    expect(listsForProductGender('outro')).toEqual([]);
    expect(matchesGenderList('unissex', 'feminino')).toBe(true);
    expect(matchesGenderList('unissex', 'masculino')).toBe(true);
    expect(matchesGenderList('masculino', 'feminino')).toBe(false);
  });

  it('orders stored ids first and appends missing by ProductCollection.sortOrder', () => {
    const fallback = new Map([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
    expect(
      orderIdsByGenderList(
        ['a', 'b', 'c'],
        [
          { productId: 'c', sortOrder: 0 },
          { productId: 'a', sortOrder: 1 },
        ],
        fallback,
      ),
    ).toEqual(['c', 'a', 'b']);
  });

  it('store listing: feminino+unissex then masculino, each by recommendOrder; unissex once', () => {
    const products = [
      { id: 'm1', gender: 'masculino', recommendOrder: 1 },
      { id: 'u1', gender: 'unissex', recommendOrder: 50 },
      { id: 'f2', gender: 'feminino', recommendOrder: 20 },
      { id: 'f1', gender: 'feminino', recommendOrder: 10 },
      { id: 'm2', gender: 'masculino', recommendOrder: 2 },
    ];
    expect(sortByPublicGenderBlocks(products).map((p) => p.id)).toEqual([
      'f1',
      'f2',
      'u1',
      'm1',
      'm2',
    ]);
  });

  it('collection page: feminino block (incl. unissex) then masculino only', () => {
    const members = [
      { productId: 'm1', sortOrder: 0, gender: 'masculino' },
      { productId: 'u1', sortOrder: 1, gender: 'unissex' },
      { productId: 'f1', sortOrder: 2, gender: 'feminino' },
      { productId: 'm2', sortOrder: 3, gender: 'masculino' },
    ];
    const stored = [
      { productId: 'u1', gender: 'feminino', sortOrder: 0 },
      { productId: 'f1', gender: 'feminino', sortOrder: 1 },
      { productId: 'm2', gender: 'masculino', sortOrder: 0 },
      { productId: 'm1', gender: 'masculino', sortOrder: 1 },
      { productId: 'u1', gender: 'masculino', sortOrder: 2 },
    ];
    expect(
      orderCollectionMembersByGenderBlocks(members, stored).map((m) => m.productId),
    ).toEqual(['u1', 'f1', 'm2', 'm1']);
  });
});
