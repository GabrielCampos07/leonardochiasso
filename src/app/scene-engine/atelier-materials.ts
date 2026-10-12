import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function canvasTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
  return texture;
}

/** Light oak planks — no extra image assets. */
export function makeWoodFloorTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d8c4a8';
    ctx.fillRect(0, 0, 256, 256);
    const plankH = 32;
    for (let y = 0, row = 0; y < 256; y += plankH, row += 1) {
      const tone = row % 2 === 0 ? '#cbb394' : '#d2b89a';
      ctx.fillStyle = tone;
      ctx.fillRect(0, y, 256, plankH - 2);
      ctx.fillStyle = 'rgba(90, 70, 48, 0.12)';
      ctx.fillRect(0, y + plankH - 2, 256, 2);
      for (let i = 0; i < 10; i += 1) {
        ctx.fillStyle = `rgba(92, 68, 46, ${0.04 + (i % 5) * 0.01})`;
        ctx.fillRect((i * 73 + row * 29) % 256, y + 4 + (i % 7) * 3, 24 + (i % 4) * 8, 1);
      }
    }
  }
  return canvasTexture(canvas, 8, 6);
}

/** Warm plaster for the back wall. */
export function makePlasterTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#f3ece2');
    grad.addColorStop(1, '#e4d6c4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 220; i += 1) {
      ctx.fillStyle = `rgba(120, 100, 80, ${0.015 + (i % 4) * 0.008})`;
      ctx.fillRect((i * 47) % 256, (i * 31) % 256, 2, 2);
    }
  }
  return canvasTexture(canvas, 4, 2);
}
