import { hangerPriceFromFields } from './hanger-price';
import {
  SceneCollectionInput,
  SceneHanger,
  SceneLayout,
  SceneProductInput,
  SceneRack,
  UNCOLLECTED_RACK_ID,
  UNCOLLECTED_RACK_NAME,
  primaryImageUrl,
  thumbImageUrl,
} from './types';

export const VITRINE_SHELF_LIMIT = 3;
export const VITRINE_TRAYS_PER_SHELF = 4;
export const VITRINE_CAPACITY = VITRINE_SHELF_LIMIT * VITRINE_TRAYS_PER_SHELF;
export const GIOIELLI_COLLECTION_KEY = 'gioielli';
export const GIOIELLI_UNIT_NAME = 'Gioielli';

export function resolveProductRackId(
  product: SceneProductInput,
  knownRackIds: ReadonlySet<string>,
): string {
  const slugs = [
    ...(product.collectionSlugs ?? []),
    product.collectionSlug ?? '',
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  for (const slug of slugs) {
    if (knownRackIds.has(slug)) return slug;
  }
  return UNCOLLECTED_RACK_ID;
}

export function toSceneHanger(product: SceneProductInput, rackId: string): SceneHanger {
  return {
    productId: product.slug,
    slug: product.slug,
    name: product.name.trim() || product.slug,
    imageUrl: primaryImageUrl(product),
    thumbUrl: thumbImageUrl(product),
    stockQty: Math.max(0, Math.round(product.stockQty ?? 1)),
    priceLabel: hangerPriceFromFields(product),
    status: (product.status ?? 'published').toLowerCase(),
    rackId,
    kind: product.pieceKind === 'jewelry' ? 'jewelry' : 'garment',
  };
}

/**
 * One rack per clothing collection (sortOrder). "Sem coleção" only when it has hangers.
 * Jewelry is never placed on racks.
 */
export function mapCatalogToScene(
  collections: SceneCollectionInput[],
  products: SceneProductInput[],
): SceneLayout {
  const garments = products.filter((p) => p.pieceKind !== 'jewelry');
  const orderedCollections = [...collections].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  const racks: SceneRack[] = orderedCollections.map((c) => ({
    id: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    hangers: [],
    kind: 'rack',
  }));

  const uncollected: SceneRack = {
    id: UNCOLLECTED_RACK_ID,
    name: UNCOLLECTED_RACK_NAME,
    sortOrder: Number.MAX_SAFE_INTEGER,
    hangers: [],
    kind: 'rack',
  };

  const byId = new Map(racks.map((r) => [r.id, r]));
  const knownIds = new Set(orderedCollections.map((c) => c.slug));

  for (const product of garments) {
    if (!product.slug) continue;
    const rackId = resolveProductRackId(product, knownIds);
    const rack = byId.get(rackId) ?? uncollected;
    rack.hangers.push(toSceneHanger(product, rack.id));
  }

  if (uncollected.hangers.length) racks.push(uncollected);
  return { racks };
}

/** Jewelry collections become glass vitrines (max 3 shelves; overflow = sibling cases). */
export function mapJoiasToVitrines(
  collections: SceneCollectionInput[],
  joias: SceneProductInput[],
): SceneRack[] {
  const jewelry = joias.filter((p) => p.pieceKind === 'jewelry' || p.pieceKind == null);
  const byCollection = new Map<string, { name: string; sortOrder: number; pieces: SceneProductInput[] }>();
  const known = new Map(collections.map((c) => [c.slug, c]));

  for (const piece of jewelry) {
    if (!piece.slug) continue;
    const slug = piece.collectionSlug?.trim() || '';
    const col = slug && known.has(slug) ? known.get(slug)! : null;
    const key = col?.slug ?? GIOIELLI_COLLECTION_KEY;
    const bucket = byCollection.get(key) ?? {
      name: col?.name ?? GIOIELLI_UNIT_NAME,
      sortOrder: col?.sortOrder ?? Number.MAX_SAFE_INTEGER - 1,
      pieces: [],
    };
    bucket.pieces.push(piece);
    byCollection.set(key, bucket);
  }

  const units: SceneRack[] = [];
  const ordered = [...byCollection.entries()].sort((a, b) => {
    if (a[1].sortOrder !== b[1].sortOrder) return a[1].sortOrder - b[1].sortOrder;
    return a[1].name.localeCompare(b[1].name, 'pt-BR');
  });

  for (const [key, bucket] of ordered) {
    const chunks: SceneProductInput[][] = [];
    for (let i = 0; i < bucket.pieces.length; i += VITRINE_CAPACITY) {
      chunks.push(bucket.pieces.slice(i, i + VITRINE_CAPACITY));
    }
    chunks.forEach((chunk, index) => {
      const id = index === 0 ? `vitrine:${key}` : `vitrine:${key}:${index + 1}`;
      const name = chunks.length > 1 ? `${bucket.name} ${index + 1}` : bucket.name;
      units.push({
        id,
        name,
        sortOrder: bucket.sortOrder + index * 0.01,
        kind: 'vitrine',
        hangers: chunk.map((p) => toSceneHanger({ ...p, pieceKind: 'jewelry' }, id)),
      });
    });
  }
  return units;
}

export function mapAtelierToScene(
  collections: SceneCollectionInput[],
  products: SceneProductInput[],
  joias: SceneProductInput[] = [],
): SceneLayout {
  return {
    racks: [...mapCatalogToScene(collections, products).racks, ...mapJoiasToVitrines(collections, joias)],
  };
}

export function unitsOfKind(layout: SceneLayout, kind: SceneRack['kind']): SceneRack[] {
  return layout.racks.filter((r) => r.kind === kind);
}

/** Build the focused collection first; the rest mounts on idle after the first frame. */
export function racksForFirstFrame<T extends { id: string }>(
  racks: readonly T[],
  focusedId: string,
): { immediate: T[]; deferred: T[] } {
  if (!racks.length) return { immediate: [], deferred: [] };
  const focused = racks.find((r) => r.id === focusedId) ?? racks[0]!;
  return {
    immediate: [focused],
    deferred: racks.filter((r) => r.id !== focused.id),
  };
}

export function findHanger(layout: SceneLayout, slug: string): SceneHanger | undefined {
  for (const rack of layout.racks) {
    const found = rack.hangers.find((h) => h.slug === slug);
    if (found) return found;
  }
  return undefined;
}

/** Replace one hanger in-place; move it if the rack changed. */
export function replaceHanger(layout: SceneLayout, next: SceneHanger): SceneLayout {
  const racks = layout.racks.map((rack) => ({
    ...rack,
    hangers: rack.hangers.filter((h) => h.slug !== next.slug),
  }));
  const target = racks.find((r) => r.id === next.rackId) ?? racks.find((r) => r.id === UNCOLLECTED_RACK_ID);
  if (target) {
    target.hangers = [...target.hangers, next];
  }
  return { racks: racks.filter((r) => r.id !== UNCOLLECTED_RACK_ID || r.hangers.length > 0) };
}
