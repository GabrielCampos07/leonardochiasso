import { ART_PIECES } from '../core/arte.data';
import {
  SceneCollectionInput,
  SceneLayout,
  SceneProductInput,
} from './types';

export const ARTE_COLLECTION_SLUG = 'arte';
export const CASA_COLLECTION_SLUG = 'casa';
export const CASA_COMING_SOON_TEXT = 'Em breve';

export const STUDIO_LINE_COLLECTIONS: readonly SceneCollectionInput[] = [
  { slug: ARTE_COLLECTION_SLUG, name: 'Arte', sortOrder: 90, publishedAt: null },
  { slug: CASA_COLLECTION_SLUG, name: 'Casa', sortOrder: 91, publishedAt: null },
];

const EDITORIAL_ART_SLUGS = new Set(ART_PIECES.map((piece) => piece.slug));

export function isEditorialArtSlug(slug: string): boolean {
  return EDITORIAL_ART_SLUGS.has(slug);
}

/** Drop editorial hangers that were never saved as collection members. */
export function omitEditorialArtFromLiveOrder(
  liveOrdered: readonly string[],
  membership: readonly string[],
): string[] {
  const members = new Set(membership);
  return liveOrdered.filter((slug) => members.has(slug) || !isEditorialArtSlug(slug));
}

/** Inject Arte / Casa when the admin list is missing them (API not deployed yet). */
export function mergeStudioLineCollections(
  collections: readonly SceneCollectionInput[],
): SceneCollectionInput[] {
  const next = [...collections];
  const have = new Set(next.map((c) => c.slug));
  for (const row of STUDIO_LINE_COLLECTIONS) {
    if (!have.has(row.slug)) next.push({ ...row });
  }
  return next;
}

/** Hang the public /arte works on the Arte rack when they are not catalog products. */
export function mergeArtProducts(
  products: readonly SceneProductInput[],
): SceneProductInput[] {
  const have = new Set(products.map((p) => p.slug));
  const editorial = ART_PIECES.filter((piece) => !have.has(piece.slug)).map((piece, index) => {
    const image = piece.image ?? piece.images?.[0] ?? null;
    return {
      slug: piece.slug,
      name: piece.title,
      collectionSlug: ARTE_COLLECTION_SLUG,
      collectionSlugs: [ARTE_COLLECTION_SLUG],
      collectionOrders: [{ slug: ARTE_COLLECTION_SLUG, sortOrder: index }],
      thumb: image,
      imageUrl: image,
      status: 'published',
      stockQty: 1,
      priceLabel: piece.priceLabel,
    } satisfies SceneProductInput;
  });
  return editorial.length ? [...products, ...editorial] : [...products];
}

export function markComingSoonRacks(layout: SceneLayout): SceneLayout {
  return {
    racks: layout.racks.map((rack) =>
      rack.id === CASA_COLLECTION_SLUG && rack.hangers.length === 0
        ? { ...rack, comingSoon: true }
        : rack,
    ),
  };
}

export function stockroomCountLabel(count: number, comingSoon = false): string {
  if (comingSoon) return CASA_COMING_SOON_TEXT;
  return count === 1 ? '1 peça' : `${count} peças`;
}
