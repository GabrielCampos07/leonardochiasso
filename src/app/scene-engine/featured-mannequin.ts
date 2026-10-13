import {
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { ATELIER_BRASS, ATELIER_LINEN } from './atelier-look';
import { FLOOR_Y, HANGER_SPACING, hangersPerRow } from './collection-rack';
import { PHOTO_MAX_W } from './garment-hanger';
import { UNIT_GAP } from './unit-layout';
import type { SceneUnitKind } from './types';

export const MANNEQUIN_GROUP = 'featured-mannequin';

/** Smooth atelier dress form on a brass stand — no blob head. */
export function createDressForm(lite = false): Group {
  const group = new Group();
  group.name = MANNEQUIN_GROUP;
  group.userData = { kind: 'mannequin', ignorePick: true };

  const linen = new MeshStandardMaterial({
    color: ATELIER_LINEN,
    roughness: lite ? 0.78 : 0.58,
    metalness: 0.02,
    envMapIntensity: lite ? 0 : 0.42,
  });
  const brass = new MeshStandardMaterial({
    color: ATELIER_BRASS,
    roughness: lite ? 0.46 : 0.26,
    metalness: lite ? 0.46 : 0.86,
    envMapIntensity: lite ? 0 : 0.7,
  });
  const segs = lite ? 20 : 48;

  const profile = [
    [0.0, 0.4],
    [0.1, 0.42],
    [0.122, 0.56],
    [0.152, 0.74],
    [0.118, 0.94],
    [0.148, 1.1],
    [0.158, 1.2],
    [0.132, 1.28],
    [0.052, 1.34],
    [0.046, 1.42],
    [0.0, 1.44],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new Mesh(new LatheGeometry(profile, segs), linen);
  body.castShadow = !lite;
  body.receiveShadow = !lite;
  body.userData = { ignorePick: true };
  group.add(body);

  const neck = new Mesh(new CylinderGeometry(0.042, 0.048, 0.06, segs), linen);
  neck.position.y = 1.41;
  neck.userData = { ignorePick: true };
  group.add(neck);

  const cap = new Mesh(new SphereGeometry(0.046, segs, 10, 0, Math.PI * 2, 0, Math.PI / 2), linen);
  cap.position.y = 1.44;
  cap.userData = { ignorePick: true };
  group.add(cap);

  const pole = new Mesh(new CylinderGeometry(0.011, 0.011, 1.4, 12), brass);
  pole.position.y = 0.7;
  pole.userData = { ignorePick: true };
  group.add(pole);

  const collar = new Mesh(new TorusGeometry(0.05, 0.007, 8, 20), brass);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.38;
  collar.userData = { ignorePick: true };
  group.add(collar);

  const base = new Mesh(new CylinderGeometry(0.155, 0.17, 0.036, 28), brass);
  base.position.y = 0.018;
  base.castShadow = !lite;
  base.userData = { ignorePick: true };
  group.add(base);

  const ring = new Mesh(new TorusGeometry(0.132, 0.008, 8, 24), brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.038;
  ring.userData = { ignorePick: true };
  group.add(ring);

  group.position.y = FLOOR_Y;
  return group;
}

export const MANNEQUIN_HALF_W = 0.18;
export const MANNEQUIN_BEHIND_Z = -1.08;

/** Local X span of hanger photos on a rack, measured from the unit origin. */
export function hangerPhotoSpan(hangerCount: number, unitWidth: number): { minX: number; maxX: number } {
  const perRow = hangersPerRow(hangerCount);
  const rowWidth = Math.min(unitWidth - 0.45, perRow * HANGER_SPACING);
  const startX = -rowWidth / 2 + HANGER_SPACING / 2;
  const lastX = startX + (perRow - 1) * HANGER_SPACING;
  return {
    minX: startX - PHOTO_MAX_W / 2,
    maxX: lastX + PHOTO_MAX_W / 2,
  };
}

/**
 * Beside the right post, behind the hanger plane. Returns null when the form
 * would overlap a photo or the neighboring rack — omit the prop instead.
 */
export function mannequinOffset(
  unitWidth: number,
  kind: SceneUnitKind,
  hangerCount = 1,
): { x: number; z: number; rotY: number } | null {
  if (hangerCount <= 2 || unitWidth < 2.4) return null;
  const photos = hangerPhotoSpan(hangerCount, unitWidth);
  const x = unitWidth / 2 + 0.4;
  const left = x - MANNEQUIN_HALF_W;
  const right = x + MANNEQUIN_HALF_W;
  if (left < photos.maxX + 0.08) return null;
  if (right > unitWidth / 2 + UNIT_GAP - 0.2) return null;
  return { x, z: kind === 'vitrine' ? -1.2 : MANNEQUIN_BEHIND_Z, rotY: -0.16 };
}

export function dimAsBackground(root: Group, intensity = 0.32): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const mat = child.material;
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const item of mats) {
      if (item && 'envMapIntensity' in item) {
        (item as MeshStandardMaterial).envMapIntensity = intensity;
      }
    }
  });
}
