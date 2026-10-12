import { BoxGeometry, CircleGeometry, Group, Mesh, PlaneGeometry } from 'three';
import {
  floorMaterial,
  makePlasterTexture,
  makeRugTexture,
  makeWoodFloorTexture,
  rugMaterial,
  wallMaterial,
} from './atelier-materials';
import { FLOOR_Y } from './collection-rack';

export const ROOM_WALL_Z = -2.45;
export const ROOM_PLANT_Z = -1.85;
export const RUG_Z = 0.55;

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

  const ceiling = new Mesh(
    new PlaneGeometry(96, 64),
    wallMaterial(true, null),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(8, 7.4, 6);
  ceiling.name = 'ceiling';
  ceiling.userData = { ignorePick: true };
  room.add(ceiling);

  const rug = new Mesh(new CircleGeometry(3.4, 48), rugMaterial(lite, makeRugTexture()));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, FLOOR_Y + 0.012, RUG_Z);
  rug.receiveShadow = !lite;
  rug.name = 'rug';
  rug.userData = { ignorePick: true };
  room.add(rug);

  return room;
}

export function placeRoomRug(room: Group, centerX: number, span: number): void {
  const rug = room.getObjectByName('rug') as Mesh | undefined;
  if (!rug) return;
  rug.position.x = centerX;
  const scale = Math.max(1, Math.min(2.4, span / 5.2));
  rug.scale.set(scale, scale, 1);
}
