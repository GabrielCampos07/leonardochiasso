import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { disposeObject3D } from './dispose';
import { createGarmentHanger } from './garment-hanger';
import { makeLabelTexture } from './texture-loader';
import type { SceneHanger, SceneRack } from './types';

export const HANGER_SPACING = 0.38;
export const HANGER_ROW_LIMIT = 12;

export function rackWidth(hangerCount: number): number {
  const perRow = Math.min(Math.max(hangerCount, 1), HANGER_ROW_LIMIT);
  return Math.max(2.2, perRow * HANGER_SPACING + 0.7);
}

export function createCollectionRack(rack: SceneRack, x: number): Group {
  const group = new Group();
  group.name = `rack:${rack.id}`;
  group.userData = { kind: 'rack', rackId: rack.id };
  group.position.x = x;

  const count = rack.hangers.length;
  const rows = Math.max(1, Math.ceil(count / HANGER_ROW_LIMIT) || 1);
  const width = rackWidth(count);
  const wood = new MeshStandardMaterial({ color: 0x3a322c, roughness: 0.7, metalness: 0.08 });
  const metal = new MeshStandardMaterial({ color: 0x6e6862, roughness: 0.4, metalness: 0.45 });

  const postGeo = new CylinderGeometry(0.035, 0.04, 1.6, 10);
  const left = new Mesh(postGeo, wood);
  left.position.set(-width / 2, 0.1, 0);
  const right = new Mesh(postGeo.clone(), wood);
  right.position.set(width / 2, 0.1, 0);
  group.add(left, right);

  const hangersRoot = new Group();
  hangersRoot.name = 'hangers';
  group.add(hangersRoot);

  for (let row = 0; row < rows; row += 1) {
    const barY = 0.72 - row * 0.62;
    const bar = new Mesh(new CylinderGeometry(0.016, 0.016, width - 0.08, 10), metal);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = barY;
    group.add(bar);
  }

  const plate = new Mesh(
    new BoxGeometry(Math.min(width * 0.55, 1.6), 0.12, 0.04),
    new MeshStandardMaterial({ color: 0x0e0c0e, roughness: 0.55 }),
  );
  plate.position.set(0, 0.92, 0.02);
  group.add(plate);

  const plateLabel = new Mesh(
    new PlaneGeometry(Math.min(width * 0.52, 1.5), 0.1),
    new MeshStandardMaterial({
      map: makeLabelTexture(rack.name, { width: 512, height: 80, fill: '#0e0c0e', size: 28 }),
      roughness: 0.7,
    }),
  );
  plateLabel.position.set(0, 0.92, 0.042);
  plateLabel.name = 'plate';
  group.add(plateLabel);

  layoutHangers(hangersRoot, rack.hangers, width);
  return group;
}

export function layoutHangers(root: Group, hangers: SceneHanger[], width: number): void {
  const existing = new Map<string, Group>();
  for (const child of [...root.children]) {
    const slug = String(child.userData?.['slug'] ?? '');
    if (slug) existing.set(slug, child as Group);
  }

  hangers.forEach((hanger, index) => {
    const row = Math.floor(index / HANGER_ROW_LIMIT);
    const col = index % HANGER_ROW_LIMIT;
    const inRow = Math.min(HANGER_ROW_LIMIT, hangers.length - row * HANGER_ROW_LIMIT);
    const rowWidth = Math.min(width - 0.5, inRow * HANGER_SPACING);
    const startX = -rowWidth / 2 + HANGER_SPACING / 2;
    let group = existing.get(hanger.slug);
    if (!group) {
      group = createGarmentHanger(hanger);
      root.add(group);
    }
    existing.delete(hanger.slug);
    group.position.set(startX + col * HANGER_SPACING, 0.3 - row * 0.62, 0.02);
  });

  for (const leftover of existing.values()) {
    leftover.removeFromParent();
    disposeObject3D(leftover);
  }
}
