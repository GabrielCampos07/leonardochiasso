import type { Material, Object3D, Texture, WebGLRenderer } from 'three';
import { Mesh } from 'three';
import { isSharedTexture, photoTextureCache } from './texture-cache';

function isTexture(value: unknown): value is Texture {
  return Boolean(value && typeof value === 'object' && 'isTexture' in value);
}

/** Dispose a unique texture. Shared / cached photos stay alive for the next remount. */
export function disposeOwnedTexture(texture: Texture | null | undefined): void {
  if (!texture) return;
  if (isSharedTexture(texture)) {
    photoTextureCache.release(texture);
    return;
  }
  texture.dispose();
}

function disposeMaterial(material: Material): void {
  const record = material as Material & Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (isTexture(value)) disposeOwnedTexture(value);
  }
  material.dispose();
}

/** Dispose geometries, materials and *owned* textures on a subtree. */
export function disposeObject3D(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material) disposeMaterial(material);
    }
  });
}

export function disposeRenderer(renderer: WebGLRenderer): void {
  renderer.dispose();
  renderer.forceContextLoss();
  const el = renderer.domElement;
  el.parentElement?.removeChild(el);
}
