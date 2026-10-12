import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Texture,
} from 'three';
import { photoPlaneSize } from './camera-guide';
import { disposeObject3D } from './dispose';
import { HANGER_USER_DATA } from './garment-hanger';
import { hangerOpacity, isSoldOut, type SceneHanger, type SceneRack } from './types';
import { makeLabelTexture, makePlaceholderTexture, makeSoldOutTexture } from './texture-loader';
import { FLOOR_Y } from './collection-rack';
import { VITRINE_SHELF_LIMIT, VITRINE_TRAYS_PER_SHELF } from './mapping';

export const TRAY_SPACING = 0.4;
export const TRAY_PHOTO = 0.3;
export const VITRINE_DEPTH = 0.52;
export const VITRINE_SHELF_PITCH = 0.36;

export function vitrineWidth(count: number): number {
  const perShelf = Math.min(Math.max(count, 1), VITRINE_TRAYS_PER_SHELF);
  return Math.max(1.7, perShelf * TRAY_SPACING + 0.36);
}

function glassMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: 0xf4fbff,
    transparent: true,
    opacity: 0.1,
    roughness: 0.04,
    metalness: 0.04,
    transmission: 0.55,
    thickness: 0.02,
    depthWrite: false,
  });
}

function markGlass(mesh: Mesh): void {
  mesh.userData = { ...mesh.userData, ignorePick: true, kind: 'glass' };
}

export function createJewelryVitrine(unit: SceneRack, x: number): Group {
  const group = new Group();
  group.name = `rack:${unit.id}`;
  group.userData = { kind: 'vitrine', rackId: unit.id, name: unit.name };
  group.position.x = x;

  const count = unit.hangers.length;
  const shelves = Math.min(VITRINE_SHELF_LIMIT, Math.max(1, Math.ceil(count / VITRINE_TRAYS_PER_SHELF) || 1));
  const width = vitrineWidth(count);
  const innerH = 0.22 + shelves * VITRINE_SHELF_PITCH;
  const wood = new MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.72, metalness: 0.08 });
  const brass = new MeshStandardMaterial({ color: 0xc4b08a, roughness: 0.35, metalness: 0.55 });

  const baseY = FLOOR_Y + 0.04;
  const caseBottom = baseY + 0.06;
  const caseTop = caseBottom + innerH;

  const plinth = new Mesh(new BoxGeometry(width + 0.08, 0.08, VITRINE_DEPTH + 0.06), wood);
  plinth.position.set(0, baseY, 0);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const back = new Mesh(new BoxGeometry(width, innerH, 0.03), wood);
  back.position.set(0, caseBottom + innerH / 2, -VITRINE_DEPTH / 2 + 0.02);
  back.receiveShadow = true;
  group.add(back);

  for (const side of [-1, 1]) {
    const post = new Mesh(new BoxGeometry(0.03, innerH, VITRINE_DEPTH), wood);
    post.position.set(side * (width / 2), caseBottom + innerH / 2, 0);
    group.add(post);
  }

  const top = new Mesh(new BoxGeometry(width + 0.04, 0.03, VITRINE_DEPTH + 0.04), wood);
  top.position.set(0, caseTop, 0);
  group.add(top);

  const glass = glassMaterial();
  const front = new Mesh(new BoxGeometry(width - 0.04, innerH - 0.04, 0.012), glass);
  front.position.set(0, caseBottom + innerH / 2, VITRINE_DEPTH / 2 - 0.02);
  markGlass(front);
  group.add(front);

  const lid = new Mesh(new BoxGeometry(width - 0.06, 0.01, VITRINE_DEPTH - 0.06), glass);
  lid.position.set(0, caseTop - 0.02, 0.01);
  markGlass(lid);
  group.add(lid);

  const traysRoot = new Group();
  traysRoot.name = 'hangers';
  group.add(traysRoot);

  for (let shelf = 0; shelf < shelves; shelf += 1) {
    const shelfY = caseBottom + 0.08 + shelf * VITRINE_SHELF_PITCH;
    const board = new Mesh(new BoxGeometry(width - 0.08, 0.018, VITRINE_DEPTH - 0.08), wood);
    board.position.set(0, shelfY, 0.02);
    board.receiveShadow = true;
    group.add(board);
  }

  const plate = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({
      map: makeLabelTexture(unit.name, { width: 768, height: 120, fill: '#2a221c', size: 40 }),
      roughness: 0.55,
    }),
  );
  plate.scale.set(Math.min(width * 0.72, 1.6), 0.16, 1);
  plate.position.set(0, caseTop + 0.12, VITRINE_DEPTH / 2 - 0.04);
  plate.name = 'plate';
  group.add(plate);

  const rail = new Mesh(new BoxGeometry(Math.min(width * 0.72, 1.6), 0.02, 0.03), brass);
  rail.position.set(0, caseTop + 0.03, VITRINE_DEPTH / 2 - 0.05);
  group.add(rail);

  layoutTrays(traysRoot, unit.hangers, width, caseBottom);
  return group;
}

