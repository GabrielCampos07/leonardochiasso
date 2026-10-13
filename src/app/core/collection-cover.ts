import { isArchivedAt } from './admin-archive';
import { resolveMediaUrl } from './media-url';
import { COLLECTION_SLUGS } from './routes';

/** Warm atelier wash — same family as the 3D floor (`#efe8dc`). */
export const COLLECTION_COVER_FALLBACK_HEX = '#efe8dc';
export const COLLECTION_COVER_FALLBACK_DEEP = '#e4d4c2';
export const COLLECTION_COVER_FALLBACK_LIGHT = '#f7f1e6';

/**
 * Pre-#30 storefront source for the three Dreams collections: first piece thumb
 * from the local `PRODUCTS` catalog. Prisma `Collection` has no image column —
 * there is no stored cover and this map must not be replaced by a migration.
 */
export const CATALOG_COLLECTION_COVERS: Readonly<Record<string, string>> = {
  [COLLECTION_SLUGS.organicDreams]: 'assets/media/plp-calca-thumb.png',
  [COLLECTION_SLUGS.niponicDreams]: 'assets/media/plp-look-obi-organza-thumb.png',
  [COLLECTION_SLUGS.brazilianDreams]: 'assets/media/plp-colete-bermuda-saia-echarpe-thumb.png',
};

export function catalogCollectionCoverUrl(
  collection: CollectionCoverMeta | string | null | undefined,
): string | null {
  const slug =
    typeof collection === 'string'
      ? normalizeKey(collection)
      : normalizeKey(collection?.slug) || normalizeKey(collection?.name).replace(/\s+/g, '-');
  const raw = CATALOG_COLLECTION_COVERS[slug];
  return raw ? resolveMediaUrl(raw) : null;
}

export interface CollectionCoverMedia {
  cdnUrl?: string | null;
  url?: string | null;
  src?: string | null;
  path?: string | null;
  publicUrl?: string | null;
  isPrimary?: boolean | string | null;
  sortOrder?: number | null;
  role?: string | null;
  mediaAsset?: {
    cdnUrl?: string | null;
    url?: string | null;
    role?: string | null;
  } | null;
}

export interface CollectionCoverMembership {
  id?: string | null;
  collectionId?: string | null;
  slug?: string | null;
  name?: string | null;
  sortOrder?: number | null;
  archivedAt?: string | Date | null;
}

export interface CollectionCoverSource {
  archivedAt?: string | Date | null;
  /** `product_collections.sortOrder` when known; missing values keep source order. */
  sortOrder?: number | null;
  thumb?: string | null;
  gallery?: ReadonlyArray<string | null> | null;
  imageUrl?: string | null;
  image?: string | null;
  images?: ReadonlyArray<string | CollectionCoverMedia> | null;
  photos?: ReadonlyArray<string | CollectionCoverMedia> | null;
  media?: ReadonlyArray<CollectionCoverMedia | string> | null;
  collectionSlug?: string | null;
  collection?: string | null;
  collections?: ReadonlyArray<CollectionCoverMembership> | null;
}

export interface CollectionCoverMeta {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  /** Derived DTO hint only — Collection has no image column. Never a stored cover. */
  coverImage?: string | null;
  coverUrl?: string | null;
  image?: string | null;
  imageUrl?: string | null;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function mediaItemCoverUrl(item: CollectionCoverMedia | string | null | undefined): string | null {
  if (typeof item === 'string') return asText(item);
  if (!item || typeof item !== 'object') return null;
  return (
    asText(item.cdnUrl) ??
    asText(item.url) ??
    asText(item.src) ??
    asText(item.publicUrl) ??
    asText(item.path) ??
    asText(item.mediaAsset?.cdnUrl) ??
    asText(item.mediaAsset?.url)
  );
}

export function piecePhotoUrl(piece: CollectionCoverSource): string | null {
  const media = [...(piece.media ?? [])];
  const primary = media.find((item) => {
    if (typeof item === 'string') return false;
    return (item.isPrimary === true || item.isPrimary === 'true') && mediaItemCoverUrl(item);
  });
  const firstMedia = media
    .slice()
    .sort((a, b) => {
      const ao = typeof a === 'object' && a ? a.sortOrder : 0;
      const bo = typeof b === 'object' && b ? b.sortOrder : 0;
      return (ao ?? 0) - (bo ?? 0);
    })
    .find((item) => mediaItemCoverUrl(item));
  const candidates = [
    piece.thumb,
    mediaItemCoverUrl(primary),
    mediaItemCoverUrl(firstMedia),
    piece.gallery?.[0],
    piece.imageUrl,
    piece.image,
    ...(piece.images ?? []).map((item) => mediaItemCoverUrl(item)),
    ...(piece.photos ?? []).map((item) => mediaItemCoverUrl(item)),
  ];
  for (const candidate of candidates) {
    const url = asText(candidate);
    if (url) return resolveMediaUrl(url);
  }
  return null;
}

export function storedCollectionCoverUrl(collection: CollectionCoverMeta | null | undefined): string | null {
  return catalogCollectionCoverUrl(collection);
}

export function collectionIdentityKeys(
  collection: CollectionCoverMeta | CollectionCoverMembership | null | undefined,
): string[] {
  if (!collection) return [];
  const keys = [
    normalizeKey('id' in collection ? collection.id : null),
    normalizeKey('collectionId' in collection ? collection.collectionId : null),
    normalizeKey(collection.slug),
    normalizeKey(collection.name),
  ];
  return [...new Set(keys.filter(Boolean))];
}

export function productBelongsToCollection(
  product: CollectionCoverSource,
  collection: CollectionCoverMeta | { id?: string | null; slug?: string | null; name?: string | null },
): boolean {
  const wanted = new Set(collectionIdentityKeys(collection));
  if (!wanted.size) return false;
  for (const membership of product.collections ?? []) {
    if (collectionIdentityKeys(membership).some((key) => wanted.has(key))) return true;
  }
  if (wanted.has(normalizeKey(product.collectionSlug))) return true;
  if (wanted.has(normalizeKey(product.collection))) return true;
  return false;
}

export function collectionMembershipSortOrder(
  collections: ReadonlyArray<CollectionCoverMembership> | null | undefined,
  collection: CollectionCoverMeta | string,
): number | null {
  const wanted =
    typeof collection === 'string'
      ? new Set([normalizeKey(collection)])
      : new Set(collectionIdentityKeys(collection));
  const row = collections?.find((item) => collectionIdentityKeys(item).some((key) => wanted.has(key)));
  return typeof row?.sortOrder === 'number' ? row.sortOrder : null;
}

/** Live pieces in collection sortOrder (stable for ties / missing order). */
export function liveCollectionPieces<T extends CollectionCoverSource>(pieces: readonly T[]): T[] {
  return pieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => !isArchivedAt(piece.archivedAt))
    .sort((a, b) => {
      const ao = a.piece.sortOrder;
      const bo = b.piece.sortOrder;
      if (ao == null && bo == null) return a.index - b.index;
      if (ao == null) return 1;
      if (bo == null) return -1;
      if (ao !== bo) return ao - bo;
      return a.index - b.index;
    })
    .map(({ piece }) => piece);
}

