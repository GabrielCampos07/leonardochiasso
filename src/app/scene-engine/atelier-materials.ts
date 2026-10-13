import {
  CanvasTexture,
  MeshBasicMaterial,
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
  ATELIER_WAINSCOT,
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

/** Light oak planks — cool greige, never red. */
export function makeWoodFloorTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e8d7b8';
    ctx.fillRect(0, 0, 256, 256);
    const plankH = 28;
    for (let y = 0, row = 0; y < 256; y += plankH, row += 1) {
      const tone = row % 2 === 0 ? '#e4d2b0' : '#eddcb8';
      ctx.fillStyle = tone;
      ctx.fillRect(0, y, 256, plankH - 1);
      ctx.fillStyle = 'rgba(150, 128, 96, 0.16)';
      ctx.fillRect(0, y + plankH - 1, 256, 1);
      for (let i = 0; i < 14; i += 1) {
        ctx.fillStyle = `rgba(140, 118, 86, ${0.03 + (i % 5) * 0.012})`;
        ctx.fillRect((i * 61 + row * 17) % 256, y + 3 + (i % 9) * 2, 18 + (i % 5) * 6, 1);
      }
    }
  }
  return canvasTexture(canvas, 10, 8);
}

/** Warm off-white / greige plaster. */
export function makePlasterTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#f3eee6');
    grad.addColorStop(1, '#e4dbd0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i += 1) {
      ctx.fillStyle = `rgba(90, 78, 64, ${0.015 + (i % 4) * 0.008})`;
      ctx.fillRect((i * 47) % 256, (i * 31) % 256, 2, 2);
    }
  }
  return canvasTexture(canvas, 3, 2);
}

export function makeRugTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c6bbb0';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(232, 224, 212, 0.55)';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, 224, 224);
    ctx.strokeStyle = 'rgba(90, 78, 68, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, 200, 200);
    for (let i = 0; i < 36; i += 1) {
      ctx.fillStyle = `rgba(255, 248, 238, ${0.03 + (i % 3) * 0.02})`;
      ctx.fillRect((i * 53) % 256, (i * 37) % 256, 22, 2);
    }
  }
  return canvasTexture(canvas, 1, 1);
}

export function makeContactShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
    grad.addColorStop(0, 'rgba(22, 16, 12, 0.34)');
    grad.addColorStop(0.45, 'rgba(22, 16, 12, 0.14)');
    grad.addColorStop(1, 'rgba(22, 16, 12, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function brassMaterial(lite = false): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: ATELIER_BRASS,
    roughness: lite ? 0.42 : 0.24,
    metalness: lite ? 0.48 : 0.88,
    envMapIntensity: lite ? 0 : 0.75,
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
    roughness: lite ? 0.62 : 0.4,
    metalness: lite ? 0.02 : 0.06,
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
    color: map ? 0xf4efe6 : ATELIER_WALL,
    map,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: lite ? 0 : 0.08,
  });
}

export function wainscotMaterial(lite = false): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: ATELIER_WAINSCOT,
    roughness: 0.88,
    metalness: 0.02,
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
    color: map ? 0xf8f1e4 : 0xf3e6d0,
    map,
    roughness: lite ? 0.82 : 0.55,
    metalness: lite ? 0 : 0.03,
    envMapIntensity: lite ? 0 : 0.16,
  });
}

export function rugMaterial(lite = false, map: Texture | null = null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: map ? 0xf2ebe3 : ATELIER_RUG,
    map,
    roughness: lite ? 0.95 : 0.9,
    metalness: 0,
    envMapIntensity: 0.08,
  });
}

export function contactShadowMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: makeContactShadowTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    toneMapped: false,
  });
}
