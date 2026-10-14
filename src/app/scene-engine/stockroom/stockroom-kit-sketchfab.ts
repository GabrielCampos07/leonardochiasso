import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Vector3,
} from 'three';
import { STOCKROOM_ASSETS } from './stockroom-assets';
import { STOCKROOM_B_ASSETS } from './stockroom-b-assets';
import { buildKenneyShell, roomExtent, type KitBuilder, type StockroomKit } from './stockroom-kit';
import { AREA_BACK_INSET, AREA_DEPTH, type StockroomBaySpec } from './stockroom-layout';

/** Partition wall each collection's rails hang on (Kenney `wall`, tinted). */
export const PARTITION_H = 3.0;
export const PARTITION_D = 0.12;
const PARTITION_TINT = 0xe6dccd;

/** Wall rail (Sketchfab "Clothes rack with hanger", one finish) scaled to this length. */
export const RAIL_LEN = 1.74;
/** Rod centre inside the rail model: fraction of its height from the bottom, of its depth from the wall. */
const ROD_Y_FRAC = 0.42;
const ROD_Z_FRAC = 0.5;
/** Rod heights, top rail first. */
export const ROD_Y: readonly number[] = [2.62, 1.6];

const CARD_BORDER = 0.024;
export const CARD_W = 0.56;
/** Photos are 4:5 bitmaps stretched over the plane, so the card follows the photo. */
const PHOTO_W = CARD_W - CARD_BORDER * 2;
const PHOTO_H = PHOTO_W / 0.8;
export const CARD_H = PHOTO_H + CARD_BORDER * 2;
/** Rod centre → card centre. */
export const CARD_DROP = 0.45;
const CARD_D = 0.012;
const HANGER_W = 0.48;
/** Rod centre → hanger peak (the hook spans this gap). */
const HOOK_DROP = 0.05;
const HOOK_R = 0.022;
/** Model depth of the rail at RAIL_LEN, measured on the shipped GLB (0.333 of 1.667). */
const RAIL_D = RAIL_LEN * 0.2;

export const SKETCHFAB_BAY: StockroomBaySpec = {
  width: 1.8,
  height: PARTITION_H,
  depth: PARTITION_D + RAIL_D,
  levelY: ROD_Y.map((y) => y - CARD_DROP),
  perLevel: 3,
  columnPitch: 0.58,
  piece: { w: CARD_W, h: CARD_H, d: 0.06 },
  pieceInset: RAIL_D * (1 - ROD_Z_FRAC),
  focusMinY: ROD_Y[ROD_Y.length - 1] - CARD_DROP - CARD_H / 2 - 0.25,
};

/**
 * The `/admin/3d` stockroom: Sketchfab CC-BY rails, hangers, counter, register,
 * mannequins, display and plants over the Kenney CC0 floor, walls and rugs.
 * Credits: `STOCKROOM_B_CREDITS`.
 */
export const SKETCHFAB_KIT: StockroomKit = {
  id: 'sketchfab',
  assets: { ...STOCKROOM_ASSETS, ...STOCKROOM_B_ASSETS },
  bay: SKETCHFAB_BAY,
  photo: { w: PHOTO_W, h: PHOTO_H, z: CARD_D / 2 + 0.002 },
  badge: { h: 0.13, z: CARD_D / 2 + 0.006 },

  buildRoom(b, plan, root) {
    buildKenneyShell(b, plan, root);
    const { room } = plan;
    const { width, depth } = roomExtent(plan);
    const add = (id: string, x: number, z: number, opts: { scale?: number; size?: Vector3; rotY?: number; y?: number }) => {
      const prop = b.place(id, new Vector3(x, opts.y ?? 0, z), opts);
      if (prop) root.add(prop);
    };
    add('display', room.minX + 0.85, room.minZ + 0.8, { scale: 0.85 });
    add('plantLeaf', room.minX + width - 0.6, room.minZ + 0.6, { scale: 1.45 });
    add('plantFlower', room.minX + 0.6, room.minZ + depth - 0.7, { scale: 1.35 });
    add('plantFlower', room.minX + width - 0.6, room.minZ + depth / 2, { scale: 1.2 });
    const counterX = room.minX + width - 1.6;
    const counterZ = room.minZ + depth - 0.95;
    add('counter', counterX, counterZ, { size: new Vector3(2.4, 1.05, 1.45) });
    add('register', counterX + 0.55, counterZ + 0.15, { y: 1.05, scale: 0.42 / 216, rotY: -0.2 });
    add('mannequin', room.minX + 1.5, room.minZ + depth - 0.8, { scale: 1.1, rotY: 0.35 });
    add('mannequin', room.minX + 2.4, room.minZ + depth - 0.9, { scale: 1.1, rotY: -0.25 });
  },

  buildBay(b, area, x, root) {
    const backZ = area.z - AREA_DEPTH / 2 + AREA_BACK_INSET;
    const wall = b.place('wall', new Vector3(x, 0, backZ + PARTITION_D / 2), {
      size: new Vector3(SKETCHFAB_BAY.width, PARTITION_H, PARTITION_D),
      tint: PARTITION_TINT,
    });
    if (wall) root.add(wall);
    const bbox = b.bbox('rail');
    if (!bbox) return;
    const ext = bbox.getSize(new Vector3());
    const scale = RAIL_LEN / ext.x;
    const railH = ext.y * scale;
    for (const rodY of ROD_Y) {
      const rail = b.place('rail', new Vector3(x, rodY - railH * ROD_Y_FRAC, backZ + PARTITION_D + RAIL_D / 2), { scale });
      if (rail) root.add(rail);
    }
  },

  buildPiece(b, root) {
    const card = new Mesh(
      b.shared('sketchfab:card-geo', () => new BoxGeometry(CARD_W, CARD_H, CARD_D)),
      b.shared('sketchfab:card-mat', () => new MeshStandardMaterial({ color: 0xf7f3ec, roughness: 0.85 })),
    );
    card.castShadow = true;
    card.receiveShadow = true;
    root.add(card);
    addHanger(b, root);
  },
};

/** Wooden hanger in front of the card, hooked over the rod (rod centre at y = CARD_DROP, z = 0). */
function addHanger(b: KitBuilder, root: Object3D): void {
  const top = CARD_DROP - HOOK_DROP;
  const bbox = b.bbox('hanger');
  if (bbox) {
    const ext = bbox.getSize(new Vector3());
    const scale = HANGER_W / ext.x;
    const hanger = b.place('hanger', new Vector3(0, top - ext.y * scale, HOOK_R), { scale });
    if (hanger) root.add(hanger);
  }
  const metal = b.shared(
    'sketchfab:hook-mat',
    () => new MeshStandardMaterial({ color: 0x9a9894, metalness: 0.7, roughness: 0.35 }),
  );
  const stem = new Mesh(
    b.shared('sketchfab:hook-stem', () => new CylinderGeometry(0.006, 0.006, HOOK_DROP, 6)),
    metal,
  );
  stem.position.set(0, top + HOOK_DROP / 2, HOOK_R);
  // Upper half-ring turned into the YZ plane: back end at z = −r, front end at z = +r.
  const hook = new Mesh(
    b.shared('sketchfab:hook-arc', () => new TorusGeometry(HOOK_R, 0.006, 6, 12, Math.PI)),
    metal,
  );
  hook.position.set(0, CARD_DROP, 0);
  hook.rotation.y = Math.PI / 2;
  root.add(stem, hook);
}
