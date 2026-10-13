import { SOLD_OUT_BADGE_H } from './garment-hanger';
import { soldOutBadgeScale } from './sold-out-scale';

describe('soldOutBadgeScale', () => {
  it('stays world-fixed so Ver todas / close-up / mobile never inflate the ribbon', () => {
    expect(soldOutBadgeScale(1.2, 38, 800, SOLD_OUT_BADGE_H)).toBe(1);
    expect(soldOutBadgeScale(14, 38, 800, SOLD_OUT_BADGE_H)).toBe(1);
    expect(soldOutBadgeScale(4, 38, 415, SOLD_OUT_BADGE_H)).toBe(1);
  });
});
