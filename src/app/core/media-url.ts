import { environment } from '../../environments/environment';

/** Matches api/scripts/cdn-url-map.ts — keep on Hostinger, never rewrite to R2. */
const HOSTINGER_ONLY = new Set([
  'assets/media/alta-costura/organic-dreams-desfile.MOV',
]);

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_RE = /\.(mp4|mov)$/i;

/**
 * Map legacy SPA paths (`assets/media/...`) to the public CDN when
 * `environment.cdnBaseUrl` is set. Already-absolute URLs and Hostinger-only
 * assets are left unchanged.
 */
export function resolveMediaUrl(url: string, cdnBase = environment.cdnBaseUrl): string {
  if (!url || !cdnBase) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;

  const normalized = url.replace(/^\//, '');
  if (HOSTINGER_ONLY.has(normalized)) return normalized;
  if (!normalized.startsWith('assets/media/')) return url;

  const base = cdnBase.replace(/\/$/, '');
  const rel = normalized.slice('assets/media/'.length);
  if (VIDEO_RE.test(rel)) return `${base}/video/${rel}`;
  if (IMAGE_RE.test(rel)) return `${base}/pdp/${rel.replace(/\.\w+$/, '.webp')}`;
  return url;
}

/** Deep-rewrite string fields that look like legacy media paths. */
export function withCdnUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return resolveMediaUrl(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => withCdnUrls(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = withCdnUrls(v);
    }
    return out as T;
  }
  return value;
}
