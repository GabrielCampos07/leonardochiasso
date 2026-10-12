import {
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from 'three';
import { ATELIER_BRASS, ATELIER_LINEN } from './atelier-look';
import { FLOOR_Y } from './collection-rack';
import type { SceneUnitKind } from './types';

export const MANNEQUIN_GROUP = 'featured-mannequin';

export function createDressForm(lite = false): Group {
  const group = new Group();
  group.name = MANNEQUIN_GROUP;
  group.userData = { kind: 'mannequin', ignorePick: true };

  const linen = new MeshStandardMaterial({
    color: ATELIER_LINEN,
    roughness: lite ? 0.82 : 0.68,
    metalness: 0.02,
    envMapIntensity: lite ? 0 : 0.28,
  });
  const brass = new MeshStandardMaterial({
    color: ATELIER_BRASS,
    roughness: lite ? 0.5 : 0.3,
    metalness: lite ? 0.4 : 0.8,
  });

  const profile = [
    [0.02, 0],
    [0.07, 0.04],
    [0.08, 0.18],
    [0.11, 0.42],
    [0.16, 0.72],
    [0.14, 0.96],
    [0.1, 1.12],
    [0.07, 1.22],
    [0.09, 1.34],
    [0.07, 1.46],
    [0.0, 1.52],
  ].map(([x, y]) => new Vector2(x, y));
  const body = new Mesh(new LatheGeometry(profile, 18), linen);
  body.castShadow = !lite;
  body.userData = { ignorePick: true };
  group.add(body);

  const neck = new Mesh(new CylinderGeometry(0.035, 0.04, 0.08, 12), linen);
  neck.position.y = 1.26;
  neck.userData = { ignorePick: true };
  group.add(neck);

  const head = new Mesh(new SphereGeometry(0.075, 14, 10), linen);
  head.position.y = 1.4;
  head.userData = { ignorePick: true };
  group.add(head);

  const base = new Mesh(new CylinderGeometry(0.11, 0.14, 0.04, 16), brass);
  base.position.y = 0.02;
  base.userData = { ignorePick: true };
  group.add(base);

  group.position.y = FLOOR_Y;
  return group;
}

/** Beside the unit, behind hangers — never between camera and a photo. */
export function mannequinOffset(unitWidth: number, kind: SceneUnitKind): { x: number; z: number; rotY: number } {
  const side = kind === 'vitrine' ? unitWidth / 2 + 0.46 : unitWidth / 2 + 0.4;
  return { x: side, z: -0.48, rotY: -0.28 };
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
