import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
} from 'three';
import { disposeObject3D } from './dispose';
import { createGarmentHanger } from './garment-hanger';
import { makeLabelTexture } from './texture-loader';
import type { SceneHanger, SceneRack } from './types';

export const HANGER_SPACING = 0.64;
export const HANGER_ROW_LIMIT = 8;
export const RACK_ROW_PITCH = 1.12;
export const RACK_BAR_TOP = 0.96;
export const HANGER_HOOK_OFFSET = 0.48;
export const FLOOR_Y = -0.7;
/** Name plate + photo sit this far below the hanger origin. */
export const HANGER_BELOW_ORIGIN = 0.38;
const MIN_HANGER_Y = FLOOR_Y + HANGER_BELOW_ORIGIN + 0.08;

export function rackWidth(hangerCount: number): number {
  const perRow = Math.min(Math.max(hangerCount, 1), HANGER_ROW_LIMIT);
  return Math.max(2.6, perRow * HANGER_SPACING + 0.7);
}

export function rackRowCount(hangerCount: number): number {
  return Math.max(1, Math.ceil(hangerCount / HANGER_ROW_LIMIT) || 1);
}

/** Raise the top bar so the lowest hanger (photo + label) stays above the floor. */
export function rackBarTop(rows: number): number {
  const lastRow = Math.max(0, rows - 1);
  return Math.max(RACK_BAR_TOP, MIN_HANGER_Y + HANGER_HOOK_OFFSET + lastRow * RACK_ROW_PITCH);
}

export function hangerLocalY(row: number, barTop = RACK_BAR_TOP): number {
  return barTop - HANGER_HOOK_OFFSET - row * RACK_ROW_PITCH;
}

export function createCollectionRack(rack: SceneRack, x: number): Group {
  const group = new Group();
  group.name = `rack:${rack.id}`;
  group.userData = { kind: 'rack', rackId: rack.id, name: rack.name };
  group.position.x = x;

  const count = rack.hangers.length;
  const rows = rackRowCount(count);
  const barTop = rackBarTop(rows);
  const width = rackWidth(count);
  const metal = new MeshStandardMaterial({ color: 0xb7b1a8, roughness: 0.32, metalness: 0.68 });

  const topY = barTop + 0.38;
  const bottomY = FLOOR_Y + 0.02;
  const postHeight = Math.max(1.2, topY - bottomY);
  const postY = (topY + bottomY) / 2;
  const postGeo = new CylinderGeometry(0.012, 0.014, postHeight, 10);
  const left = new Mesh(postGeo, metal);
  left.position.set(-width / 2, postY, 0);
  left.castShadow = true;
  const right = new Mesh(postGeo.clone(), metal);
  right.position.set(width / 2, postY, 0);
  right.castShadow = true;
  group.add(left, right);

  const footGeo = new CylinderGeometry(0.04, 0.045, 0.02, 12);
  const footL = new Mesh(footGeo, metal);
  footL.position.set(-width / 2, FLOOR_Y + 0.02, 0);
  const footR = new Mesh(footGeo.clone(), metal);
  footR.position.set(width / 2, FLOOR_Y + 0.02, 0);
  group.add(footL, footR);

  const hangersRoot = new Group();
  hangersRoot.name = 'hangers';
  group.add(hangersRoot);

  for (let row = 0; row < rows; row += 1) {
    const barY = barTop - row * RACK_ROW_PITCH;
    const bar = new Mesh(new CylinderGeometry(0.007, 0.007, width - 0.06, 10), metal);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = barY;
    bar.castShadow = true;
    group.add(bar);
  }

  const plateW = Math.min(width * 0.72, 2.6);
  const plate = new Mesh(
    new BoxGeometry(plateW, 0.2, 0.03),
    new MeshStandardMaterial({ color: 0x1c1814, roughness: 0.5 }),
  );
  plate.position.set(0, barTop + 0.28, 0.02);
  group.add(plate);

  const plateLabel = new Sprite(
    new SpriteMaterial({
      map: makeLabelTexture(rack.name, { width: 1408, height: 224, fill: '#1c1814', size: 72 }),
      transparent: true,
      depthTest: true,
      sizeAttenuation: true,
    }),
  );
  plateLabel.scale.set(Math.min(width * 0.78, 2.8), 0.3, 1);
  plateLabel.position.set(0, barTop + 0.28, 0.08);
  plateLabel.name = 'plate';
  plateLabel.center.set(0.5, 0.5);
  group.add(plateLabel);

  layoutHangers(hangersRoot, rack.hangers, width, barTop);
  return group;
}

export function layoutHangers(
  root: Group,
  hangers: SceneHanger[],
  width: number,
  barTop = RACK_BAR_TOP,
): void {
  const existing = new Map<string, Group>();
  for (const child of [...root.children]) {
    const slug = String(child.userData?.['slug'] ?? '');
    if (slug) existing.set(slug, child as Group);
  }

  hangers.forEach((hanger, index) => {
    const row = Math.floor(index / HANGER_ROW_LIMIT);
    const col = index % HANGER_ROW_LIMIT;
    const inRow = Math.min(HANGER_ROW_LIMIT, hangers.length - row * HANGER_ROW_LIMIT);
    const rowWidth = Math.min(width - 0.45, inRow * HANGER_SPACING);
    const startX = -rowWidth / 2 + HANGER_SPACING / 2;
    let group = existing.get(hanger.slug);
    if (!group) {
      group = createGarmentHanger(hanger);
      root.add(group);
    }
    existing.delete(hanger.slug);
    const restY = hangerLocalY(row, barTop);
    group.userData['restY'] = restY;
    group.position.set(startX + col * HANGER_SPACING, restY, 0.04);
  });

  for (const leftover of existing.values()) {
    leftover.removeFromParent();
    disposeObject3D(leftover);
  }
}
