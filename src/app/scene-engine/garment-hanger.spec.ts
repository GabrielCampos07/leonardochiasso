import { SOLD_OUT_BADGE_H, SOLD_OUT_BADGE_W } from './garment-hanger';

describe('garment hanger sold-out badge', () => {
  it('is large enough to read on hangers', () => {
    expect(SOLD_OUT_BADGE_W).toBeGreaterThanOrEqual(0.28);
    expect(SOLD_OUT_BADGE_H).toBeGreaterThanOrEqual(0.1);
  });
});
