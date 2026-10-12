import {
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { FLOOR_Y, RACK_BAR_TOP, rackWidth } from './collection-rack';
import { VITRINE_DEPTH, VITRINE_SHELF_PITCH, vitrineWidth } from './jewelry-vitrine';
import { makeLabelTexture } from './texture-loader';
import { DRAFT_PLACEHOLDER_NAME, DRAFT_UNIT_ID, unitWidth } from './unit-layout';
import type { SceneUnitKind } from './types';

export const DRAFT_GROUP_NAME = `rack:${DRAFT_UNIT_ID}`;

function ghostLine(): LineBasicMaterial {
  return new LineBasicMaterial({
    color: 0x8a7a68,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
}

function ghostFill(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: 0xd8cfc4,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
}

function addGhostBox(parent: Group, w: number, h: number, d: number, x: number, y: number, z: number): void {
  const geo = new BoxGeometry(w, h, d);
  const fill = new Mesh(geo, ghostFill());
  fill.position.set(x, y, z);
  fill.userData = { ignorePick: true, kind: 'draft' };
  parent.add(fill);
  const edges = new LineSegments(new EdgesGeometry(geo), ghostLine());
  edges.position.copy(fill.position);
  edges.userData = { ignorePick: true, kind: 'draft' };
  parent.add(edges);
}

function addGhostPost(parent: Group, x: number, y: number, height: number): void {
  const geo = new CylinderGeometry(0.012, 0.014, height, 8);
  const fill = new Mesh(geo, ghostFill());
  fill.position.set(x, y, 0);
  fill.userData = { ignorePick: true, kind: 'draft' };
  parent.add(fill);
  const edges = new LineSegments(new EdgesGeometry(geo), ghostLine());
  edges.position.copy(fill.position);
  edges.userData = { ignorePick: true, kind: 'draft' };
  parent.add(edges);
}

export function createDraftOutline(kind: SceneUnitKind, name: string, x: number): Group {
  const group = new Group();
  group.name = DRAFT_GROUP_NAME;
  group.userData = { kind: 'draft', rackId: DRAFT_UNIT_ID, unitKind: kind, name };
  group.position.x = x;

  if (kind === 'vitrine') {
    buildVitrineGhost(group);
  } else {
    buildRackGhost(group);
  }

  const plateY =
    kind === 'vitrine' ? FLOOR_Y + 0.1 + 0.22 + VITRINE_SHELF_PITCH + 0.12 : RACK_BAR_TOP + 0.28;
  const plate = makeDraftPlate(name, unitWidth(kind, 0), plateY);
  group.add(plate);
  return group;
}

function buildRackGhost(group: Group): void {
  const width = rackWidth(0);
  const barTop = RACK_BAR_TOP;
  const topY = barTop + 0.38;
  const bottomY = FLOOR_Y + 0.02;
  const postHeight = Math.max(1.2, topY - bottomY);
  const postY = (topY + bottomY) / 2;
  addGhostPost(group, -width / 2, postY, postHeight);
  addGhostPost(group, width / 2, postY, postHeight);
  addGhostBox(group, width - 0.06, 0.02, 0.02, 0, barTop, 0);
}

function buildVitrineGhost(group: Group): void {
  const width = vitrineWidth(0);
  const innerH = 0.22 + VITRINE_SHELF_PITCH;
  const baseY = FLOOR_Y + 0.04;
  const caseBottom = baseY + 0.06;
  addGhostBox(group, width + 0.08, 0.08, VITRINE_DEPTH + 0.06, 0, baseY, 0);
  addGhostBox(group, width, innerH, 0.03, 0, caseBottom + innerH / 2, -VITRINE_DEPTH / 2 + 0.02);
  addGhostBox(group, width + 0.04, 0.03, VITRINE_DEPTH + 0.04, 0, caseBottom + innerH, 0);
  addGhostBox(group, width - 0.08, 0.018, VITRINE_DEPTH - 0.08, 0, caseBottom + 0.08, 0.02);
}

function makeDraftPlate(name: string, width: number, y: number): Mesh {
  const label = name.trim() || DRAFT_PLACEHOLDER_NAME;
  const plate = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({
      map: makeLabelTexture(label, { width: 1408, height: 224, fill: '#2a221c', size: 64 }),
      roughness: 0.5,
      transparent: true,
      opacity: 0.72,
      emissive: 0x3a3228,
      emissiveIntensity: 0.15,
    }),
  );
  plate.scale.set(Math.min(width * 0.72, 1.8), 0.18, 1);
  plate.position.set(0, y, 0.06);
  plate.name = 'plate';
  plate.userData = { ignorePick: true, kind: 'draft' };
  return plate;
}

export function setDraftPlateName(group: Group, name: string): void {
  const plate = group.getObjectByName('plate') as Mesh | undefined;
  if (!plate || !(plate.material instanceof MeshStandardMaterial)) return;
  const prev = plate.material.map;
  plate.material.map = makeLabelTexture(name.trim() || DRAFT_PLACEHOLDER_NAME, {
    width: 1408,
    height: 224,
    fill: '#2a221c',
    size: 64,
  });
  plate.material.needsUpdate = true;
  prev?.dispose();
}

export function setGroupOpacity(group: Group, opacity: number): void {
  group.traverse((child) => {
    if (child instanceof LineSegments && child.material instanceof LineBasicMaterial) {
      child.material.opacity = 0.42 * opacity;
    } else if (child instanceof Mesh) {
      const mat = child.material;
      if (mat instanceof MeshBasicMaterial || mat instanceof MeshStandardMaterial) {
        const base = child.name === 'plate' ? 0.72 : 0.1;
        mat.transparent = true;
        mat.opacity = base * opacity;
      }
    }
  });
}

export function lightPlate(plate: Mesh, intensity: number): void {
  if (!(plate.material instanceof MeshStandardMaterial)) return;
  plate.material.emissive.setHex(0xc4b08a);
  plate.material.emissiveIntensity = intensity;
}
