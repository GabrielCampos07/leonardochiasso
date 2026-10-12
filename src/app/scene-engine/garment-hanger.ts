import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
} from 'three';
import type { SceneHanger } from './types';
import { hangerOpacity, stockBadgeColor } from './types';
import { makeBadgeTexture, makeFallbackTexture, makeLabelTexture } from './texture-loader';

export const HANGER_USER_DATA = 'hanger';

function hangerLabelMap(name: string) {
  return makeLabelTexture(name, { width: 1024, height: 192, fill: '#0e0c0e', size: 56 });
}

export function createGarmentHanger(data: SceneHanger): Group {
  const group = new Group();
  group.name = `hanger:${data.slug}`;
  group.userData = { kind: HANGER_USER_DATA, slug: data.slug, data };

  const metal = new MeshStandardMaterial({
    color: 0x9a9590,
    metalness: 0.55,
    roughness: 0.35,
  });
  const opacity = hangerOpacity(data.status);

  const hook = new Mesh(new TorusGeometry(0.045, 0.008, 8, 16, Math.PI * 1.3), metal);
  hook.rotation.z = Math.PI * 0.15;
  hook.position.y = 0.42;
  hook.userData = group.userData;
  group.add(hook);

  const neck = new Mesh(new CylinderGeometry(0.008, 0.008, 0.06, 8), metal);
  neck.position.y = 0.355;
  neck.userData = group.userData;
  group.add(neck);

  const bar = new Mesh(new BoxGeometry(0.28, 0.012, 0.012), metal);
  bar.position.y = 0.32;
  bar.userData = group.userData;
  group.add(bar);

  const garment = new Mesh(
    new PlaneGeometry(0.26, 0.4),
    new MeshStandardMaterial({
      color: 0xffffff,
      map: makeFallbackTexture('#c8c2b8', data.name),
      roughness: 0.7,
      metalness: 0.02,
      transparent: true,
      opacity,
    }),
  );
  garment.position.y = 0.08;
  garment.name = 'garment';
  garment.userData = group.userData;
  group.add(garment);

  const badge = new Mesh(
    new PlaneGeometry(0.07, 0.07),
    new MeshStandardMaterial({
      map: makeBadgeTexture(data.stockQty, stockBadgeColor(data.stockQty)),
      transparent: true,
      roughness: 0.5,
      metalness: 0.05,
      opacity,
    }),
  );
  badge.position.set(0.11, 0.24, 0.008);
  badge.name = 'badge';
  badge.userData = group.userData;
  group.add(badge);

  const label = new Sprite(
    new SpriteMaterial({
      map: hangerLabelMap(data.name),
      transparent: true,
      depthTest: true,
      sizeAttenuation: true,
      opacity,
    }),
  );
  label.scale.set(0.48, 0.09, 1);
  label.position.set(0, -0.2, 0.04);
  label.name = 'label';
  label.userData = group.userData;
  label.center.set(0.5, 0.5);
  group.add(label);

  return group;
}

export function applyHangerData(group: Group, data: SceneHanger): void {
  group.userData = { kind: HANGER_USER_DATA, slug: data.slug, data };
  group.traverse((child) => {
    if (child.userData?.['kind'] === HANGER_USER_DATA) {
      child.userData = group.userData;
    }
  });
  const opacity = hangerOpacity(data.status);
  const garment = group.getObjectByName('garment') as Mesh | undefined;
  const badge = group.getObjectByName('badge') as Mesh | undefined;
  const label = group.getObjectByName('label') as Sprite | undefined;

  if (garment?.material instanceof MeshStandardMaterial) {
    garment.material.opacity = opacity;
    garment.material.transparent = opacity < 1;
    if (!garment.material.map) {
      garment.material.map = makeFallbackTexture('#c8c2b8', data.name);
      garment.material.needsUpdate = true;
    }
  }
  if (badge?.material instanceof MeshStandardMaterial) {
    const prev = badge.material.map;
    badge.material.map = makeBadgeTexture(data.stockQty, stockBadgeColor(data.stockQty));
    badge.material.opacity = opacity;
    badge.material.needsUpdate = true;
    prev?.dispose();
  }
  if (label?.material instanceof SpriteMaterial) {
    const prev = label.material.map;
    label.material.map = hangerLabelMap(data.name);
    label.material.opacity = opacity;
    label.material.needsUpdate = true;
    prev?.dispose();
  }
}
