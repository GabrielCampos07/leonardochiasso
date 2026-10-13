import { pointInScreenRect, screenRectFromPoints, wheelOverRackRects, worldBoxCorners } from './rack-screen';

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
});
