import {
  AISLE_Z,
  AREA_BACK_INSET,
  AREA_DEPTH,
  areaFocusBox,
  bayCount,
  bayWindowBox,
  clampBayWindow,
  slotsInWindow,
  slotsPerBay,
  packRows,
  planStockroom,
  signTopY,
  slotCell,
  type StockroomUnitInput,
} from './stockroom-layout';
import { STOCKROOM_POLAR_DEFAULT } from './stockroom-camera';
import { SKETCHFAB_BAY as BAY } from './stockroom-kit-sketchfab';

const PER_BAY = slotsPerBay(BAY);
const PIECE = BAY.piece;

function plan(units: StockroomUnitInput[]) {
  return planStockroom(units, BAY);
}

function unit(id: string, pieces: number): StockroomUnitInput {
  return { id, name: id, hangers: Array.from({ length: pieces }, (_, i) => ({ slug: `${id}-${i}` })) };
}

describe('stockroom layout', () => {
  it('gives every collection at least one bay and one slot per piece', () => {
    expect(bayCount(0, BAY)).toBe(1);
    expect(bayCount(PER_BAY, BAY)).toBe(1);
    expect(bayCount(PER_BAY + 1, BAY)).toBe(2);
    const room = plan([unit('a', 13), unit('b', 0)]);
    expect(room.areas.map((a) => a.id)).toEqual(['a', 'b']);
    expect(room.areas[0].bayX.length).toBe(3);
    expect(room.areas[0].slots.length).toBe(13);
    expect(room.areas[1].slots.length).toBe(0);
  });

  it('fills a bay top level first, left to right', () => {
    expect(slotCell(0, BAY)).toEqual({ bay: 0, level: 0, column: 0 });
    expect(slotCell(1, BAY)).toEqual({ bay: 0, level: 0, column: 1 });
    expect(slotCell(BAY.perLevel, BAY)).toEqual({ bay: 0, level: 1, column: 0 });
    expect(slotCell(PER_BAY, BAY)).toEqual({ bay: 1, level: 0, column: 0 });
  });

  it('keeps every piece inside its bay and clear of the level below', () => {
    expect(PIECE.h).toBeLessThan(BAY.levelY[0] - BAY.levelY[1]);
    const area = plan([unit('a', 18)]).areas[0];
    for (const slot of area.slots) {
      const bayX = area.bayX[slot.bay];
      expect(Math.abs(slot.x - bayX) + PIECE.w / 2).toBeLessThan(BAY.width / 2);
      expect(slot.y).toBeCloseTo(BAY.levelY[slot.level], 5);
      expect(slot.z).toBeLessThan(area.bayFrontZ);
    }
  });

  it('keeps reading order and never overlaps areas', () => {
    const room = plan([unit('a', 19), unit('b', 19), unit('c', 26), unit('d', 1)]);
    const rows = room.areas.map((a) => a.row);
    expect([...rows].sort((x, y) => x - y)).toEqual(rows);
    for (const a of room.areas) {
      for (const b of room.areas) {
        if (a === b) continue;
        const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2;
        const overlapZ = Math.abs(a.z - b.z) < (a.depth + b.depth) / 2;
        expect(overlapX && overlapZ).toBeFalse();
      }
    }
  });

  it('packs rows close to a 16:10 footprint instead of one long column', () => {
    const rows = packRows([6.5, 6.5, 7.9, 2.3], 0.9, AREA_DEPTH + AISLE_Z, 1.6);
    expect(rows.length).toBe(2);
    expect(rows.flat()).toEqual([0, 1, 2, 3]);
    expect(packRows([])).toEqual([]);
  });

  it('leaves an aisle wide enough that a front row does not hide the pieces behind it at the default tilt', () => {
    const backRowFront = AREA_BACK_INSET + BAY.depth;
    const frontRowBack = AREA_DEPTH + AISLE_Z + AREA_BACK_INSET;
    const gap = frontRowBack - backRowFront;
    expect(BAY.height * Math.tan(STOCKROOM_POLAR_DEFAULT)).toBeLessThan(gap);
  });

  it('frames an area from just under the lowest pieces to the sign top', () => {
    const area = plan([unit('a', 4)]).areas[0];
    const box = areaFocusBox(area, BAY);
    expect(box.min[1]).toBe(BAY.focusMinY ?? 0);
    expect(box.max[1]).toBe(signTopY(BAY));
    expect(box.max[0] - box.min[0]).toBeGreaterThanOrEqual(BAY.width);
  });

  it('wraps the room around all areas', () => {
    const room = plan([unit('a', 4), unit('b', 30)]);
    expect(room.room.minX).toBeLessThan(room.bounds.minX);
    expect(room.room.maxZ).toBeGreaterThan(room.bounds.maxZ);
  });

  it('clamps a bay window to the bays a collection has', () => {
    const area = plan([unit('a', PER_BAY * 3)]).areas[0];
    expect(clampBayWindow(area, 0, 2)).toEqual({ start: 0, count: 2 });
    expect(clampBayWindow(area, 2, 2)).toEqual({ start: 1, count: 2 });
    expect(clampBayWindow(area, -4, 9)).toEqual({ start: 0, count: 3 });
    expect(clampBayWindow(area, 1, 0)).toEqual({ start: 1, count: 1 });
  });

  it('frames a bay window from the lowest to the highest piece, at the piece fronts', () => {
    const area = plan([unit('a', PER_BAY * 2)]).areas[0];
    const one = bayWindowBox(area, 0, 1, BAY);
    const two = bayWindowBox(area, 0, 2, BAY);
    expect(one.min[1]).toBeCloseTo(Math.min(...BAY.levelY) - PIECE.h / 2 - 0.06, 5);
    expect(one.max[1]).toBeCloseTo(Math.max(...BAY.levelY) + PIECE.h / 2 + 0.06, 5);
    expect(one.max[1]).toBeLessThan(BAY.height);
    expect(one.max[0] - one.min[0]).toBeCloseTo(BAY.width + 0.16, 5);
    expect(two.max[0] - two.min[0]).toBeCloseTo(BAY.width * 2 + 0.16, 5);
    expect(one.max[2] - one.min[2]).toBeLessThan(0.2);
    const second = bayWindowBox(area, 1, 1, BAY);
    expect(second.min[0]).toBeCloseTo(one.min[0] + BAY.width, 5);
  });

  it('lists the pieces stored in a bay window', () => {
    const area = plan([unit('a', PER_BAY + 2)]).areas[0];
    expect(slotsInWindow(area, 0, 1).length).toBe(PER_BAY);
    expect(slotsInWindow(area, 1, 1).map((s) => s.index)).toEqual([PER_BAY, PER_BAY + 1]);
  });
});
