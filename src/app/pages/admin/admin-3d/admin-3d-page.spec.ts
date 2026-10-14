import {
  ATELIER_HINT_COPY,
  clampCreatePanel,
  isCreateSheetViewport,
  pieceModalFromHangerClick,
  rackCounterLabel,
} from './admin-3d-page';
import { collectionSwitcherItems } from '../../../scene-engine/camera-guide';
import { rackArrowDelta, rackPanProgress, rackStartPanX } from '../../../scene-engine/rack-pan';

describe('clampCreatePanel', () => {
  it('keeps the floating panel on a desktop viewport', () => {
    const pos = clampCreatePanel(2000, 2000, { width: 1280, height: 800 });
    expect(pos.x).toBeLessThan(1280);
    expect(pos.y).toBeLessThan(800);
    expect(pos.x).toBeGreaterThanOrEqual(8);
    expect(pos.y).toBeGreaterThanOrEqual(8);
  });

  it('pins the panel above the guide on compact viewports', () => {
    const pos = clampCreatePanel(400, 10, { width: 415, height: 800 });
    expect(pos.y).toBe(72);
    expect(pos.x).toBeGreaterThanOrEqual(8);
    expect(pos.x + 280).toBeLessThanOrEqual(415);
  });
});

describe('isCreateSheetViewport', () => {
  it('treats 768px and below as a bottom sheet', () => {
    expect(isCreateSheetViewport(768)).toBeTrue();
    expect(isCreateSheetViewport(1280)).toBeFalse();
  });
});

describe('rack pan chrome', () => {
  it('exposes a discreet X de N label and custom arrow deltas', () => {
    expect(rackPanProgress(19, rackStartPanX(19)).label).toBe('8 de 19');
    expect(rackArrowDelta('ArrowLeft')).toBe(-1);
    expect(rackArrowDelta('ArrowRight')).toBe(1);
  });
});

describe('atelier hint copy', () => {
  it('is only the gesture line — Fechar stays off the hint', () => {
    expect(ATELIER_HINT_COPY).not.toMatch(/fechar/i);
    expect(ATELIER_HINT_COPY).toContain('Clique');
  });
});

describe('collection switcher', () => {
  it('lists Ver todas plus each rack and never uses a native select', () => {
    const items = collectionSwitcherItems([
      { id: 'organic-dreams', name: 'Organic Dreams' },
      { id: 'niponic-dreams', name: 'Niponic Dreams' },
    ]);
    expect(items[0]).toEqual({ id: 'all', name: 'Ver todas' });
    expect(items.map((item) => item.name)).toEqual(['Ver todas', 'Organic Dreams', 'Niponic Dreams']);
  });
});

describe('pieceModalFromHangerClick', () => {
  it('opens the edit modal for a picked hanger slug without waiting on a fetch', () => {
    expect(pieceModalFromHangerClick('vestido-lg-bateau')).toEqual({
      open: true,
      slug: 'vestido-lg-bateau',
    });
  });

  it('does not open while creating a collection or adding pieces', () => {
    expect(pieceModalFromHangerClick('vestido-lg-bateau', { creating: true })).toEqual({ open: false });
    expect(pieceModalFromHangerClick('vestido-lg-bateau', { adding: true })).toEqual({ open: false });
    expect(pieceModalFromHangerClick(null)).toEqual({ open: false });
  });
});

describe('rackCounterLabel', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('counts the focused collection out of all of them', () => {
    expect(rackCounterLabel(items, 'a')).toBe('1/3');
    expect(rackCounterLabel(items, 'c')).toBe('3/3');
  });

  it('shows the total on the overview and 0/0 without collections', () => {
    expect(rackCounterLabel(items, '__overview__')).toBe('3');
    expect(rackCounterLabel([], 'a')).toBe('0/0');
  });
});
