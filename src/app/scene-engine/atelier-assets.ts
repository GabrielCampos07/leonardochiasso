import {
  LoadingManager,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { Group } from 'three';

/** Hashed filenames from `scripts/atelier-3d-compress.mjs`. */
export const ATELIER_ASSETS = {
  hdri: 'assets/3d/hdri-studio-small-08-512.ae1fc852.hdr',
  woodFloor: 'assets/3d/tex-wood-floor-diff.531d0840.jpg',
  woodFloorKtx2: 'assets/3d/tex-wood-floor-diff.531d0840.ktx2',
  lightWood: 'assets/3d/tex-light-wood-diff.7f175455.jpg',
  lightWoodKtx2: 'assets/3d/tex-light-wood-diff.7f175455.ktx2',
  plaster: 'assets/3d/tex-plaster-wall-diff.bef42e7d.jpg',
  plasterKtx2: 'assets/3d/tex-plaster-wall-diff.bef42e7d.ktx2',
  plantPotted: 'assets/3d/mdl-plant-potted.96aa11c9.glb',
  hanger: 'assets/3d/mdl-hanger.61a1e542.glb',
  tray: 'assets/3d/mdl-jewelry-tray.67115f7d.glb',
  vitrine: 'assets/3d/mdl-vitrine.64ba2829.glb',
  mannequin: 'assets/3d/mdl-mannequin.7d3d0875.glb',
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

function applyColorRepeat(texture: Texture, repeatX: number, repeatY: number): Texture {
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
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
      (texture) => resolve(applyColorRepeat(texture, repeatX, repeatY)),
      undefined,
      () => resolve(null),
    );
  });
}

let ktx2Loader: KTX2Loader | null = null;

export function loadColorTextureKtx2(
  ktx2Url: string,
  jpgUrl: string,
  manager: LoadingManager,
  renderer: WebGLRenderer,
  repeatX = 1,
  repeatY = 1,
): Promise<Texture | null> {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader(manager);
    ktx2Loader.setTranscoderPath('assets/3d/basis/');
    ktx2Loader.detectSupport(renderer);
  }
  return new Promise((resolve) => {
    ktx2Loader!.load(
      ktx2Url,
      (texture) => resolve(applyColorRepeat(texture, repeatX, repeatY)),
      undefined,
      () => {
        void loadColorTexture(jpgUrl, manager, repeatX, repeatY).then(resolve);
      },
    );
  });
}

const gltfCache = new Map<string, Promise<Group | null>>();

export function loadGlb(url: string, manager?: LoadingManager): Promise<Group | null> {
  const hit = gltfCache.get(url);
  if (hit) return hit;
  const pending = new Promise<Group | null>((resolve) => {
    const loader = new GLTFLoader(manager);
    loader.setMeshoptDecoder(MeshoptDecoder);
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
