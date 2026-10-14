import {
  REORDER_AUTOSCROLL_MIN_PIECES,
  applyHangerOrder,
  autoScrollDelta,
  dropIndexForSlug,
  dropTargetSlug,
  moveSlug,
  moveSlugById,
  reorderRackHangers,
  sameSlugOrder,
} from './stockroom-piece-order';
import type { SceneHanger, SceneLayout } from '../../../scene-engine/types';

function hanger(slug: string): SceneHanger {
  return {
    productId: slug,
    slug,
    name: slug,
    imageUrl: null,
    stockQty: 1,
    priceLabel: '',
    status: 'active',
    rackId: 'organic-dreams',
    kind: 'garment',
  };
}

describe('stockroom piece order', () => {
  it('moves a slug to another index', () => {
    expect(moveSlug(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveSlug(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveSlug(['a', 'b'], 0, 0)).toEqual(['a', 'b']);
  });

  it('moves one step by id for the keyboard path', () => {
    expect(moveSlugById(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveSlugById(['a', 'b', 'c'], 'a', -1)).toBeNull();
    expect(moveSlugById(['a', 'b', 'c'], 'gone', 1)).toBeNull();
  });

  it('picks the piece under the pointer and its index', () => {
    const rects = [
      { slug: 'a', x: 0, y: 0, w: 80, h: 100 },
      { slug: 'b', x: 100, y: 0, w: 80, h: 100 },
    ];
    expect(dropTargetSlug(120, 40, rects, 'a')).toBe('b');
    expect(dropTargetSlug(20, 40, rects, 'a')).toBeNull();
    expect(dropIndexForSlug(['a', 'b', 'c'], 'c')).toBe(2);
    expect(dropIndexForSlug(['a', 'b'], 'gone')).toBeNull();
  });

  it('auto-scrolls at the edges only when the collection has 10+ pieces', () => {
    expect(REORDER_AUTOSCROLL_MIN_PIECES).toBe(10);
    expect(autoScrollDelta(10, 0, 800, 17, true, true)).toBe(-1);
    expect(autoScrollDelta(790, 0, 800, 17, true, true)).toBe(1);
    expect(autoScrollDelta(10, 0, 800, 6, true, true)).toBe(0);
    expect(autoScrollDelta(10, 0, 800, 17, false, true)).toBe(0);
  });

  it('rewrites one rack hanger list and leaves the others alone', () => {
    const layout: SceneLayout = {
      racks: [
        { id: 'organic-dreams', name: 'Organic', kind: 'rack', sortOrder: 1, hangers: [hanger('a'), hanger('b'), hanger('c')] },
        { id: 'other', name: 'Other', kind: 'rack', sortOrder: 2, hangers: [hanger('z')] },
      ],
    };
    const next = reorderRackHangers(layout, 'organic-dreams', ['c', 'a', 'b']);
    expect(next?.racks[0]?.hangers.map((h) => h.slug)).toEqual(['c', 'a', 'b']);
    expect(next?.racks[1]?.hangers.map((h) => h.slug)).toEqual(['z']);
    expect(applyHangerOrder(layout.racks[0]!.hangers, ['a', 'gone'])).toBeNull();
    expect(sameSlugOrder(['a', 'b'], ['a', 'b'])).toBeTrue();
    expect(sameSlugOrder(['a', 'b'], ['b', 'a'])).toBeFalse();
  });
});
