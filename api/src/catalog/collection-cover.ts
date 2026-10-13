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

export function archivedMemberPhotoUrls(members: readonly CollectionCoverMember[]): Set<string> {
  const urls = new Set<string>();
  for (const member of members) {
    if (!isArchivedValue(member.product?.archivedAt)) continue;
    const url = memberPhotoUrl(member);
    if (url) urls.add(url);
  }
  return urls;
}

export function liveMemberPhotoUrls(members: readonly CollectionCoverMember[]): Set<string> {
  const urls = new Set<string>();
  for (const member of members) {
    if (isArchivedValue(member.product?.archivedAt)) continue;
    const url = memberPhotoUrl(member);
    if (url) urls.add(url);
  }
  return urls;
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
 * Stored cover wins unless it is only the photo of an archived piece.
 * Otherwise first live piece with a photo. Null only when nothing exists.
 */
export function resolveCollectionCoverImage(
  stored: string | null | undefined,
  members: readonly CollectionCoverMember[],
): string | null {
  const storedUrl = asText(stored);
  if (storedUrl) {
    const onlyArchived =
      archivedMemberPhotoUrls(members).has(storedUrl) &&
      !liveMemberPhotoUrls(members).has(storedUrl);
    if (!onlyArchived) return storedUrl;
  }
  return derivedCollectionCover(members);
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
