import { SOLD_OUT_BADGE_H } from './garment-hanger';
import { SOLD_OUT_MIN_TEXT_PX, SOLD_OUT_TEXT_RATIO, soldOutBadgeScale } from './sold-out-scale';

function textPx(distance: number, fov: number, viewportH: number, badgeH: number, scale: number): number {
  const worldPerPx = (2 * distance * Math.tan((fov * Math.PI) / 360)) / viewportH;
  return (badgeH * SOLD_OUT_TEXT_RATIO * scale) / worldPerPx;
}

describe('soldOutBadgeScale', () => {
  const fov = 38;
  const viewportH = 800;

  it('keeps the designed size when the camera is close', () => {
    expect(soldOutBadgeScale(1.2, fov, viewportH, SOLD_OUT_BADGE_H)).toBe(1);
  });

  it('grows with distance so the text stays around 14px', () => {
    const far = 14;
    const scale = soldOutBadgeScale(far, fov, viewportH, SOLD_OUT_BADGE_H);
    expect(scale).toBeGreaterThan(1);
    expect(textPx(far, fov, viewportH, SOLD_OUT_BADGE_H, scale)).toBeGreaterThanOrEqual(SOLD_OUT_MIN_TEXT_PX - 0.05);
  });
});
