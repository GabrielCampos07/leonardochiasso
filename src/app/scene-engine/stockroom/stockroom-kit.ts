import { Box3, BufferGeometry, Group, Material, Matrix4, Object3D, Quaternion, Vector3 } from 'three';
import type { StockroomArea, StockroomBaySpec, StockroomPlan } from './stockroom-layout';

/**
 * A stockroom "kit" is the scene's dressing: the asset files, the bay geometry,
 * and how the room, each bay and each piece body are built. Camera, input,
 * photos, badges, signs and animations live in `StockroomEngine`.
 */
export interface StockroomKit {
  id: 'sketchfab';
  /** Template id → GLB url. Must include `rug` (area floor mat). */
  assets: Readonly<Record<string, string>>;
  bay: StockroomBaySpec;
  /** Photo plane, centred on the slot. `z` is its offset towards the camera. */
  photo: { w: number; h: number; z: number };
  /** Badge strip across the bottom of the photo. */
  badge: { h: number; z: number };
  buildRoom(b: KitBuilder, plan: StockroomPlan, root: Group): void;
  buildBay(b: KitBuilder, area: StockroomArea, x: number, root: Group): void;
  /** Body behind the photo (box, hanger…). Group origin = slot centre. */
  buildPiece(b: KitBuilder, root: Group): void;
}

/** Engine services handed to a kit while it builds. */
export interface KitBuilder {
  bbox(id: string): Box3 | null;
  /** Clone of a template; materials stay shared unless `tint` asks for an owned copy. */
  clone(id: string, tint?: number): Group | null;
  /** Clone placed bottom-centre at `pos`: fitted to `size`, or uniform `scale`, then turned `rotY`. */
  place(id: string, pos: Vector3, opts?: PlaceOptions): Object3D | null;
  /** One InstancedMesh per template mesh. */
  instance(id: string, matrices: Matrix4[], castShadow?: boolean): Group;
  /** Per-engine geometry / material, built once and freed with the engine. */
  shared<T extends BufferGeometry | Material>(key: string, make: () => T): T;
}

export interface PlaceOptions {
  size?: Vector3;
  scale?: number;
  rotY?: number;
  tint?: number;
}

/** Template bbox → matrix that puts the model's bottom-centre at `pos`, scaled to `size`. */
export function placeMatrix(bbox: Box3, pos: Vector3, size: Vector3 | null, rotY = 0, scale?: Vector3): Matrix4 {
  const ext = bbox.getSize(new Vector3());
  const s =
    scale ??
    (size
      ? new Vector3(size.x / Math.max(ext.x, 1e-6), size.y / Math.max(ext.y, 1e-6), size.z / Math.max(ext.z, 1e-6))
      : new Vector3(1, 1, 1));
  const pivot = new Vector3((bbox.min.x + bbox.max.x) / 2, bbox.min.y, (bbox.min.z + bbox.max.z) / 2);
  const toPivot = new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
  const rs = new Matrix4().compose(new Vector3(), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotY), s);
  return new Matrix4().makeTranslation(pos.x, pos.y, pos.z).multiply(rs).multiply(toPivot);
}

export const FLOOR_TILE = 2;
export const WALL_PIECE_W = 2;
export const WALL_H = 3.35;

/** Rounded room footprint the floor tiles and walls cover. */
export function roomExtent(plan: StockroomPlan): { width: number; depth: number } {
  const { room } = plan;
  return {
    width: Math.ceil((room.maxX - room.minX) / FLOOR_TILE) * FLOOR_TILE,
    depth: Math.ceil((room.maxZ - room.minZ) / FLOOR_TILE) * FLOOR_TILE,
  };
}

/**
 * Kenney CC0 shell: instanced floor tiles plus back and
 * left walls, every third piece with a window. Needs `floor`, `wall`, `wallWindow`.
 */
export function buildKenneyShell(b: KitBuilder, plan: StockroomPlan, root: Group): void {
  const { room } = plan;
  const floorBox = b.bbox('floor');
  if (floorBox) {
    const tiles: Matrix4[] = [];
    const thickness = floorBox.getSize(new Vector3()).y * FLOOR_TILE;
    const tile = new Vector3(FLOOR_TILE, thickness, FLOOR_TILE);
    for (let x = room.minX; x < room.maxX - 1e-3; x += FLOOR_TILE) {
      for (let z = room.minZ; z < room.maxZ - 1e-3; z += FLOOR_TILE) {
        tiles.push(placeMatrix(floorBox, new Vector3(x + FLOOR_TILE / 2, -thickness, z + FLOOR_TILE / 2), tile));
      }
    }
    root.add(b.instance('floor', tiles, false));
  }
  const { width, depth } = roomExtent(plan);
  const wallBox = b.bbox('wall');
  if (!wallBox) return;
  const plain: Matrix4[] = [];
  const windowed: Matrix4[] = [];
  const wallSize = new Vector3(WALL_PIECE_W, WALL_H, 0.12);
  const back = Math.round(width / WALL_PIECE_W);
  for (let i = 0; i < back; i += 1) {
    const m = placeMatrix(wallBox, new Vector3(room.minX + WALL_PIECE_W * (i + 0.5), 0, room.minZ - 0.06), wallSize);
    (i % 3 === 1 ? windowed : plain).push(m);
  }
  const side = Math.round(depth / WALL_PIECE_W);
  for (let i = 0; i < side; i += 1) {
    const m = placeMatrix(
      wallBox,
      new Vector3(room.minX - 0.06, 0, room.minZ + WALL_PIECE_W * (i + 0.5)),
      wallSize,
      Math.PI / 2,
    );
    (i % 3 === 1 ? windowed : plain).push(m);
  }
  root.add(b.instance('wall', plain));
  root.add(b.instance('wallWindow', windowed));
}
