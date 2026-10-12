import {
  computeEyeLevelFit,
  easeInOutCubic,
  formatStockLabel,
  photoPlaneSize,
  rackNavItems,
  stepRackIndex,
} from './camera-guide';

describe('stepRackIndex', () => {
  it('clamps at the ends', () => {
    expect(stepRackIndex(0, -1, 4)).toBe(0);
    expect(stepRackIndex(3, 1, 4)).toBe(3);
    expect(stepRackIndex(1, 1, 4)).toBe(2);
  });
});

describe('rackNavItems', () => {
  it('keeps collection order and indexes', () => {
    expect(rackNavItems([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])).toEqual([
      { id: 'a', name: 'A', index: 0 },
      { id: 'b', name: 'B', index: 1 },
    ]);
  });
});

describe('formatStockLabel', () => {
  it('describes stock in Portuguese', () => {
    expect(formatStockLabel(0)).toBe('Sem estoque');
    expect(formatStockLabel(1)).toBe('1 unidade');
    expect(formatStockLabel(4)).toBe('4 unidades');
  });
});

describe('easeInOutCubic', () => {
  it('starts and ends on the endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe('computeEyeLevelFit', () => {
  const box = { minX: 0, maxX: 3, minY: -0.2, maxY: 1.4, minZ: -0.1, maxZ: 0.1 };

  it('places the rack camera closer than overview and above the floor', () => {
    const rack = computeEyeLevelFit(box, 16 / 9, 38, 'rack');
    const all = computeEyeLevelFit(box, 16 / 9, 38, 'overview');
    expect(rack.distance).toBeLessThan(all.distance);
    expect(rack.target.y).toBeCloseTo((box.minY + box.maxY) / 2, 1);
    expect(rack.position.z).toBeGreaterThan(rack.target.z);
    expect(rack.position.y).toBeGreaterThan(-0.45);
  });

  it('fits a tall 3-row rack without the old 4.6 distance cap', () => {
    const tall = { minX: -1.6, maxX: 1.6, minY: -0.2, maxY: 3.2, minZ: -0.1, maxZ: 0.1 };
    const rack = computeEyeLevelFit(tall, 16 / 9, 38, 'rack');
    expect(rack.distance).toBeGreaterThan(4.6);
    expect(rack.target.y).toBeCloseTo((tall.minY + tall.maxY) / 2, 1);
  });

  it('pulls back for a wide overview so every rack stays in frame', () => {
    const wide = { minX: -1, maxX: 16, minY: -0.2, maxY: 3.2, minZ: -0.1, maxZ: 0.1 };
    const all = computeEyeLevelFit(wide, 16 / 9, 38, 'overview');
    expect(all.distance).toBeGreaterThan(8);
    expect(all.distance).toBeLessThan(28);
  });
});

describe('photoPlaneSize', () => {
  it('keeps the photo aspect inside the hanger max box', () => {
    const portrait = photoPlaneSize(900, 1200, 0.48, 0.64);
    expect(portrait.width / portrait.height).toBeCloseTo(0.75, 5);
    expect(portrait.height).toBeLessThanOrEqual(0.64);
    expect(portrait.width).toBeLessThanOrEqual(0.48);
  });
});
