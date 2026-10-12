import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Texture,
  TorusGeometry,
} from 'three';
import { photoPlaneSize } from './camera-guide';
import type { SceneHanger } from './types';
import { hangerOpacity, isSoldOut } from './types';
import { makeFallbackTexture, makeLabelTexture, makePlaceholderTexture, makeSoldOutTexture } from './texture-loader';

export const HANGER_USER_DATA = 'hanger';
export const PHOTO_MAX_W = 0.48;
export const PHOTO_MAX_H = 0.64;
export const HANGER_LIFT = 0.055;

function hangerLabelMap(name: string) {
  return makeLabelTexture(name, { width: 512, height: 80, fill: '#2a241c', size: 32 });
}

export function applyPhotoAspect(garment: Mesh, frame: Mesh | undefined, texture: Texture): void {
  const img = texture.image as { width?: number; height?: number } | undefined;
  const size = photoPlaneSize(img?.width ?? 3, img?.height ?? 4, PHOTO_MAX_W, PHOTO_MAX_H);
  garment.scale.set(size.width, size.height, 1);
  if (frame) frame.scale.set(size.width + 0.028, size.height + 0.028, 1);
}

export function createGarmentHanger(data: SceneHanger): Group {
  const group = new Group();
  group.name = `hanger:${data.slug}`;
  group.userData = { kind: HANGER_USER_DATA, slug: data.slug, data, restY: 0 };

  const metal = new MeshStandardMaterial({
    color: 0xc4bfb8,
    metalness: 0.72,
    roughness: 0.28,
  });
  const opacity = hangerOpacity(data.status);
  const fallback = makePlaceholderTexture('#c8c2b8');
  const photo = photoPlaneSize(3, 4, PHOTO_MAX_W, PHOTO_MAX_H);

  const hook = new Mesh(new TorusGeometry(0.05, 0.007, 8, 18, Math.PI * 1.3), metal);
  hook.rotation.z = Math.PI * 0.15;
  hook.position.y = 0.48;
  hook.userData = group.userData;
  hook.castShadow = false;
  group.add(hook);

  const neck = new Mesh(new CylinderGeometry(0.007, 0.007, 0.07, 8), metal);
  neck.position.y = 0.405;
  neck.userData = group.userData;
  group.add(neck);

  const bar = new Mesh(new BoxGeometry(0.34, 0.01, 0.01), metal);
  bar.position.y = 0.365;
  bar.userData = group.userData;
  group.add(bar);

  const frame = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({
      color: 0x2a241c,
      roughness: 0.55,
      metalness: 0.08,
      transparent: true,
      opacity,
    }),
  );
  frame.position.set(0, 0.02, -0.004);
  frame.scale.set(photo.width + 0.028, photo.height + 0.028, 1);
  frame.name = 'frame';
  frame.userData = group.userData;
  frame.castShadow = true;
  group.add(frame);

  const garment = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({
      color: 0xffffff,
      map: fallback,
      roughness: 0.62,
      metalness: 0.02,
      transparent: true,
      opacity,
    }),
  );
  garment.position.set(0, 0.02, 0.002);
  garment.scale.set(photo.width, photo.height, 1);
  garment.name = 'garment';
  garment.userData = group.userData;
  garment.castShadow = true;
  group.add(garment);

  const badge = new Mesh(
    new PlaneGeometry(0.16, 0.055),
    new MeshStandardMaterial({
      map: makeSoldOutTexture(),
      transparent: true,
      roughness: 0.5,
      metalness: 0.05,
      opacity,
    }),
  );
  badge.position.set(photo.width * 0.28, photo.height * 0.38, 0.01);
  badge.name = 'badge';
  badge.userData = group.userData;
  badge.visible = isSoldOut(data.stockQty);
  group.add(badge);

  const label = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({
      map: hangerLabelMap(data.name),
      transparent: true,
      roughness: 0.55,
      opacity,
    }),
  );
  label.scale.set(0.5, 0.08, 1);
  label.position.set(0, -photo.height * 0.5 - 0.06, 0.04);
  label.name = 'label';
  label.userData = group.userData;
  group.add(label);

  return group;
}

export function applyHangerData(group: Group, data: SceneHanger): void {
  group.userData = { ...group.userData, kind: HANGER_USER_DATA, slug: data.slug, data };
  group.traverse((child) => {
    if (child.userData?.['kind'] === HANGER_USER_DATA) {
      child.userData = group.userData;
    }
  });
  const opacity = hangerOpacity(data.status);
  const garment = group.getObjectByName('garment') as Mesh | undefined;
  const frame = group.getObjectByName('frame') as Mesh | undefined;
  const badge = group.getObjectByName('badge') as Mesh | undefined;
  const label = group.getObjectByName('label') as Mesh | undefined;

  if (garment?.material instanceof MeshStandardMaterial) {
    garment.material.opacity = opacity;
    garment.material.transparent = opacity < 1;
    if (!garment.material.map) {
      garment.material.map = makeFallbackTexture('#c8c2b8', data.name);
      garment.material.needsUpdate = true;
    }
  }
  if (frame?.material instanceof MeshStandardMaterial) {
    frame.material.opacity = opacity;
  }
  if (badge?.material instanceof MeshStandardMaterial) {
    badge.visible = isSoldOut(data.stockQty);
    badge.material.opacity = isSoldOut(data.stockQty) ? opacity : 0;
    badge.material.needsUpdate = true;
  }
  if (label?.material instanceof MeshStandardMaterial) {
    const prev = label.material.map;
    label.material.map = hangerLabelMap(data.name);
    label.material.opacity = opacity;
    label.material.needsUpdate = true;
    prev?.dispose();
  }
}
