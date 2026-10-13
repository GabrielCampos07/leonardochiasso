import { rackIdFromHits, rackIdFromObject } from './rack-pick';

describe('rackIdFromObject', () => {
  it('walks up to the unit group', () => {
    const rack = { userData: { kind: 'rack', rackId: 'organic-dreams' } };
    const decor = { userData: { kind: 'rack-decor', ignorePick: true }, parent: rack };
    expect(rackIdFromObject(decor)).toBe('organic-dreams');
  });

  it('resolves a vitrine unit', () => {
    expect(rackIdFromObject({ userData: { kind: 'vitrine', rackId: 'vitrine:gioielli' } })).toBe(
      'vitrine:gioielli',
    );
  });
});

describe('rackIdFromHits', () => {
  it('returns the closest unit', () => {
    const organic = { userData: { kind: 'rack', rackId: 'organic-dreams' } };
    const none = { userData: { kind: 'rack', rackId: '__none__' } };
    expect(rackIdFromHits([{ object: organic }, { object: none }])).toBe('organic-dreams');
  });
});
