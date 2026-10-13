import { CanvasTexture, SRGBColorSpace, Texture } from 'three';
import { COLLECTION_COVER_FALLBACK_HEX } from '../core/collection-cover';
import { isTextureLive, markSharedTexture, photoTextureCache } from './texture-cache';

export { SHARED_TEXTURE_FLAG, isSharedTexture, isTextureLive, photoTextureCache } from './texture-cache';

/** Must be assigned on the Image *before* `src` so R2 (`pub-…r2.dev`) sends CORS headers. */
export const TEXTURE_CROSS_ORIGIN = 'anonymous';
export const TEXTURE_CACHE_PARAM = 'tex';
export const TEXTURE_CACHE_VALUE = '1';
export const TEXTURE_BITMAP_MAX_W = 256;
export const TEXTURE_BITMAP_MAX_H = 320;
export const TEXTURE_BITMAP_FULL_W = 512;
export const TEXTURE_BITMAP_FULL_H = 640;
/** ImageBitmap ignores `texture.flipY`; flip here so hangers and trays stay upright. */
export const TEXTURE_BITMAP_ORIENTATION = 'flipY' as const;
export const LABEL_DEFAULT_WIDTH = 768;
export const LABEL_DEFAULT_HEIGHT = 120;
export const FALLBACK_WIDTH = 128;
export const FALLBACK_HEIGHT = 160;
export const SOLD_OUT_TEXTURE_WIDTH = 320;
export const SOLD_OUT_TEXTURE_HEIGHT = 96;

/**
 * Distinct URL for WebGL textures so Chrome does not reuse the non-CORS
 * `<img>` cache (R2 omits `Vary: Origin`).
 */
export function textureCacheUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const withoutHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = withoutHash.indexOf('?');
  const base = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash;
  const params = new URLSearchParams(queryAt >= 0 ? withoutHash.slice(queryAt + 1) : '');
  if (!params.has(TEXTURE_CACHE_PARAM)) params.set(TEXTURE_CACHE_PARAM, TEXTURE_CACHE_VALUE);
  return `${base}?${params.toString()}${hash}`;
}

export function applyCorsBeforeSrc(image: { crossOrigin: string | null }): void {
  image.crossOrigin = TEXTURE_CROSS_ORIGIN;
}

const canvasCache = new Map<string, HTMLCanvasElement>();
const sharedCanvasTextures = new Map<string, CanvasTexture>();
let placeholderCanvas: HTMLCanvasElement | null = null;
let soldOutCanvas: HTMLCanvasElement | null = null;

function makeCanvasTexture(canvas: HTMLCanvasElement, shared = false, cacheKey?: string): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  if (shared) markSharedTexture(texture, cacheKey);
  return texture;
}

function sharedCanvasTexture(key: string, canvas: HTMLCanvasElement): CanvasTexture {
  const hit = sharedCanvasTextures.get(key);
  if (hit && isTextureLive(hit)) return hit;
  const texture = makeCanvasTexture(canvas, true, key);
  sharedCanvasTextures.set(key, texture);
  return texture;
}

function cachedCanvas(key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx);
  canvasCache.set(key, canvas);
  return canvas;
}

/** Tiny shared plane used until the real photo streams in. */
export function makePlaceholderTexture(hex = COLLECTION_COVER_FALLBACK_HEX): CanvasTexture {
  if (!placeholderCanvas) {
    placeholderCanvas = document.createElement('canvas');
    placeholderCanvas.width = 32;
    placeholderCanvas.height = 40;
    const ctx = placeholderCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, 32, 40);
    }
  }
  return sharedCanvasTexture(`placeholder|${hex}`, placeholderCanvas);
}

/** Gray garment plane when the CDN image is missing or blocked. Shows name + initial. */
export function makeFallbackTexture(hex = COLLECTION_COVER_FALLBACK_HEX, name = ''): CanvasTexture {
  const trimmed = name.trim();
  const canvas = cachedCanvas(`fallback|${hex}|${trimmed}`, FALLBACK_WIDTH, FALLBACK_HEIGHT, (ctx) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, FALLBACK_WIDTH, FALLBACK_HEIGHT);
    ctx.fillStyle = '#9a948c';
    ctx.fillRect(10, 10, FALLBACK_WIDTH - 20, FALLBACK_HEIGHT - 20);

    const initial = (trimmed[0] ?? '·').toUpperCase();
    ctx.fillStyle = '#4f4b45';
    ctx.font = '600 64px "Encode Sans Expanded", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, FALLBACK_WIDTH / 2, FALLBACK_HEIGHT / 2 - 10);

    if (trimmed) {
      ctx.fillStyle = '#2f2c28';
      ctx.font = '600 14px "Encode Sans Expanded", "Helvetica Neue", sans-serif';
      const label = trimmed.length > 22 ? `${trimmed.slice(0, 21)}…` : trimmed;
      ctx.fillText(label.toUpperCase(), FALLBACK_WIDTH / 2, FALLBACK_HEIGHT - 22, FALLBACK_WIDTH - 16);
    }
  });
  return sharedCanvasTexture(`fallback|${hex}|${trimmed}`, canvas);
}

/** Trim a name so it fits the painted label plate, with a real ellipsis. */
export function fitLabelText(
  text: string,
  maxWidth: number,
  font = '600 32px "Encode Sans Expanded", "Helvetica Neue", sans-serif',
): string {
  const raw = text.trim();
  if (!raw) return raw;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return raw.length > 18 ? `${raw.slice(0, 17).trimEnd()}…` : raw;
  }
  ctx.font = font;
  if (ctx.measureText(raw.toUpperCase()).width <= maxWidth) return raw;
  let cut = raw.length;
  while (cut > 1) {
    cut -= 1;
    const next = `${raw.slice(0, cut).trimEnd()}…`;
    if (ctx.measureText(next.toUpperCase()).width <= maxWidth) return next;
  }
  return '…';
}

