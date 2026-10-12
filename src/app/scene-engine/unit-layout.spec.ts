import { rackWidth } from './collection-rack';
import { vitrineWidth } from './jewelry-vitrine';
import { nextDraftSlot, UNIT_GAP, unitWidth } from './unit-layout';

describe('nextDraftSlot', () => {
  it('places the first unit at half its width', () => {
    const slot = nextDraftSlot([], 'rack');
    expect(slot.width).toBe(rackWidth(0));
    expect(slot.x).toBeCloseTo(slot.width / 2, 5);
  });

  it('appends after existing units with the shared gap', () => {
    const units = [
      { kind: 'rack' as const, hangers: { length: 2 } },
      { kind: 'rack' as const, hangers: { length: 1 } },
    ];
    const slot = nextDraftSlot(units, 'vitrine');
    const expected =
      unitWidth('rack', 2) + UNIT_GAP + unitWidth('rack', 1) + UNIT_GAP + vitrineWidth(0) / 2;
    expect(slot.x).toBeCloseTo(expected, 5);
    expect(slot.width).toBe(vitrineWidth(0));
  });
});
