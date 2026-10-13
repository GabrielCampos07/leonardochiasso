import { resolveMediaUrl } from '../core/media-url';

/** Loose media row from `/api/products` or `/api/admin/products`. */
export interface LooseMedia {
  cdnUrl?: string | null;
  url?: string | null;
  src?: string | null;
  role?: string | null;
  isPrimary?: boolean | string | null;
  sortOrder?: number | null;
  mediaAsset?: { cdnUrl?: string | null; url?: string | null; role?: string | null } | null;
}

export interface LooseProductPhotos {
  slug?: string | null;
  name?: string | null;
  thumb?: string | null;
  gallery?: string[] | null;
  imageUrl?: string | null;
  images?: Array<string | LooseMedia> | null;
  photos?: Array<string | LooseMedia> | null;
  media?: LooseMedia[] | null;
  imageBindings?: unknown[] | null;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function mediaItemUrl(item: LooseMedia | string | null | undefined): string | null {
  if (typeof item === 'string') return asText(item);
  if (!item || typeof item !== 'object') return null;
  return (
    asText(item.cdnUrl) ??
    asText(item.url) ??
    asText(item.src) ??
    asText(item.mediaAsset?.cdnUrl) ??
    asText(item.mediaAsset?.url)
  );
}

function isPrimaryMedia(item: LooseMedia): boolean {
  return item.isPrimary === true || item.isPrimary === 'true';
}

function isThumbRole(item: LooseMedia): boolean {
  const role = String(item.role ?? item.mediaAsset?.role ?? '').toLowerCase();
  return role === 'thumb';
}

/**
 * Prod catalog: prefer `media[]` with `isPrimary` or `role: "thumb"` → `cdnUrl`,
 * then `thumb`, then the first media `cdnUrl`. Relative paths go through the CDN helper.
 */
export function primaryImageUrl(product: LooseProductPhotos): string | null {
  const media = [...(product.media ?? [])];
  const primary = media.find((m) => isPrimaryMedia(m));
  const thumbRole = media.find((m) => isThumbRole(m));
  const firstMedia = [...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).find((m) => mediaItemUrl(m));
  const fromImages = (product.images ?? []).map(mediaItemUrl).find(Boolean);
  const fromPhotos = (product.photos ?? []).map(mediaItemUrl).find(Boolean);
  const raw =
    mediaItemUrl(primary) ??
    mediaItemUrl(thumbRole) ??
    asText(product.thumb) ??
    mediaItemUrl(firstMedia) ??
    (product.gallery ?? []).map(asText).find(Boolean) ??
    asText(product.imageUrl) ??
    fromImages ??
    fromPhotos ??
    null;
  return raw ? resolveMediaUrl(raw) : null;
}

/** Dedicated thumb URL (`pdp/*-thumb.webp` or `media.role === "thumb"`). */
export function thumbImageUrl(product: LooseProductPhotos): string | null {
  const media = [...(product.media ?? [])];
  const thumbRole = media.find((m) => isThumbRole(m));
  const raw = asText(product.thumb) ?? mediaItemUrl(thumbRole);
  return raw ? resolveMediaUrl(raw) : null;
}

/**
 * Storefront PLP thumb derived from a PDP gallery path
 * (`pdp/pdp-bateau-01.webp` → `pdp/plp-bateau-thumb.webp`).
 */
export function derivedThumbUrl(url: string | null | undefined): string | null {
  if (!url || /thumb/i.test(url)) return null;
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const withoutHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = withoutHash.indexOf('?');
  const query = queryAt >= 0 ? withoutHash.slice(queryAt) : '';
  const path = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash;
  const match = path.match(/^(.*\/pdp\/)pdp-([^/?#]+?)(?:-\d+)?(\.(?:webp|jpe?g|png))$/i);
  if (!match) return null;
  return `${match[1]}plp-${match[2]}-thumb${match[3]}${query}${hash}`;
}

export function isThumbPhotoUrl(url: string | null | undefined): boolean {
  return Boolean(url && /thumb/i.test(url));
}

/**
 * Full `pdp-*` gallery photo, never the ~30KB `thumb` / `plp-*-thumb` asset.
 * Used when the camera closes on a rack or piece.
 */
export function fullImageUrl(product: LooseProductPhotos): string | null {
  const thumb = thumbImageUrl(product);
  const media = [...(product.media ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter((m) => !isThumbRole(m));
  const candidates = [
    ...(product.gallery ?? []).map(asText),
    ...media.map(mediaItemUrl),
    ...(product.images ?? []).map(mediaItemUrl),
    ...(product.photos ?? []).map(mediaItemUrl),
    asText(product.imageUrl),
  ];
  for (const raw of candidates) {
    if (!raw || isThumbPhotoUrl(raw)) continue;
    const resolved = resolveMediaUrl(raw);
    if (resolved && resolved !== thumb) return resolved;
  }
  return null;
}

export type HangerTextureQuality = 'thumb' | 'full';

/**
 * Default 3D load uses `thumb` only. Full `pdp-*` is a separate upgrade pass.
 * If `thumb` is missing, fall back to the full photo.
 */
export function hangerTextureUrls(
  hanger: { imageUrl?: string | null; thumbUrl?: string | null },
  quality: HangerTextureQuality = 'thumb',
): string[] {
  const thumb = hanger.thumbUrl || null;
  const full = hanger.imageUrl && hanger.imageUrl !== thumb && !isThumbPhotoUrl(hanger.imageUrl) ? hanger.imageUrl : null;
  if (quality === 'full') return full ? [full] : [];
  if (thumb) return [thumb];
  return full ? [full] : hanger.imageUrl ? [hanger.imageUrl] : [];
}

export function textureJobId(slug: string, quality: HangerTextureQuality): string {
  return `${slug}:${quality}`;
}

export function mergeProductPhotos<T extends LooseProductPhotos>(admin: T, storefront?: LooseProductPhotos | null): T {
  if (primaryImageUrl(admin) || !storefront) return admin;
  return {
    ...admin,
    media: admin.media?.length ? admin.media : storefront.media,
    thumb: admin.thumb || storefront.thumb,
    gallery: admin.gallery?.length ? admin.gallery : storefront.gallery,
    imageUrl: admin.imageUrl || storefront.imageUrl,
  };
}

export function clampTooltip(
  clientX: number,
  clientY: number,
  size: { width: number; height: number },
  viewport = { width: 0, height: 0 },
  offset = { x: 16, y: 18 },
): { x: number; y: number } {
  const vw = viewport.width || (typeof window === 'undefined' ? 1280 : window.innerWidth);
  const vh = viewport.height || (typeof window === 'undefined' ? 720 : window.innerHeight);
  const x = Math.min(vw - size.width - 8, Math.max(8, clientX + offset.x));
  const y = Math.min(vh - size.height - 8, Math.max(8, clientY + offset.y));
  return { x, y };
}
