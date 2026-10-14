import {
  PIECE_ORDER_SAVED_TEXT,
  PIECE_REORDER_KEYSHORTCUTS,
  flashPieceOrderSaved,
  REORDER_AUTOSCROLL_MIN_PIECES,
  applyHangerOrder,
  autoScrollDelta,
  consumePieceReorderKey,
  saveFromKeyboardReorder,
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
  it('toasts Ordem salva when a drag or keyboard save succeeds', () => {
    const toast = { success: jasmine.createSpy('success') };
    flashPieceOrderSaved(toast);
    expect(PIECE_ORDER_SAVED_TEXT).toBe('Ordem salva');
    expect(toast.success).toHaveBeenCalledOnceWith('Ordem salva');
  });

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

  it('calls preventDefault and stopPropagation when a piece is focused', () => {
    expect(PIECE_REORDER_KEYSHORTCUTS).toBe('Shift+ArrowLeft Shift+ArrowRight');
    const piece = document.createElement('div');
    piece.setAttribute('data-slug', 'a');
    document.body.appendChild(piece);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const prevent = spyOn(event, 'preventDefault').and.callThrough();
    const stop = spyOn(event, 'stopPropagation').and.callThrough();
    Object.defineProperty(event, 'target', { value: piece });
    expect(consumePieceReorderKey(event)).toEqual({ slug: 'a', delta: 1 });
    expect(prevent).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    piece.remove();
  });

  it('triggers the same save as drop immediately on Shift+arrow (not debounced)', () => {
    const piece = document.createElement('div');
    piece.setAttribute('data-slug', 'b');
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: piece });
    const save = jasmine.createSpy('save');
    expect(
      saveFromKeyboardReorder(event, [{ id: 'organic-dreams', slugs: ['a', 'b', 'c'] }], save),
    ).toBeTrue();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('organic-dreams', ['a', 'b', 'c'], ['a', 'c', 'b']);
    piece.remove();
  });

  it('does not consume Alt+arrows (browser history) or arrows without a focused piece', () => {
    const piece = document.createElement('div');
    piece.setAttribute('data-slug', 'a');
    document.body.appendChild(piece);
    const alt = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventAlt = spyOn(alt, 'preventDefault');
    Object.defineProperty(alt, 'target', { value: piece });
    expect(consumePieceReorderKey(alt)).toBeNull();
    expect(preventAlt).not.toHaveBeenCalled();

    const bare = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventBare = spyOn(bare, 'preventDefault');
    expect(consumePieceReorderKey(bare)).toBeNull();
    expect(preventBare).not.toHaveBeenCalled();
    piece.remove();
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
