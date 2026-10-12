import { mannequinOffset } from './featured-mannequin';

describe('featured mannequin placement', () => {
  it('stays beside the unit and behind hangers', () => {
    const rack = mannequinOffset(2.6, 'rack');
    const vitrine = mannequinOffset(1.7, 'vitrine');
    expect(rack.z).toBeLessThan(0);
    expect(vitrine.z).toBeLessThan(0);
    expect(rack.x).toBeGreaterThan(1.2);
    expect(vitrine.x).toBeGreaterThan(0.8);
  });
});
