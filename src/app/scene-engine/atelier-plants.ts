import {
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from 'three';
import { FLOOR_Y } from './collection-rack';

export const PLANT_GROUP = 'atelier-plant';

/** Tasteful ficus-style pot — used after first frame, never in front of hangers. */
export function createAtelierPlant(lite = false): Group {
  const group = new Group();
  group.name = PLANT_GROUP;
  group.userData = { kind: 'plant', ignorePick: true };

  const terracotta = new MeshStandardMaterial({
    color: 0xb88768,
    roughness: lite ? 0.82 : 0.62,
    metalness: 0.04,
  });
  const soil = new MeshStandardMaterial({
    color: 0x3a2c22,
    roughness: 0.95,
    metalness: 0,
  });
  const leaf = new MeshStandardMaterial({
    color: 0x4f6a4a,
    roughness: lite ? 0.7 : 0.48,
    metalness: 0.02,
  });
  const stem = new MeshStandardMaterial({
    color: 0x5a4634,
    roughness: 0.7,
    metalness: 0,
  });

  const potProfile = [
    [0.09, 0],
    [0.11, 0.02],
    [0.12, 0.14],
    [0.135, 0.22],
    [0.128, 0.24],
  ].map(([x, y]) => new Vector2(x, y));
  const pot = new Mesh(new LatheGeometry(potProfile, lite ? 12 : 24), terracotta);
  pot.castShadow = !lite;
  pot.receiveShadow = !lite;
  pot.userData = { ignorePick: true };
  group.add(pot);

  const dirt = new Mesh(new SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), soil);
  dirt.position.y = 0.23;
  dirt.userData = { ignorePick: true };
  group.add(dirt);

  const trunk = new Mesh(new CylinderGeometry(0.012, 0.018, 0.28, 8), stem);
  trunk.position.y = 0.38;
  trunk.userData = { ignorePick: true };
  group.add(trunk);

  const clusters: Array<[number, number, number, number]> = [
    [0, 0.72, 0, 0.2],
    [-0.1, 0.62, 0.06, 0.15],
    [0.11, 0.64, -0.04, 0.14],
    [0.04, 0.8, 0.05, 0.12],
  ];
  for (const [x, y, z, r] of clusters) {
    const foliage = new Mesh(new IcosahedronGeometry(r, lite ? 0 : 1), leaf);
    foliage.position.set(x, y, z);
    foliage.castShadow = !lite;
    foliage.userData = { ignorePick: true };
    group.add(foliage);
  }

  group.position.y = FLOOR_Y;
  return group;
}

/** Left and right room edges of a unit, always behind the hanger line (z < 0). */
export function plantOffsets(unitWidth: number): Array<{ x: number; z: number }> {
  const edge = unitWidth / 2 + 0.78;
  return [
    { x: -edge, z: -1.62 },
    { x: edge + 0.12, z: -1.7 },
  ];
}
