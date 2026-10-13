import { mannequinOffset } from './featured-mannequin';

describe('mannequinOffset', () => {
  it('keeps the dress form inside the unit width so it cannot overlap the next rack', () => {
    const width = 2.2;
    const offset = mannequinOffset(width, 'rack');
    expect(offset.x).toBeLessThan(width / 2);
    expect(offset.x).toBeGreaterThan(0);
    expect(offset.z).toBeLessThan(-0.4);
  });
});
