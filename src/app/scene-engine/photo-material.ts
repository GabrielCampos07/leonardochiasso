import { MeshBasicMaterial, Texture } from 'three';

/**
 * Unlit, tone-mapping-excluded material so product photos keep site color.
 * HDRI / ACES must not wash or tint the printed plane.
 */
export function makePhotoMaterial(
  map: Texture | null,
  opts: { color?: number; opacity?: number; transparent?: boolean } = {},
): MeshBasicMaterial {
  const opacity = opts.opacity ?? 1;
  const material = new MeshBasicMaterial({
    color: opts.color ?? 0xffffff,
    map,
    transparent: opts.transparent ?? opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  material.toneMapped = false;
  return material;
}

export function isPhotoMaterial(material: unknown): material is MeshBasicMaterial {
  return material instanceof MeshBasicMaterial && material.toneMapped === false;
}

export function applyPhotoMap(material: MeshBasicMaterial, texture: Texture): void {
  material.map = texture;
  material.color.setHex(0xffffff);
  material.toneMapped = false;
  material.needsUpdate = true;
}