export function layoutTrays(root: Group, hangers: SceneHanger[], width: number, caseBottom = FLOOR_Y + 0.1): void {
  const existing = new Map<string, Group>();
  for (const child of [...root.children]) {
    const slug = String(child.userData?.['slug'] ?? '');
    if (slug) existing.set(slug, child as Group);
  }

  hangers.forEach((hanger, index) => {
    const shelf = Math.floor(index / VITRINE_TRAYS_PER_SHELF);
    const col = index % VITRINE_TRAYS_PER_SHELF;
    const inRow = Math.min(VITRINE_TRAYS_PER_SHELF, hangers.length - shelf * VITRINE_TRAYS_PER_SHELF);
    const rowWidth = Math.min(width - 0.28, inRow * TRAY_SPACING);
    const startX = -rowWidth / 2 + TRAY_SPACING / 2;
    let tray = existing.get(hanger.slug);
    if (!tray) {
      tray = createJewelryTray(hanger);
      root.add(tray);
    }
    existing.delete(hanger.slug);
    const restY = caseBottom + 0.1 + shelf * VITRINE_SHELF_PITCH;
    tray.userData['restY'] = restY;
    tray.position.set(startX + col * TRAY_SPACING, restY, 0.04);
  });

  for (const leftover of existing.values()) {
    leftover.removeFromParent();
    disposeObject3D(leftover);
  }
}

export function createJewelryTray(data: SceneHanger): Group {
  const group = new Group();
  group.name = `hanger:${data.slug}`;
  group.userData = { kind: HANGER_USER_DATA, slug: data.slug, data, restY: 0 };

  const opacity = hangerOpacity(data.status);
  const wood = new MeshStandardMaterial({
    color: 0x4a3d32,
    roughness: 0.62,
    metalness: 0.08,
    transparent: true,
    opacity,
  });
  const stand = new Mesh(new CylinderGeometry(0.03, 0.04, 0.05, 12), wood);
  stand.position.y = 0.03;
  stand.userData = group.userData;
  stand.castShadow = true;
  group.add(stand);

  const tray = new Mesh(new BoxGeometry(0.34, 0.012, 0.28), wood);
  tray.position.y = 0.06;
  tray.userData = group.userData;
  tray.name = 'tray';
  group.add(tray);

  const photo = photoPlaneSize(1, 1, TRAY_PHOTO, TRAY_PHOTO);
  const frame = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({ color: 0x2a241c, roughness: 0.5, transparent: true, opacity }),
  );
  frame.position.set(0, 0.22, 0);
  frame.scale.set(photo.width + 0.02, photo.height + 0.02, 1);
  frame.name = 'frame';
  frame.userData = group.userData;
  group.add(frame);

  const garment = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({
      color: 0xffffff,
      map: makePlaceholderTexture('#d8cfc4'),
      roughness: 0.55,
      transparent: true,
      opacity,
    }),
  );
  garment.position.set(0, 0.22, 0.004);
  garment.scale.set(photo.width, photo.height, 1);
  garment.name = 'garment';
  garment.userData = group.userData;
  group.add(garment);

  const badge = new Mesh(
    new PlaneGeometry(0.16, 0.055),
    new MeshStandardMaterial({
      map: makeSoldOutTexture(),
      transparent: true,
      opacity: isSoldOut(data.stockQty) ? opacity : 0,
    }),
  );
  badge.position.set(0.1, 0.34, 0.01);
  badge.name = 'badge';
  badge.userData = group.userData;
  badge.visible = isSoldOut(data.stockQty);
  group.add(badge);

  return group;
}

export function applyTrayPhoto(group: Group, texture: Texture): void {
  const garment = group.getObjectByName('garment') as Mesh | undefined;
  const frame = group.getObjectByName('frame') as Mesh | undefined;
  const img = texture.image as { width?: number; height?: number } | undefined;
  const size = photoPlaneSize(img?.width ?? 1, img?.height ?? 1, TRAY_PHOTO, TRAY_PHOTO);
  if (garment) garment.scale.set(size.width, size.height, 1);
  if (frame) frame.scale.set(size.width + 0.02, size.height + 0.02, 1);
}

export function applyTrayData(group: Group, data: SceneHanger): void {
  group.userData = { ...group.userData, kind: HANGER_USER_DATA, slug: data.slug, data };
  group.traverse((child) => {
    if (child.userData?.['kind'] === HANGER_USER_DATA) {
      child.userData = group.userData;
    }
  });
  const opacity = hangerOpacity(data.status);
  const badge = group.getObjectByName('badge') as Mesh | undefined;
  if (badge?.material instanceof MeshStandardMaterial) {
    badge.visible = isSoldOut(data.stockQty);
    badge.material.opacity = isSoldOut(data.stockQty) ? opacity : 0;
    badge.material.needsUpdate = true;
  }
}
