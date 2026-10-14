import { isArchivedAt } from './admin-archive';
import { sortByRecommendOrder } from './recommend-order';

/** Piece gender from the catalog API. Unissex is a third value, not a hub. */
export type ProductGender = 'feminino' | 'masculino' | 'unissex';

/** Admin list filter. Masculino / Feminino both include unissex. */
export type GenderFilter = 'todos' | 'feminino' | 'masculino';

/** Public shop / collection block. Unissex always sits in the feminine block. */
export type PublicGenderBlock = 'feminino' | 'masculino';

export const GENDER_FILTER_OPTIONS: ReadonlyArray<{ value: GenderFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
];

export const PRODUCT_GENDER_OPTIONS: ReadonlyArray<{ value: ProductGender; label: string }> = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'unissex', label: 'Unissex' },
];

export const MASCULINO_UNISSEX_NOTICE =
  'peças unissex aparecem no site no bloco feminino';

export const TODOS_DRAG_HINT = 'Escolha Masculino ou Feminino para reordenar.';

export const GENDER_ORDER_UNDO_MS = 5000;
export const GENDER_ORDER_UNDO_LABEL = 'Desfazer';
export const GENDER_ORDER_SAVED_TEXT = 'Ordem atualizada.';
export const DRAG_START_DELAY_MS = 250;

export interface GenderedPiece {
  slug: string;
  gender?: string | null;
  category?: string | null;
  productId?: string | null;
  id?: string | null;
  archivedAt?: string | Date | null;
}

export function parseProductGender(value: string | null | undefined): ProductGender | null {
  if (value === 'feminino' || value === 'masculino' || value === 'unissex') return value;
  return null;
}

/** Prefer `gender`; fall back to storefront `category`. */
export function productGender(piece: GenderedPiece): ProductGender {
  return parseProductGender(piece.gender) ?? (piece.category === 'masculino' ? 'masculino' : 'feminino');
}

/** Hub / FK category: unissex maps to the feminine storefront. */
export function storefrontCategory(piece: GenderedPiece): 'feminino' | 'masculino' {
  return productGender(piece) === 'masculino' ? 'masculino' : 'feminino';
}

export function publicGenderBlock(piece: GenderedPiece): PublicGenderBlock {
  return productGender(piece) === 'masculino' ? 'masculino' : 'feminino';
}

export function matchesGenderFilter(piece: GenderedPiece, filter: GenderFilter): boolean {
  if (filter === 'todos') return true;
  const gender = productGender(piece);
  return gender === filter || gender === 'unissex';
}

/** Public hub: unissex appears only in feminine. */
export function matchesPublicGenderHub(
  piece: GenderedPiece,
  hub: PublicGenderBlock,
): boolean {
  return publicGenderBlock(piece) === hub;
}

export function canReorderWithFilter(
  filter: GenderFilter,
): filter is 'feminino' | 'masculino' {
  return filter === 'feminino' || filter === 'masculino';
}

/** API UUID when present; otherwise the storefront id / slug. */
export function orderProductId(piece: GenderedPiece): string {
  const id = piece.productId || piece.id || piece.slug;
  return String(id);
}

/** Live pieces only — archived rows must not appear in the reorder list or PUT body. */
export function livePiecesForOrder<T extends GenderedPiece>(list: readonly T[]): T[] {
  return list.filter((piece) => !isArchivedAt(piece.archivedAt));
}

export function orderProductIds(list: readonly GenderedPiece[]): string[] {
  return livePiecesForOrder(list).map(orderProductId);
}

export function applyProductIdOrder<T extends GenderedPiece>(list: T[], productIds: string[]): T[] {
  if (!productIds.length) return [...list];
  const rank = new Map(productIds.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ia = rank.get(orderProductId(a));
    const ib = rank.get(orderProductId(b));
    if (ia == null && ib == null) return 0;
    if (ia == null) return 1;
    if (ib == null) return -1;
    return ia - ib;
  });
}

/** True when every feminine-block piece (incl. unissex) is before every masculine piece. */
export function isFeminineThenMasculine(list: readonly GenderedPiece[]): boolean {
  let seenMasculine = false;
  for (const piece of list) {
    if (publicGenderBlock(piece) === 'masculino') {
      seenMasculine = true;
    } else if (seenMasculine) {
      return false;
    }
  }
  return true;
}

/**
 * Public shop / collection grouping.
 * If the list is already feminine-then-masculine (API gender order), keep it.
 * Otherwise group feminine + unissex, then masculine, each via `sortBlock`.
 */
export function groupShopProducts<T extends GenderedPiece>(
  list: readonly T[],
  sortBlock: (items: T[]) => T[] = sortByRecommendOrder,
): T[] {
  if (list.length === 0) return [];
  if (isFeminineThenMasculine(list)) return [...list];
  const feminine = list.filter((piece) => publicGenderBlock(piece) === 'feminino');
  const masculine = list.filter((piece) => publicGenderBlock(piece) === 'masculino');
  return [...sortBlock(feminine), ...sortBlock(masculine)];
}

export function coarsePointerDragDelay(delayMs = DRAG_START_DELAY_MS): number {
  if (typeof matchMedia !== 'function') return 0;
  try {
    return matchMedia('(pointer: coarse)').matches ? delayMs : 0;
  } catch {
    return 0;
  }
}
