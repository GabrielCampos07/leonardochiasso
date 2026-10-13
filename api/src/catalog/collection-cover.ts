/**
 * Pre-#30 storefront thumbs (local PRODUCTS first piece). Prisma Collection
 * has no image column — never persist these; they are a slug map only.
 */
export const CATALOG_COLLECTION_COVERS: Readonly<Record<string, string>> = {
  'organic-dreams':
    'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-calca-thumb.webp',
  'niponic-dreams':
    'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-look-obi-organza-thumb.webp',
  'brazilian-dreams':
    'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-colete-bermuda-saia-echarpe-thumb.webp',
};

export function catalogCollectionCover(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return CATALOG_COLLECTION_COVERS[slug] ?? null;
}

/** First live member photo by product_collections.sortOrder. */

export interface CollectionCoverMember {
  sortOrder?: number | null;
  product?: {
    archivedAt?: Date | string | null;
    media?: Array<{
      sortOrder?: number | null;
      isPrimary?: boolean | null;
      mediaAsset?: { cdnUrl?: string | null; url?: string | null } | null;
      cdnUrl?: string | null;
      url?: string | null;
    }>;
    thumb?: string | null;
  } | null;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function memberPhotoUrl(member: CollectionCoverMember): string | null {
  const product = member.product;
  if (!product) return null;
  const media = [...(product.media ?? [])];
  const primary = media.find((item) => item.isPrimary && mediaRowUrl(item));
  const first = media
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .find((item) => mediaRowUrl(item));
  return mediaRowUrl(primary) ?? mediaRowUrl(first) ?? asText(product.thumb);
}

function mediaRowUrl(
  item:
    | {
        cdnUrl?: string | null;
        url?: string | null;
        mediaAsset?: { cdnUrl?: string | null; url?: string | null } | null;
      }
    | null
    | undefined,
): string | null {
  if (!item) return null;
  return (
    asText(item.cdnUrl) ??
    asText(item.url) ??
    asText(item.mediaAsset?.cdnUrl) ??
    asText(item.mediaAsset?.url)
  );
}

export function isArchivedValue(value: Date | string | null | undefined): boolean {
  return value != null && value !== '';
}

export function derivedCollectionCover(members: readonly CollectionCoverMember[]): string | null {
  const live = members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => !isArchivedValue(member.product?.archivedAt))
    .sort((a, b) => {
      const ao = a.member.sortOrder;
      const bo = b.member.sortOrder;
      if (ao == null && bo == null) return a.index - b.index;
      if (ao == null) return 1;
      if (bo == null) return -1;
      if (ao !== bo) return ao - bo;
      return a.index - b.index;
    });
  for (const { member } of live) {
    const url = memberPhotoUrl(member);
    if (url) return url;
  }
  return null;
}

/**
 * Catalog slug map (Dreams) first, then first live member photo.
 * Collection has no image column — `stored` is ignored.
 */
export function resolveCollectionCoverImage(
  slugOrStored: string | null | undefined,
  members: readonly CollectionCoverMember[] = [],
): string | null {
  return catalogCollectionCover(slugOrStored) ?? derivedCollectionCover(members);
}

export const collectionCoverInclude = {
  products: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      product: {
        select: {
          archivedAt: true,
          media: {
            orderBy: { sortOrder: 'asc' as const },
            include: { mediaAsset: { select: { cdnUrl: true } } },
          },
        },
      },
    },
  },
} as const;
