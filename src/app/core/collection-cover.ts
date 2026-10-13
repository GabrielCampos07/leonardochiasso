import { isArchivedAt } from './admin-archive';
import { resolveMediaUrl } from './media-url';

/** Warm atelier wash — same family as the 3D floor (`#efe8dc`). */
export const COLLECTION_COVER_FALLBACK_HEX = '#efe8dc';
export const COLLECTION_COVER_FALLBACK_DEEP = '#e4d4c2';
export const COLLECTION_COVER_FALLBACK_LIGHT = '#f7f1e6';

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
  /** Stored cover on the collection itself (API `coverImage` / legacy aliases). */
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
  if (!collection) return null;
  const raw =
    asText(collection.coverImage) ??
    asText(collection.coverUrl) ??
    asText(collection.image) ??
    asText(collection.imageUrl);
  return raw ? resolveMediaUrl(raw) : null;
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

/** True when the URL belongs to an archived member and no live member shares it. */
export function storedCoverIsFromArchivedPiece(
  stored: string | null | undefined,
  pieces: readonly CollectionCoverSource[],
): boolean {
  const url = asText(stored);
  if (!url) return false;
  let onArchived = false;
  let onLive = false;
  for (const piece of pieces) {
    const photo = piecePhotoUrl(piece);
    if (photo !== url) continue;
    if (isArchivedAt(piece.archivedAt)) onArchived = true;
    else onLive = true;
  }
  return onArchived && !onLive;
}

/**
 * Stored collection cover wins when it is not the photo of an archived-only piece.
 * Otherwise derive from the first live piece with a photo. Fallback only when neither exists.
 */
export function resolveCollectionCover(opts: {
  collection?: CollectionCoverMeta | null;
  products?: readonly CollectionCoverSource[] | null;
}): string | null {
  const collection = opts.collection ?? {};
  const members = (opts.products ?? [])
    .filter((product) => productBelongsToCollection(product, collection))
    .map((product) => ({
      ...product,
      sortOrder: collectionMembershipSortOrder(product.collections, collection) ?? product.sortOrder,
    }));
  const stored = storedCollectionCoverUrl(collection);
  if (stored && !storedCoverIsFromArchivedPiece(stored, members.length ? members : (opts.products ?? []))) {
    return stored;
  }
  return collectionCoverUrl(members);
}

export interface CollectionCoverProduct extends CollectionCoverSource {
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
