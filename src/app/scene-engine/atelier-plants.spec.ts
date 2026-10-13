import { plantOffsets } from './atelier-plants';

describe('atelier plants', () => {
  it('keeps both pots behind the hanger line', () => {
    for (const pot of plantOffsets(2.6)) {
      expect(pot.z).toBeLessThan(-0.4);
      expect(Math.abs(pot.x)).toBeGreaterThan(1.2);
    }
  });
});
