import { isArchivedAt } from './admin-archive';

/** Warm atelier wash — same family as the 3D floor (`#efe8dc`). */
export const COLLECTION_COVER_FALLBACK_HEX = '#efe8dc';
export const COLLECTION_COVER_FALLBACK_DEEP = '#e4d4c2';
export const COLLECTION_COVER_FALLBACK_LIGHT = '#f7f1e6';

export interface CollectionCoverSource {
  archivedAt?: string | Date | null;
  /** `product_collections.sortOrder` when known; missing values keep source order. */
  sortOrder?: number | null;
  thumb?: string | null;
  gallery?: readonly string[] | null;
  imageUrl?: string | null;
  image?: string | null;
  media?: ReadonlyArray<{ cdnUrl?: string | null; isPrimary?: boolean | null; sortOrder?: number | null }> | null;
}

export function piecePhotoUrl(piece: CollectionCoverSource): string | null {
  const media = [...(piece.media ?? [])];
  const primary = media.find((item) => item.isPrimary && item.cdnUrl?.trim());
  const firstMedia = media
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .find((item) => item.cdnUrl?.trim());
  const candidates = [
    piece.thumb,
    primary?.cdnUrl,
    firstMedia?.cdnUrl,
    piece.gallery?.[0],
    piece.imageUrl,
    piece.image,
  ];
  for (const candidate of candidates) {
    const url = candidate?.trim();
    if (url) return url;
  }
  return null;
}

/** Live pieces in collection sortOrder (stable for ties / missing order). */
export function liveCollectionPieces<T extends CollectionCoverSource>(
  pieces: readonly T[],
): T[] {
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

export function collectionMembershipSortOrder(
  collections: ReadonlyArray<{ slug: string; sortOrder?: number | null }> | null | undefined,
  slug: string,
): number | null {
  const order = collections?.find((item) => item.slug === slug)?.sortOrder;
  return typeof order === 'number' ? order : null;
}

export interface CollectionCoverProduct extends CollectionCoverSource {
  collections?: ReadonlyArray<{ slug: string; sortOrder?: number | null }> | null;
}

export function coversByCollectionSlug(
  products: readonly CollectionCoverProduct[],
): Record<string, string | null> {
  const grouped = new Map<string, CollectionCoverProduct[]>();
  for (const product of products) {
    const slugs = (product.collections ?? []).map((c) => c.slug).filter(Boolean);
    for (const slug of slugs) {
      const rows = grouped.get(slug) ?? [];
      rows.push(product);
      grouped.set(slug, rows);
    }
  }
  const covers: Record<string, string | null> = {};
  for (const [slug, rows] of grouped) {
    covers[slug] = collectionCoverUrl(
      rows.map((product) => ({
        ...product,
        sortOrder: collectionMembershipSortOrder(product.collections, slug),
      })),
    );
  }
  return covers;
}