export function makeLabelTexture(
  text: string,
  opts: { width?: number; height?: number; fill?: string; color?: string; size?: number } = {},
): CanvasTexture {
  const width = opts.width ?? LABEL_DEFAULT_WIDTH;
  const height = opts.height ?? LABEL_DEFAULT_HEIGHT;
  const fill = opts.fill ?? '#0e0c0e';
  const color = opts.color ?? '#ffffff';
  const size = opts.size ?? 40;
  const font = `600 ${size}px "Encode Sans Expanded", "Helvetica Neue", sans-serif`;
  const label = fitLabelText(text, width - 48, font);
  const canvas = cachedCanvas(`label|${width}|${height}|${fill}|${color}|${size}|${label}`, width, height, (ctx) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), width / 2, height / 2, width - 48);
  });
  return sharedCanvasTexture(`label|${width}|${height}|${fill}|${color}|${size}|${label}`, canvas);
}

export function makeSoldOutTexture(): CanvasTexture {
  if (!soldOutCanvas) {
    soldOutCanvas = document.createElement('canvas');
    soldOutCanvas.width = SOLD_OUT_TEXTURE_WIDTH;
    soldOutCanvas.height = SOLD_OUT_TEXTURE_HEIGHT;
    const ctx = soldOutCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#140e0c';
      ctx.fillRect(0, 0, SOLD_OUT_TEXTURE_WIDTH, SOLD_OUT_TEXTURE_HEIGHT);
      ctx.fillStyle = '#8B1E2D';
      ctx.fillRect(8, 8, SOLD_OUT_TEXTURE_WIDTH - 16, SOLD_OUT_TEXTURE_HEIGHT - 16);
      ctx.strokeStyle = '#f3ece2';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, SOLD_OUT_TEXTURE_WIDTH - 20, SOLD_OUT_TEXTURE_HEIGHT - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 42px "Encode Sans Expanded", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ESGOTADO', SOLD_OUT_TEXTURE_WIDTH / 2, SOLD_OUT_TEXTURE_HEIGHT / 2 + 2, SOLD_OUT_TEXTURE_WIDTH - 24);
    }
  }
  return sharedCanvasTexture('sold-out', soldOutCanvas);
}

function textureFromImage(image: TexImageSource, flipY: boolean): Texture {
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 2;
  texture.flipY = flipY;
  texture.needsUpdate = true;
  return texture;
}

async function loadTextureBitmap(
  url: string,
  maxW = TEXTURE_BITMAP_MAX_W,
  maxH = TEXTURE_BITMAP_MAX_H,
): Promise<Texture | null> {
  const src = textureCacheUrl(url);
  const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) return null;
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: TEXTURE_BITMAP_ORIENTATION,
    resizeWidth: maxW,
    resizeHeight: maxH,
    resizeQuality: 'medium',
  });
  const texture = textureFromImage(bitmap, false);
  texture.userData['bitmap'] = bitmap;
  return texture;
}

function loadTextureImage(url: string): Promise<Texture | null> {
  return new Promise((resolve) => {
    const image = new Image();
    applyCorsBeforeSrc(image);
    image.onload = () => resolve(textureFromImage(image, true));
    image.onerror = () => resolve(null);
    image.src = textureCacheUrl(url);
  });
}

export interface TextureLoadOpts {
  maxW?: number;
  maxH?: number;
}

export function textureAcquireKey(url: string, maxW: number, maxH: number): string {
  const base = textureCacheUrl(url);
  if (maxW === TEXTURE_BITMAP_MAX_W && maxH === TEXTURE_BITMAP_MAX_H) return base;
  return `${base}|${maxW}x${maxH}`;
}

async function loadTextureUncached(
  url: string,
  maxW = TEXTURE_BITMAP_MAX_W,
  maxH = TEXTURE_BITMAP_MAX_H,
): Promise<Texture | null> {
  try {
    if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
      return await loadTextureBitmap(url, maxW, maxH);
    }
    return await loadTextureImage(url);
  } catch {
    try {
      return await loadTextureImage(url);
    } catch {
      return null;
    }
  }
}

/**
 * Load a WebGL texture with CORS. Prefers off-thread `createImageBitmap` decode
 * and downscales to a 3D-thumb size. Resolves `null` on any failure.
 * Shared across hangers via the ref-counted photo cache.
 */
export async function loadTextureSafe(url: string, opts: TextureLoadOpts = {}): Promise<Texture | null> {
  if (!url) return null;
  const maxW = opts.maxW ?? TEXTURE_BITMAP_MAX_W;
  const maxH = opts.maxH ?? TEXTURE_BITMAP_MAX_H;
  return photoTextureCache.acquire(textureAcquireKey(url, maxW, maxH), () =>
    loadTextureUncached(url, maxW, maxH),
  );
}

/** Try each URL (already distinct) through the CORS `tex=1` loader. */
export async function loadTextureCandidates(
  urls: readonly string[],
  opts: TextureLoadOpts = {},
): Promise<Texture | null> {
  for (const url of urls) {
    if (!url) continue;
    const texture = await loadTextureSafe(url, opts);
    if (texture) return texture;
  }
  return null;
}
