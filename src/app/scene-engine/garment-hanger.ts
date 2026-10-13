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
import { COLLECTION_COVER_FALLBACK_HEX } from '../core/collection-cover';
import { brassMaterial, darkWoodMaterial } from './atelier-materials';
import { applyPhotoMap, isPhotoMaterial, makePhotoMaterial } from './photo-material';
import { makeFallbackTexture, makeLabelTexture, makePlaceholderTexture, makeSoldOutTexture } from './texture-loader';

export const HANGER_USER_DATA = 'hanger';
export const PHOTO_MAX_W = 0.48;
export const PHOTO_MAX_H = 0.64;
export const HANGER_LIFT = 0.055;
export const SOLD_OUT_BADGE_W = 0.3;
export const SOLD_OUT_BADGE_H = 0.105;

function hangerLabelMap(name: string) {
  return makeLabelTexture(name, { width: 512, height: 80, fill: '#2a241c', size: 32 });
}

function attachSoldOutBadge(parent: Group, x: number, y: number, z: number, w: number, h: number, opacity: number): Group {
  const badge = new Group();
  badge.name = 'badge';
  badge.userData = parent.userData;
  badge.position.set(x, y, z);

  const back = new Mesh(
    new PlaneGeometry(w + 0.028, h + 0.022),
    makePhotoMaterial(null, { color: 0x140e0c, opacity, transparent: opacity < 1 }),
  );
  back.name = 'badgeBack';
  back.position.z = -0.002;
  back.userData = parent.userData;
  badge.add(back);

  const text = new Mesh(
    new PlaneGeometry(w, h),
    makePhotoMaterial(makeSoldOutTexture(), { opacity, transparent: true }),
  );
  text.name = 'badgeText';
  text.userData = parent.userData;
  badge.add(text);
  parent.add(badge);
  return badge;
}

function setBadgeState(group: Group, soldOut: boolean, opacity: number): void {
  const badge = group.getObjectByName('badge');
  if (badge) badge.visible = soldOut;
  for (const name of ['badgeBack', 'badgeText']) {
    const mesh = group.getObjectByName(name) as Mesh | undefined;
    if (mesh && isPhotoMaterial(mesh.material)) {
      mesh.material.opacity = soldOut ? opacity : 0;
      mesh.material.transparent = true;
      mesh.material.needsUpdate = true;
    }
  }
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

  const metal = brassMaterial();
  const opacity = hangerOpacity(data.status);
  const fallback = makePlaceholderTexture(COLLECTION_COVER_FALLBACK_HEX);
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
    darkWoodMaterial(),
  );
  if (frame.material instanceof MeshStandardMaterial) {
    frame.material.transparent = opacity < 1;
    frame.material.opacity = opacity;
  }
  frame.position.set(0, 0.02, -0.004);
  frame.scale.set(photo.width + 0.028, photo.height + 0.028, 1);
  frame.name = 'frame';
  frame.userData = group.userData;
  frame.castShadow = true;
  group.add(frame);

  const garment = new Mesh(
    new PlaneGeometry(1, 1),
    makePhotoMaterial(fallback, { opacity, transparent: opacity < 1 }),
  );
  garment.position.set(0, 0.02, 0.002);
  garment.scale.set(photo.width, photo.height, 1);
  garment.name = 'garment';
  garment.userData = group.userData;
  garment.castShadow = true;
  garment.renderOrder = 2;
  group.add(garment);

  const badge = attachSoldOutBadge(
    group,
    0.11,
    0.535,
    0.02,
    SOLD_OUT_BADGE_W,
    SOLD_OUT_BADGE_H,
    opacity,
  );
  badge.visible = isSoldOut(data.stockQty);

  const label = new Mesh(
    new PlaneGeometry(1, 1),
    makePhotoMaterial(hangerLabelMap(data.name), { opacity, transparent: opacity < 1 }),
  );
  label.scale.set(0.5, 0.08, 1);
  label.position.set(0, -photo.height * 0.5 - 0.06, 0.04);
  label.name = 'label';
  label.userData = group.userData;
  label.renderOrder = 2;
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
  const label = group.getObjectByName('label') as Mesh | undefined;

  if (garment && isPhotoMaterial(garment.material)) {
    garment.material.opacity = opacity;
    garment.material.transparent = opacity < 1;
    garment.material.depthWrite = true;
    garment.material.fog = false;
    if (!garment.material.map) {
      applyPhotoMap(garment.material, makeFallbackTexture(COLLECTION_COVER_FALLBACK_HEX, data.name));
    }
  }
  if (frame?.material instanceof MeshStandardMaterial) {
    frame.material.opacity = opacity;
    frame.material.transparent = opacity < 1;
  }
  setBadgeState(group, isSoldOut(data.stockQty), opacity);
  if (label && isPhotoMaterial(label.material)) {
    const prev = label.material.map;
    label.material.map = hangerLabelMap(data.name);
    label.material.opacity = opacity;
    label.material.transparent = opacity < 1;
    label.material.depthWrite = true;
    label.material.fog = false;
    label.material.needsUpdate = true;
    prev?.dispose();
  }
}

export { attachSoldOutBadge, setBadgeState };
