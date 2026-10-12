import { CanvasTexture, SRGBColorSpace, Texture } from 'three';

/** Must be assigned on the Image *before* `src` so R2 (`pub-…r2.dev`) sends CORS headers. */
export const TEXTURE_CROSS_ORIGIN = 'anonymous';
export const TEXTURE_CACHE_PARAM = 'tex';
export const TEXTURE_CACHE_VALUE = '1';

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

function makeCanvasTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Gray garment plane when the CDN image is missing or blocked. Shows name + initial. */
export function makeFallbackTexture(hex = '#c8c2b8', name = ''): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9a948c';
    ctx.fillRect(18, 18, canvas.width - 36, canvas.height - 36);

    const trimmed = name.trim();
    const initial = (trimmed[0] ?? '·').toUpperCase();
    ctx.fillStyle = '#4f4b45';
    ctx.font = '600 128px "Encode Sans Expanded", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, canvas.width / 2, canvas.height / 2 - 18);

    if (trimmed) {
      ctx.fillStyle = '#2f2c28';
      ctx.font = '600 22px "Encode Sans Expanded", "Helvetica Neue", sans-serif';
      const label = trimmed.length > 22 ? `${trimmed.slice(0, 21)}…` : trimmed;
      ctx.fillText(label.toUpperCase(), canvas.width / 2, canvas.height - 46, canvas.width - 40);
    }
  }
  return makeCanvasTexture(canvas);
}

export function makeLabelTexture(
  text: string,
  opts: { width?: number; height?: number; fill?: string; color?: string; size?: number } = {},
): CanvasTexture {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 192;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = opts.fill ?? '#0e0c0e';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = opts.color ?? '#ffffff';
    ctx.font = `600 ${opts.size ?? 56}px "Encode Sans Expanded", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = text.length > 28 ? `${text.slice(0, 27)}…` : text;
    ctx.fillText(label.toUpperCase(), width / 2, height / 2, width - 48);
  }
  return makeCanvasTexture(canvas);
}

export function makeSoldOutTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8B1E2D';
    ctx.fillRect(0, 0, 256, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px "Encode Sans Expanded", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ESGOTADO', 128, 42, 230);
  }
  return makeCanvasTexture(canvas);
}

/**
 * Load a WebGL texture with CORS anonymous set *before* `src`.
 * Resolves `null` on any failure (CDN without ACAO, 404, decode error).
 */
export function loadTextureSafe(url: string): Promise<Texture | null> {
  return new Promise((resolve) => {
    const image = new Image();
    applyCorsBeforeSrc(image);
    image.onload = () => {
      const texture = new Texture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      resolve(texture);
    };
    image.onerror = () => resolve(null);
    image.src = textureCacheUrl(url);
  });
}
