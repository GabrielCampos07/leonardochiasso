import {
  FOCUS_WHEEL_PAD_PX,
  pointInScreenRect,
  screenRectFromPoints,
  unionScreenRects,
  wheelOverRackRects,
  worldBoxCorners,
  worldBoxFrontCorners,
} from './rack-screen';

describe('rack screen AABB', () => {
  it('builds a screen rect from projected corners', () => {
    const rect = screenRectFromPoints([
      { x: 120, y: 80 },
      { x: 400, y: 90 },
      { x: 110, y: 300 },
      { x: 390, y: 310 },
    ]);
    expect(rect).toEqual({ left: 110, right: 400, top: 80, bottom: 310 });
  });

  it('hits gaps inside the rectangle, not only mesh pixels', () => {
    const rack = { left: 40, right: 360, top: 120, bottom: 420 };
    expect(pointInScreenRect(200, 270, rack)).toBeTrue();
    expect(pointInScreenRect(41, 121, rack)).toBeTrue();
    expect(pointInScreenRect(20, 270, rack)).toBeFalse();
    expect(wheelOverRackRects(200, 270, [rack])).toBeTrue();
    expect(wheelOverRackRects(10, 10, [rack])).toBeFalse();
  });

  it('lists the eight world-box corners', () => {
    expect(worldBoxCorners({ minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 })).toHaveSize(8);
  });

  it('projects only the front face so a deep box does not balloon sideways', () => {
    const box = { minX: 0, maxX: 2, minY: 0, maxY: 1, minZ: -3, maxZ: 0.2 };
    const front = worldBoxFrontCorners(box);
    expect(front).toHaveSize(4);
    expect(front.every((c) => c.z === 0.2)).toBeTrue();
    expect(FOCUS_WHEEL_PAD_PX).toBeLessThanOrEqual(10);
    expect(FOCUS_WHEEL_PAD_PX).toBeGreaterThan(0);
  });

  it('unions a rack silhouette with its rug', () => {
    const rack = { left: 80, right: 300, top: 100, bottom: 360 };
    const rug = { left: 70, right: 310, top: 340, bottom: 410 };
    expect(unionScreenRects(rack, rug)).toEqual({ left: 70, right: 310, top: 100, bottom: 410 });
    expect(unionScreenRects(null, rack)).toEqual(rack);
  });

  it('keeps a point just outside the focused pad as a miss', () => {
    const rack = { left: 120, right: 280, top: 140, bottom: 400 };
    expect(wheelOverRackRects(120 - FOCUS_WHEEL_PAD_PX, 270, [rack], FOCUS_WHEEL_PAD_PX)).toBeTrue();
    expect(wheelOverRackRects(120 - FOCUS_WHEEL_PAD_PX - 2, 270, [rack], FOCUS_WHEEL_PAD_PX)).toBeFalse();
  });
});