/**
 * Cover = first ACTIVE piece by collection sortOrder that has a photo.
 * Restore is automatic: the archived piece drops out and the next live photo wins.
 */
export function collectionCoverUrl(pieces: readonly CollectionCoverSource[]): string | null {
  for (const piece of liveCollectionPieces(pieces)) {
    const url = piecePhotoUrl(piece);
    if (url) return url;
  }
  return null;
}

/**
 * Cover priority (Collection has no image column — do not persist one):
 * 1. Pre-#30 catalog thumb for Organic / Niponic / Brazilian
 * 2. First live member photo by product_collections.sortOrder
 * 3. Null — the UI washes to the warm fallback
 */
export function resolveCollectionCover(opts: {
  collection?: CollectionCoverMeta | null;
  products?: readonly CollectionCoverSource[] | null;
}): string | null {
  const collection = opts.collection ?? {};
  const catalog = catalogCollectionCoverUrl(collection);
  if (catalog) return catalog;
  const members = (opts.products ?? [])
    .filter((product) => productBelongsToCollection(product, collection))
    .map((product) => ({
      ...product,
      sortOrder: collectionMembershipSortOrder(product.collections, collection) ?? product.sortOrder,
    }));
  return collectionCoverUrl(members);
}

export interface CollectionCoverProduct extends CollectionCoverSource {
  slug?: string | null;
  id?: string | null;
  collections?: ReadonlyArray<CollectionCoverMembership> | null;
}

export function coversByCollectionSlug(
  products: readonly CollectionCoverProduct[],
  collections: readonly CollectionCoverMeta[] = [],
): Record<string, string | null> {
  const grouped = new Map<string, CollectionCoverProduct[]>();
  const metaByKey = new Map<string, CollectionCoverMeta>();
  for (const collection of collections) {
    for (const key of collectionIdentityKeys(collection)) {
      metaByKey.set(key, collection);
    }
    if (collection.slug) grouped.set(collection.slug, []);
  }

  const remember = (key: string, product: CollectionCoverProduct) => {
    if (!key) return;
    const rows = grouped.get(key) ?? [];
    rows.push(product);
    grouped.set(key, rows);
  };

  for (const product of products) {
    const slugs = new Set<string>();
    for (const membership of product.collections ?? []) {
      const meta =
        metaByKey.get(normalizeKey(membership.slug)) ??
        metaByKey.get(normalizeKey(membership.id)) ??
        metaByKey.get(normalizeKey(membership.collectionId)) ??
        metaByKey.get(normalizeKey(membership.name));
      const slug = asText(membership.slug) ?? asText(meta?.slug);
      if (slug) slugs.add(slug);
    }
    const fallbackSlug = asText(product.collectionSlug);
    if (fallbackSlug) slugs.add(fallbackSlug);
    const named = asText(product.collection);
    if (named) {
      const meta = metaByKey.get(normalizeKey(named));
      if (meta?.slug) slugs.add(meta.slug);
      else slugs.add(named);
    }
    for (const slug of slugs) remember(slug, product);
  }

  const covers: Record<string, string | null> = {};
  for (const [slug, rows] of grouped) {
    const meta =
      collections.find((item) => item.slug === slug) ??
      metaByKey.get(normalizeKey(slug)) ??
      { slug };
    covers[slug] = resolveCollectionCover({ collection: meta, products: rows });
  }
  for (const slug of Object.keys(CATALOG_COLLECTION_COVERS)) {
    if (covers[slug] == null) {
      covers[slug] = catalogCollectionCoverUrl(slug);
    }
  }
  return covers;
}

export function mergeCoverProducts<T extends CollectionCoverProduct & { slug?: string | null; id?: string | null }>(
  admin: readonly T[],
  published: readonly T[] = [],
): T[] {
  const byKey = new Map<string, T>();
  for (const product of [...published, ...admin]) {
    const key = asText(product.slug) ?? asText(product.id);
    if (!key) continue;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, product);
      continue;
    }
    byKey.set(key, {
      ...current,
      ...product,
      thumb: product.thumb || current.thumb,
      gallery: product.gallery?.length ? product.gallery : current.gallery,
      media: product.media?.length ? product.media : current.media,
      collections: product.collections?.length ? product.collections : current.collections,
    });
  }
  return [...byKey.values()];
}
