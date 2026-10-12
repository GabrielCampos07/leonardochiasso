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
  thumb?: string | null;
  gallery?: string[] | null;
  imageUrl?: string | null;
  images?: Array<string | LooseMedia> | null;
  photos?: Array<string | LooseMedia> | null;
  media?: LooseMedia[] | null;
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
