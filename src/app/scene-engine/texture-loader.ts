import { CanvasTexture, SRGBColorSpace, Texture, TextureLoader } from 'three';

const loader = new TextureLoader();
loader.setCrossOrigin('anonymous');

export function makeFallbackTexture(hex = '#c8c2b8'): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 10;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8a847c';
    ctx.fillRect(1, 1, 6, 8);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makeLabelTexture(
  text: string,
  opts: { width?: number; height?: number; fill?: string; color?: string; size?: number } = {},
): CanvasTexture {
  const width = opts.width ?? 256;
  const height = opts.height ?? 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = opts.fill ?? '#0e0c0e';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = opts.color ?? '#ffffff';
    ctx.font = `500 ${opts.size ?? 22}px "Encode Sans Expanded", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = text.length > 28 ? `${text.slice(0, 27)}…` : text;
    ctx.fillText(label.toUpperCase(), width / 2, height / 2, width - 16);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makeBadgeTexture(qty: number, fill: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px "Quicksand", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.min(qty, 99)), 32, 34);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Load a WebGL texture with CORS anonymous. Resolves `null` on any failure
 * (CDN without ACAO, 404, decode error) so the caller can use a fallback.
 */
export function loadTextureSafe(url: string): Promise<Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}
