import {
  AISLE_Z,
  AREA_BACK_INSET,
  AREA_DEPTH,
  BAY_D,
  BAY_H,
  BAY_LEVEL_Y,
  BAY_W,
  BOX_H,
  BOX_W,
  SIGN_TOP_Y,
  SLOTS_PER_BAY,
  areaFocusBox,
  bayCount,
  packRows,
  planStockroom,
  slotCell,
  type StockroomUnitInput,
} from './stockroom-layout';
import { STOCKROOM_POLAR_DEFAULT } from './stockroom-camera';

function unit(id: string, pieces: number): StockroomUnitInput {
  return { id, name: id, hangers: Array.from({ length: pieces }, (_, i) => ({ slug: `${id}-${i}` })) };
}

describe('stockroom layout', () => {
  it('gives every collection at least one bay and one box slot per piece', () => {
    expect(bayCount(0)).toBe(1);
    expect(bayCount(SLOTS_PER_BAY)).toBe(1);
    expect(bayCount(SLOTS_PER_BAY + 1)).toBe(2);
    const plan = planStockroom([unit('a', 13), unit('b', 0)]);
    expect(plan.areas.map((a) => a.id)).toEqual(['a', 'b']);
    expect(plan.areas[0].bayX.length).toBe(3);
    expect(plan.areas[0].slots.length).toBe(13);
    expect(plan.areas[1].slots.length).toBe(0);
  });

  it('fills a bay top level first, left to right', () => {
    expect(slotCell(0)).toEqual({ bay: 0, level: 0, column: 0 });
    expect(slotCell(1)).toEqual({ bay: 0, level: 0, column: 1 });
    expect(slotCell(2)).toEqual({ bay: 0, level: 1, column: 0 });
    expect(slotCell(SLOTS_PER_BAY)).toEqual({ bay: 1, level: 0, column: 0 });
  });

  it('keeps every box inside its bay and under the shelf above', () => {
    const levelGap = BAY_LEVEL_Y[0] - BAY_LEVEL_Y[1];
    expect(BOX_H).toBeLessThan(levelGap - 0.08);
    expect(2 * BOX_W).toBeLessThan(BAY_W - 0.1);
    const area = planStockroom([unit('a', 18)]).areas[0];
    for (const slot of area.slots) {
      const bayX = area.bayX[slot.bay];
      expect(Math.abs(slot.x - bayX) + BOX_W / 2).toBeLessThan(BAY_W / 2);
      expect(slot.y - BOX_H / 2).toBeCloseTo(BAY_LEVEL_Y[slot.level], 5);
      expect(slot.z).toBeLessThan(area.bayFrontZ);
    }
  });

  it('keeps reading order and never overlaps areas', () => {
    const plan = planStockroom([unit('a', 19), unit('b', 19), unit('c', 26), unit('d', 1)]);
    const rows = plan.areas.map((a) => a.row);
    expect([...rows].sort((x, y) => x - y)).toEqual(rows);
    for (const a of plan.areas) {
      for (const b of plan.areas) {
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

  it('leaves an aisle wide enough that a front row does not hide the boxes behind it at the default tilt', () => {
    const backRowFront = AREA_BACK_INSET + BAY_D;
    const frontRowBack = AREA_DEPTH + AISLE_Z + AREA_BACK_INSET;
    const gap = frontRowBack - backRowFront;
    expect(BAY_H * Math.tan(STOCKROOM_POLAR_DEFAULT)).toBeLessThan(gap);
  });

  it('frames an area from the floor to the sign top', () => {
    const area = planStockroom([unit('a', 4)]).areas[0];
    const box = areaFocusBox(area);
    expect(box.min[1]).toBe(0);
    expect(box.max[1]).toBe(SIGN_TOP_Y);
    expect(box.max[0] - box.min[0]).toBeGreaterThanOrEqual(BAY_W);
  });

  it('wraps the room around all areas', () => {
    const plan = planStockroom([unit('a', 4), unit('b', 30)]);
    expect(plan.room.minX).toBeLessThan(plan.bounds.minX);
    expect(plan.room.maxZ).toBeGreaterThan(plan.bounds.maxZ);
  });
});
