import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { brassMaterial, darkWoodMaterial } from './atelier-materials';
import { disposeObject3D } from './dispose';
import { createGarmentHanger } from './garment-hanger';
import { makePhotoMaterial } from './photo-material';
import { makeLabelTexture } from './texture-loader';
import type { SceneHanger, SceneRack } from './types';

export const HANGER_SPACING = 0.64;
/** Preferred columns on a single rail before a second row is added. */
export const HANGER_ROW_LIMIT = 8;
/** Hard cap — 15–19 piece racks grow sideways instead of a third row of tiny photos. */
export const HANGER_ROW_MAX = 2;
/** Camera frames at most this many columns so name plates stay readable. */
export const RACK_FRAME_COLUMNS = 8;
export const RACK_ROW_PITCH = 1.12;
export const RACK_BAR_TOP = 0.96;
export const HANGER_HOOK_OFFSET = 0.48;
export const FLOOR_Y = -0.7;
/** Name plate + photo sit this far below the hanger origin. */
export const HANGER_BELOW_ORIGIN = 0.38;
const MIN_HANGER_Y = FLOOR_Y + HANGER_BELOW_ORIGIN + 0.08;
const MIN_HANGER_Y_TALL = FLOOR_Y + HANGER_BELOW_ORIGIN + 0.32;

/** Columns on each rail. Past 8 pieces we use two rows and lengthen the bar. */
export function hangersPerRow(hangerCount: number): number {
  const n = Math.max(1, hangerCount);
  if (n <= HANGER_ROW_LIMIT) return n;
  return Math.ceil(n / HANGER_ROW_MAX);
}

export function rackWidthFromColumns(columns: number): number {
  return Math.max(1.72, Math.max(1, columns) * HANGER_SPACING + 0.52);
}

function markRackDecor(mesh: Mesh): void {
  mesh.userData = { ...mesh.userData, ignorePick: true, kind: 'rack-decor' };
}

export function rackWidth(hangerCount: number): number {
  return rackWidthFromColumns(hangersPerRow(hangerCount));
}

export function rackRowCount(hangerCount: number): number {
  if (hangerCount <= 0) return 1;
  return Math.min(HANGER_ROW_MAX, Math.max(1, Math.ceil(hangerCount / hangersPerRow(hangerCount))));
}

/** Width the lens actually frames — long racks pan instead of shrinking photos. */
export function rackFrameWidth(hangerCount: number): number {
  return rackWidthFromColumns(Math.min(hangersPerRow(hangerCount), RACK_FRAME_COLUMNS));
}

/** Half the extra length beyond the framed window. 0 when the rack fits. */
export function rackPanRange(hangerCount: number): number {
  return Math.max(0, (rackWidth(hangerCount) - rackFrameWidth(hangerCount)) / 2);
}

/** Raise the top bar so the lowest hanger (photo + label) stays above the floor. */
export function rackBarTop(rows: number): number {
  const lastRow = Math.max(0, rows - 1);
  const floorClear = rows >= 3 ? MIN_HANGER_Y_TALL : MIN_HANGER_Y;
  return Math.max(RACK_BAR_TOP, floorClear + HANGER_HOOK_OFFSET + lastRow * RACK_ROW_PITCH);
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
  const metal = brassMaterial();
  group.userData['unitWidth'] = width;

  const topY = barTop + 0.38;
  const bottomY = FLOOR_Y + 0.04;
  const postHeight = Math.max(1.2, topY - bottomY);
  const postY = (topY + bottomY) / 2;
  const postR = 0.024;
  const postGeo = new CylinderGeometry(postR, postR + 0.003, postHeight, 16);
  const left = new Mesh(postGeo, metal);
  left.position.set(-width / 2, postY, 0);
  left.castShadow = true;
  markRackDecor(left);
  const right = new Mesh(postGeo.clone(), metal);
  right.position.set(width / 2, postY, 0);
  right.castShadow = true;
  markRackDecor(right);
  group.add(left, right);

  for (const side of [-1, 1]) {
    const cap = new Mesh(new SphereGeometry(postR + 0.004, 12, 10), metal);
    cap.position.set((side * width) / 2, topY, 0);
    cap.castShadow = true;
    markRackDecor(cap);
    group.add(cap);

    const foot = new Mesh(new CylinderGeometry(0.075, 0.088, 0.04, 20), metal);
    foot.position.set((side * width) / 2, FLOOR_Y + 0.022, 0);
    foot.castShadow = true;
    markRackDecor(foot);
    group.add(foot);

    const pad = new Mesh(new SphereGeometry(0.03, 10, 8), metal);
    pad.scale.set(1.6, 0.45, 1.6);
    pad.position.set((side * width) / 2, FLOOR_Y + 0.006, 0);
    markRackDecor(pad);
    group.add(pad);
  }

  const hangersRoot = new Group();
  hangersRoot.name = 'hangers';
  group.add(hangersRoot);

  for (let row = 0; row < rows; row += 1) {
    const barY = barTop - row * RACK_ROW_PITCH;
    const barLen = width - 0.08;
    const bar = new Mesh(new CylinderGeometry(0.012, 0.012, barLen, 14), metal);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = barY;
    bar.castShadow = true;
    markRackDecor(bar);
    group.add(bar);
    for (const side of [-1, 1]) {
      const end = new Mesh(new SphereGeometry(0.014, 10, 8), metal);
      end.position.set((side * barLen) / 2, barY, 0);
      end.castShadow = true;
      markRackDecor(end);
      group.add(end);
    }
  }

  const plateW = Math.min(width * 0.72, 2.6);
  const plate = new Mesh(new BoxGeometry(plateW, 0.2, 0.03), darkWoodMaterial());
  plate.position.set(0, barTop + 0.28, 0.02);
  markRackDecor(plate);
  group.add(plate);

  const plateLabel = new Mesh(
    new PlaneGeometry(1, 1),
    makePhotoMaterial(makeLabelTexture(rack.name, { width: 768, height: 120, fill: '#1c1814', size: 48 })),
  );
  plateLabel.scale.set(Math.min(width * 0.78, 2.8), 0.22, 1);
  plateLabel.position.set(0, barTop + 0.28, 0.05);
  plateLabel.name = 'plate';
  markRackDecor(plateLabel);
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

  const perRow = hangersPerRow(hangers.length);
  hangers.forEach((hanger, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const inRow = Math.min(perRow, hangers.length - row * perRow);
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
