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
  const box = { minX: 0, maxX: 3, minY: -0.6, maxY: 1.2, minZ: -0.1, maxZ: 0.1 };

  it('places the rack camera at eye level, closer than overview', () => {
    const rack = computeEyeLevelFit(box, 16 / 9, 38, 'rack');
    const all = computeEyeLevelFit(box, 16 / 9, 38, 'overview');
    expect(rack.position.y).toBeLessThan(all.position.y + 0.4);
    expect(rack.distance).toBeLessThan(all.distance);
    expect(rack.target.y).toBeLessThan((box.minY + box.maxY) / 2);
    expect(rack.position.z).toBeGreaterThan(rack.target.z);
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
