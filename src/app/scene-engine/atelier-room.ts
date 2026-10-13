import { BoxGeometry, CircleGeometry, Group, Mesh, PlaneGeometry } from 'three';
import {
  ceilingMaterial,
  contactShadowMaterial,
  darkWoodMaterial,
  floorMaterial,
  makePlasterTexture,
  makeRugTexture,
  makeWoodFloorTexture,
  rugMaterial,
  wainscotMaterial,
  wallMaterial,
} from './atelier-materials';
import { FLOOR_Y } from './collection-rack';

export const ROOM_WALL_Z = -2.45;
export const ROOM_PLANT_Z = -1.65;
export const RUG_Z = 0.12;
const WAINSCOT_H = 0.92;

export function createAtelierRoom(lite = false): Group {
  const room = new Group();
  room.name = 'atelier-room';
  room.userData = { kind: 'room', ignorePick: true };

  const floor = new Mesh(new BoxGeometry(96, 0.1, 64), floorMaterial(lite, makeWoodFloorTexture()));
  floor.position.y = FLOOR_Y - 0.05;
  floor.receiveShadow = !lite;
  floor.name = 'floor';
  floor.userData = { ignorePick: true };
  room.add(floor);

  const wall = new Mesh(new PlaneGeometry(110, 18), wallMaterial(lite, makePlasterTexture()));
  wall.position.set(8, 6.2, ROOM_WALL_Z);
  wall.receiveShadow = !lite;
  wall.name = 'wall';
  wall.userData = { ignorePick: true };
  room.add(wall);

  const wainscot = new Mesh(new BoxGeometry(110, WAINSCOT_H, 0.04), wainscotMaterial(lite));
  wainscot.position.set(8, FLOOR_Y + WAINSCOT_H / 2, ROOM_WALL_Z + 0.03);
  wainscot.name = 'wainscot';
  wainscot.userData = { ignorePick: true };
  room.add(wainscot);

  const rail = new Mesh(new BoxGeometry(110, 0.035, 0.055), darkWoodMaterial(lite));
  rail.position.set(8, FLOOR_Y + WAINSCOT_H, ROOM_WALL_Z + 0.05);
  rail.name = 'chair-rail';
  rail.userData = { ignorePick: true };
  room.add(rail);

  const skirting = new Mesh(new BoxGeometry(110, 0.1, 0.05), darkWoodMaterial(lite));
  skirting.position.set(8, FLOOR_Y + 0.055, ROOM_WALL_Z + 0.04);
  skirting.name = 'skirting';
  skirting.userData = { ignorePick: true };
  room.add(skirting);

  const ceiling = new Mesh(new PlaneGeometry(96, 64), ceilingMaterial());
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(8, 7.4, 6);
  ceiling.name = 'ceiling';
  ceiling.userData = { ignorePick: true };
  room.add(ceiling);

  const rugs = new Group();
  rugs.name = 'rugs';
  room.add(rugs);

  return room;
}

export function placeRoomRug(room: Group, centerX: number, span: number): void {
  placeRackRugs(room, [{ x: centerX, width: Math.max(2.4, span) }]);
}

export function placeRackRugs(
  room: Group,
  slots: Array<{ x: number; width: number }>,
  lite = false,
): void {
  const root = room.getObjectByName('rugs') as Group | undefined;
  if (!root) return;
  while (root.children.length) root.remove(root.children[0]!);

  for (const slot of slots) {
    const rug = new Mesh(new CircleGeometry(Math.max(1.15, slot.width * 0.42), 40), rugMaterial(lite, makeRugTexture()));
    rug.rotation.x = -Math.PI / 2;
    rug.scale.set(1.15, 0.72, 1);
    rug.position.set(slot.x, FLOOR_Y + 0.014, RUG_Z);
    rug.receiveShadow = !lite;
    rug.name = 'rug';
    rug.userData = { ignorePick: true };
    root.add(rug);

    const ao = new Mesh(new PlaneGeometry(slot.width * 0.95, 0.62), contactShadowMaterial());
    ao.rotation.x = -Math.PI / 2;
    ao.position.set(slot.x, FLOOR_Y + 0.018, 0.04);
    ao.name = 'contact-ao';
    ao.userData = { ignorePick: true };
    root.add(ao);
  }
}
