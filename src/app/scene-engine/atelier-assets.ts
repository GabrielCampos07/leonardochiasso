import {
  LoadingManager,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import type { Group } from 'three';

/** Hashed filenames from `scripts/atelier-3d-assets.mjs`. */
export const ATELIER_ASSETS = {
  hdri: 'assets/3d/hdri-studio-small-08-1k.f6a989f8.hdr',
  woodFloor: 'assets/3d/tex-wood-floor-diff.531d0840.jpg',
  lightWood: 'assets/3d/tex-light-wood-diff.7f175455.jpg',
  plaster: 'assets/3d/tex-plaster-wall-diff.bef42e7d.jpg',
  coatRack: 'assets/3d/mdl-coat-rack.d8231c22.glb',
  plantPotted: 'assets/3d/mdl-plant-potted.5b760eda.glb',
  plantBush: 'assets/3d/mdl-plant-bush.d7c8ff42.glb',
  hanger: 'assets/3d/mdl-hanger.5a1292b8.glb',
  tray: 'assets/3d/mdl-jewelry-tray.b25f1b38.glb',
  vitrine: 'assets/3d/mdl-vitrine.90eaa2e6.glb',
  mannequin: 'assets/3d/mdl-mannequin.a721699c.glb',
} as const;

export type AtelierAssetId = keyof typeof ATELIER_ASSETS;

export type LoadProgressHandler = (loaded: number, total: number) => void;

export function createAtelierLoadingManager(onProgress?: LoadProgressHandler): LoadingManager {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    onProgress?.(loaded, total);
  };
  return manager;
}

export function loadColorTexture(
  url: string,
  manager: LoadingManager,
  repeatX = 1,
  repeatY = 1,
): Promise<Texture | null> {
  return new Promise((resolve) => {
    const loader = new TextureLoader(manager);
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = 2;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

export function loadHdri(url: string, manager: LoadingManager): Promise<Texture | null> {
  return new Promise((resolve) => {
    const loader = new RGBELoader(manager);
    loader.load(
      url,
      (texture) => {
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

const gltfCache = new Map<string, Promise<Group | null>>();

export function loadGlb(url: string, manager?: LoadingManager): Promise<Group | null> {
  const hit = gltfCache.get(url);
  if (hit) return hit;
  const pending = new Promise<Group | null>((resolve) => {
    const loader = new GLTFLoader(manager);
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      () => resolve(null),
    );
  });
  gltfCache.set(url, pending);
  return pending;
}

export function cloneGlb(source: Group): Group {
  return source.clone(true);
}

export function clearGlbCache(): void {
  gltfCache.clear();
}
