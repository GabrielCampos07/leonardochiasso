import { indexFromClientY, itemMidpoints, resolveCdkDropIndex } from './cdk-drop-index';

describe('itemMidpoints / indexFromClientY', () => {
  const mids = itemMidpoints([
    { top: 0, bottom: 80 },
    { top: 80, bottom: 160 },
    { top: 160, bottom: 240 },
  ]);

  it('uses the vertical midpoint of each row', () => {
    expect(mids).toEqual([40, 120, 200]);
  });

  it('maps a pointer below U1 to U1’s index', () => {
    expect(indexFromClientY(210, mids)).toBe(2);
  });
});

describe('resolveCdkDropIndex', () => {
  const mids = [40, 120, 200];

  it('keeps CDK’s index when it already moved', () => {
    expect(
      resolveCdkDropIndex({ previousIndex: 0, currentIndex: 2, distance: { y: 180 } }, 3, mids),
    ).toBe(2);
  });

  it('recomputes from dropPoint when a long drag reports no index change', () => {
    expect(
      resolveCdkDropIndex(
        {
          previousIndex: 0,
          currentIndex: 0,
          distance: { y: 190 },
          dropPoint: { x: 20, y: 210 },
        },
        3,
        mids,
      ),
    ).toBe(2);
  });

  it('does not invent a move for a short tap on the same row', () => {
    expect(
      resolveCdkDropIndex(
        {
          previousIndex: 1,
          currentIndex: 1,
          distance: { y: 4 },
          dropPoint: { x: 20, y: 125 },
        },
        3,
        mids,
      ),
    ).toBe(1);
  });
});
