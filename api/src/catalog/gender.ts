import { BadRequestException } from '@nestjs/common';

export const PRODUCT_GENDERS = ['feminino', 'masculino', 'unissex'] as const;
export type ProductGender = (typeof PRODUCT_GENDERS)[number];

export const GENDER_LISTS = ['feminino', 'masculino'] as const;
export type GenderList = (typeof GENDER_LISTS)[number];

export const PRODUCT_GENDER_PATTERN = /^(feminino|masculino|unissex)$/;
export const GENDER_LIST_PATTERN = /^(feminino|masculino)$/;

export const PRODUCT_GENDER_MESSAGE =
  'category must be feminino, masculino or unissex.';
export const GENDER_LIST_REQUIRED_MESSAGE =
  'gender is required and must be feminino or masculino.';

export function isProductGender(value: string): value is ProductGender {
  return (PRODUCT_GENDERS as readonly string[]).includes(value);
}

export function isGenderList(value: string): value is GenderList {
  return (GENDER_LISTS as readonly string[]).includes(value);
}

export function parseGenderList(value: string | undefined): GenderList {
  if (!value || !isGenderList(value)) {
    throw new BadRequestException(GENDER_LIST_REQUIRED_MESSAGE);
  }
  return value;
}

export function parseOptionalGenderList(
  value: string | undefined,
): GenderList | undefined {
  if (value == null || value === '') return undefined;
  return parseGenderList(value);
}

/** Lists a product belongs on. Unissex is on both admin gender lists. */
export function listsForProductGender(productGender: string): GenderList[] {
  if (productGender === 'unissex') return ['feminino', 'masculino'];
  if (productGender === 'feminino' || productGender === 'masculino') {
    return [productGender];
  }
  return [];
}

export function matchesGenderList(
  productGender: string,
  list: GenderList,
): boolean {
  return productGender === list || productGender === 'unissex';
}

/**
 * Stored gender-list order, then products not yet in the table by
 * ProductCollection.sortOrder (stable append).
 */
export function orderIdsByGenderList(
  memberIds: string[],
  stored: { productId: string; sortOrder: number }[],
  fallbackSort: Map<string, number>,
): string[] {
  const memberSet = new Set(memberIds);
  const seen = new Set<string>();
  const result: string[] = [];

  const storedSorted = [...stored].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const row of storedSorted) {
    if (!memberSet.has(row.productId) || seen.has(row.productId)) continue;
    result.push(row.productId);
    seen.add(row.productId);
  }

  const missing = memberIds
    .filter((id) => !seen.has(id))
    .sort((a, b) => {
      const fa = fallbackSort.get(a) ?? Number.MAX_SAFE_INTEGER;
      const fb = fallbackSort.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (fa !== fb) return fa - fb;
      return a.localeCompare(b);
    });

  return [...result, ...missing];
}

export function sortByRecommendOrder<
  T extends { recommendOrder?: number | null; createdAt?: Date | string | null },
>(a: T, b: T): number {
  const ra = a.recommendOrder ?? 9990;
  const rb = b.recommendOrder ?? 9990;
  if (ra !== rb) return ra - rb;
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ta - tb;
}

/**
 * Public store / collection: feminino block (feminino + unissex) then
 * masculino only. Unissex appears once, in the feminino block.
 */
export function sortByPublicGenderBlocks<
  T extends {
    gender?: string | null;
    category?: string | null;
    recommendOrder?: number | null;
    createdAt?: Date | string | null;
  },
>(products: T[]): T[] {
  const genderOf = (p: T) => p.gender ?? p.category ?? '';
  const feminino = products
    .filter((p) => {
      const g = genderOf(p);
      return g === 'feminino' || g === 'unissex';
    })
    .sort(sortByRecommendOrder);
  const masculino = products
    .filter((p) => genderOf(p) === 'masculino')
    .sort(sortByRecommendOrder);
  return [...feminino, ...masculino];
}

export function orderCollectionMembersByGenderBlocks<
  T extends { productId: string; sortOrder: number; gender: string },
>(
  members: T[],
  stored: { productId: string; gender: string; sortOrder: number }[],
): T[] {
  const byId = new Map(members.map((m) => [m.productId, m]));
  const femininoMembers = members.filter(
    (m) => m.gender === 'feminino' || m.gender === 'unissex',
  );
  const masculinoMembers = members.filter((m) => m.gender === 'masculino');

  const femininoIds = orderIdsByGenderList(
    femininoMembers.map((m) => m.productId),
    stored.filter((s) => s.gender === 'feminino'),
    new Map(femininoMembers.map((m) => [m.productId, m.sortOrder])),
  );
  const masculinoIds = orderIdsByGenderList(
    masculinoMembers.map((m) => m.productId),
    stored.filter((s) => s.gender === 'masculino'),
    new Map(masculinoMembers.map((m) => [m.productId, m.sortOrder])),
  );

  const ordered = [...femininoIds, ...masculinoIds]
    .map((id) => byId.get(id))
    .filter((m): m is T => m != null);

  const seen = new Set(ordered.map((m) => m.productId));
  const leftover = members
    .filter((m) => !seen.has(m.productId))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return [...ordered, ...leftover];
}
