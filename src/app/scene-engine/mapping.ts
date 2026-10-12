import {
  SceneCollectionInput,
  SceneHanger,
  SceneLayout,
  SceneProductInput,
  SceneRack,
  UNCOLLECTED_RACK_ID,
  UNCOLLECTED_RACK_NAME,
  primaryImageUrl,
} from './types';

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
    stockQty: Math.max(0, Math.round(product.stockQty ?? 0)),
    status: (product.status ?? 'published').toLowerCase(),
    rackId,
  };
}

/**
 * One rack per collection (sortOrder), plus a trailing "Sem coleção" rack
 * for products with no matching ProductCollection.
 */
export function mapCatalogToScene(
  collections: SceneCollectionInput[],
  products: SceneProductInput[],
): SceneLayout {
  const orderedCollections = [...collections].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  const racks: SceneRack[] = orderedCollections.map((c) => ({
    id: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    hangers: [],
  }));

  const uncollected: SceneRack = {
    id: UNCOLLECTED_RACK_ID,
    name: UNCOLLECTED_RACK_NAME,
    sortOrder: Number.MAX_SAFE_INTEGER,
    hangers: [],
  };
  racks.push(uncollected);

  const byId = new Map(racks.map((r) => [r.id, r]));
  const knownIds = new Set(orderedCollections.map((c) => c.slug));

  for (const product of products) {
    if (!product.slug) continue;
    const rackId = resolveProductRackId(product, knownIds);
    const rack = byId.get(rackId) ?? uncollected;
    rack.hangers.push(toSceneHanger(product, rack.id));
  }

  return { racks };
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
  return { racks };
}
