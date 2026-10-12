import type { Material, Object3D, Texture, WebGLRenderer } from 'three';
import { Mesh } from 'three';

function disposeMaterial(material: Material): void {
  const record = material as Material & Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value && typeof value === 'object' && 'isTexture' in value) {
      (value as Texture).dispose();
    }
  }
  material.dispose();
}

/** Dispose geometries, materials and textures on a subtree. */
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
