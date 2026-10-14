import { Vector3 } from 'three';
import { STOCKROOM_ASSETS } from './stockroom-assets';
import { WALL_H, buildKenneyShell, placeMatrix, roomExtent, type StockroomKit } from './stockroom-kit';
import { BAY_D, BAY_H, BAY_W, BOX_D, BOX_H, BOX_W, CC0_BAY } from './stockroom-layout';

const PHOTO_H = BOX_H - 0.06;
const COUNTER_PITCH = 1.03;

/** Option A (`?cc0=1`): Kenney CC0 only — bookcase bays, one cardboard box per piece. */
export const CC0_KIT: StockroomKit = {
  id: 'cc0',
  assets: STOCKROOM_ASSETS,
  bay: CC0_BAY,
  photo: { w: Math.min(BOX_W - 0.05, PHOTO_H * 0.8), h: PHOTO_H, z: BOX_D / 2 + 0.006 },
  badge: { h: 0.15, z: BOX_D / 2 + 0.012 },

  buildRoom(b, plan, root) {
    buildKenneyShell(b, plan, root);
    const { room } = plan;
    const { width, depth } = roomExtent(plan);
    const add = (id: string, pos: Vector3, size: Vector3 | null, rotY = 0, scale?: number) => {
      const prop = b.place(id, pos, { size: size ?? undefined, rotY, scale });
      if (prop) root.add(prop);
    };
    add('column', new Vector3(room.minX + 0.45, 0, room.minZ + 0.45), new Vector3(0.7, WALL_H, 0.7));
    add('plant', new Vector3(room.minX + width - 0.55, 0, room.minZ + 0.5), null, 0, 2.1);
    add('plant', new Vector3(room.minX + 0.55, 0, room.minZ + depth - 0.6), null, 0, 2.1);
    const counterX = room.minX + width - 1.1;
    const counterZ = room.minZ + depth - 2.6;
    for (let i = 0; i < 3; i += 1) {
      add('counter', new Vector3(counterX, 0, counterZ + i * COUNTER_PITCH), null, -Math.PI / 2, 2.4);
    }
    add('register', new Vector3(counterX, 1.0, counterZ + COUNTER_PITCH), null, -Math.PI / 2, 0.55);
  },

  buildBay(b, area, x, root) {
    const prop = b.place('shelf', new Vector3(x, 0, area.bayFrontZ - BAY_D / 2), {
      size: new Vector3(BAY_W, BAY_H, BAY_D),
    });
    if (prop) root.add(prop);
  },

  buildPiece(b, root) {
    const bbox = b.bbox('box');
    const box = b.clone('box');
    if (!box || !bbox) return;
    box.matrixAutoUpdate = false;
    box.matrix.copy(placeMatrix(bbox, new Vector3(0, -BOX_H / 2, 0), new Vector3(BOX_W, BOX_H, BOX_D)));
    root.add(box);
  },
};
