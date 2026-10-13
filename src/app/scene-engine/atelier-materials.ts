import {
  CanvasTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';
import {
  ATELIER_BRASS,
  ATELIER_CEILING,
  ATELIER_DARK_WOOD,
  ATELIER_LIGHT_WOOD,
  ATELIER_RUG,
  ATELIER_WALL,
  ATELIER_WAXED_WOOD,
} from './atelier-look';

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
    ctx.fillStyle = '#e2d0b4';
    ctx.fillRect(0, 0, 256, 256);
    const plankH = 32;
    for (let y = 0, row = 0; y < 256; y += plankH, row += 1) {
      const tone = row % 2 === 0 ? '#d8c09a' : '#e0c8a6';
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
    grad.addColorStop(0, '#d4c8ba');
    grad.addColorStop(1, '#b8aa9a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 220; i += 1) {
      ctx.fillStyle = `rgba(40, 32, 24, ${0.02 + (i % 4) * 0.01})`;
      ctx.fillRect((i * 47) % 256, (i * 31) % 256, 2, 2);
    }
  }
  return canvasTexture(canvas, 4, 2);
}

export function makeRugTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#6e5648';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(196, 176, 138, 0.28)';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeStyle = 'rgba(232, 220, 200, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, 200, 200);
    for (let i = 0; i < 40; i += 1) {
      ctx.fillStyle = `rgba(90, 70, 56, ${0.04 + (i % 3) * 0.02})`;
      ctx.fillRect((i * 53) % 256, (i * 37) % 256, 18, 2);
    }
  }
  return canvasTexture(canvas, 1, 1);
}

export function brassMaterial(lite = false): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: ATELIER_BRASS,
    roughness: lite ? 0.48 : 0.28,
    metalness: lite ? 0.42 : 0.84,
  });
}

export function lightWoodMaterial(lite = false, map: Texture | null = null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: map ? 0xffffff : ATELIER_LIGHT_WOOD,
    map,
    roughness: lite ? 0.72 : 0.46,
    metalness: 0.04,
  });
}

export function waxedWoodMaterial(lite = false, map: Texture | null = null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: map ? 0xffffff : ATELIER_WAXED_WOOD,
    map,
    roughness: lite ? 0.62 : 0.38,
    metalness: lite ? 0.02 : 0.08,
  });
}

export function darkWoodMaterial(lite = false): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: ATELIER_DARK_WOOD,
    roughness: lite ? 0.7 : 0.5,
    metalness: 0.06,
  });
}

export function glassMaterial(lite = false): MeshStandardMaterial | MeshPhysicalMaterial {
  if (lite) {
    return new MeshStandardMaterial({
      color: 0xf4fbff,
      transparent: true,
      opacity: 0.14,
      roughness: 0.12,
      metalness: 0.04,
      depthWrite: false,
    });
  }
  return new MeshPhysicalMaterial({
    color: 0xf4fbff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.04,
    metalness: 0.04,
    transmission: 0.62,
    thickness: 0.02,
    envMapIntensity: 0.55,
    depthWrite: false,
  });
}

export function wallMaterial(lite = false, map: Texture | null = null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: map ? 0xe8dfd4 : ATELIER_WALL,
    map,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: lite ? 0 : 0.1,
  });
}

export function ceilingMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: ATELIER_CEILING,
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0,
  });
}

export function floorMaterial(lite = false, map: Texture | null = null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: map ? 0xf4e8d4 : 0xffffff,
    map,
    roughness: lite ? 0.84 : 0.58,
    metalness: lite ? 0 : 0.04,
    envMapIntensity: lite ? 0 : 0.18,
  });
}

export function rugMaterial(lite = false, map: Texture | null = null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: map ? 0xffffff : ATELIER_RUG,
    map,
    roughness: lite ? 0.95 : 0.88,
    metalness: 0,
    envMapIntensity: 0.12,
  });
}
