import { clampCreatePanel, isCreateSheetViewport, pieceModalFromHangerClick } from './admin-3d-page';

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
