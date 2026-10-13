import {
  HANGER_SPACING,
  RACK_FRAME_COLUMNS,
  RACK_FRAME_COLUMNS_COMPACT,
  rackFrameWidth,
  rackPanRange,
} from './collection-rack';
import {
  EMPTY_RACK_PAN,
  RACK_EDGE_CUT,
  clampRackPan,
  rackArrowDelta,
  rackLookFrame,
  rackPanLabel,
  hangerInVisibleWindow,
  rackPanProgress,
  isPinchZoomEvent,
  rackStartPanX,
  rackVisibleColumnRange,
  shouldBlockWheelZoom,
  shouldPanRackOnWheel,
  wheelPanPixels,
} from './rack-pan';

describe('rackPanProgress', () => {
  it('reads 8 de 19 at the left of a 19-piece rack', () => {
    const start = rackPanProgress(19, rackStartPanX(19));
    expect(start.showChrome).toBeTrue();
    expect(start.canPrev).toBeFalse();
    expect(start.canNext).toBeTrue();
    expect(start.last).toBe(RACK_FRAME_COLUMNS);
    expect(start.label).toBe('8 de 19');
  });

  it('lands on 19 de 19 at the right end', () => {
    const end = rackPanProgress(19, rackPanRange(19));
    expect(end.canNext).toBeFalse();
    expect(end.canPrev).toBeTrue();
    expect(end.label).toBe('19 de 19');
  });

  it('reads 4 de 17 at the left of a compact 17-piece rack', () => {
    const start = rackPanProgress(17, rackStartPanX(17, RACK_FRAME_COLUMNS_COMPACT), RACK_FRAME_COLUMNS_COMPACT);
    expect(start.showChrome).toBeTrue();
    expect(start.last).toBe(RACK_FRAME_COLUMNS_COMPACT);
    expect(start.label).toBe('4 de 17');
  });

  it('derives the counter from pan offset in both directions', () => {
    const start19 = rackStartPanX(19);
    expect(rackPanProgress(19, start19 + HANGER_SPACING).last).toBe(9);
    expect(rackPanProgress(19, start19).last).toBe(8);
    expect(rackPanProgress(19, rackPanRange(19)).last).toBe(19);
    const start21 = rackStartPanX(21);
    expect(rackPanProgress(21, start21 + HANGER_SPACING * 2).last).toBe(10);
    expect(rackPanProgress(21, start21 + HANGER_SPACING * 2).label).toBe('10 de 21');
    expect(rackPanProgress(21, start21 + HANGER_SPACING).last).toBe(9);
    expect(rackPanProgress(21, start21).last).toBe(8);
  });

  it('hides chrome when the rack fits in one frame', () => {
    const fit = rackPanProgress(8, 0);
    expect(fit.showChrome).toBeFalse();
    expect(fit.canPrev).toBeFalse();
    expect(fit.canNext).toBeFalse();
    expect(fit.label).toBe('8 de 8');
  });

  it('returns an empty state for an unused rail', () => {
    expect(rackPanProgress(0)).toEqual(EMPTY_RACK_PAN);
    expect(rackPanLabel(0, 0)).toBe('');
  });
});

describe('rackLookFrame', () => {
  it('centers the framed window on the pan so the rack does not slide right', () => {
    const start = rackLookFrame(19, rackStartPanX(19));
    const full = rackFrameWidth(19);
    expect(RACK_EDGE_CUT).toBeGreaterThan(0.2);
    expect(start.offset).toBeCloseTo(rackStartPanX(19), 5);
    expect(start.halfW * 2).toBeLessThan(full);
    expect(start.halfW * 2).toBeGreaterThan(full * 0.7);
  });

  it('keeps the same half-width at the end of the rail', () => {
    const start = rackLookFrame(19, rackStartPanX(19));
    const end = rackLookFrame(19, rackPanRange(19));
    expect(end.offset).toBeCloseTo(rackPanRange(19), 5);
    expect(end.halfW).toBeCloseTo(start.halfW, 5);
  });
});

describe('rackVisibleColumnRange', () => {
  it('starts a 19-piece rail on the first eight columns', () => {
    const { firstCol, lastCol } = rackVisibleColumnRange(19, rackStartPanX(19));
    expect(firstCol).toBe(0);
    expect(lastCol).toBeGreaterThanOrEqual(7);
    expect(hangerInVisibleWindow(0, 19, rackStartPanX(19))).toBeTrue();
    expect(hangerInVisibleWindow(18, 19, rackStartPanX(19))).toBeFalse();
  });
});

describe('pan input helpers', () => {
  it('clamps pan to the rail range', () => {
    expect(clampRackPan(4, 1.2)).toBe(1.2);
    expect(clampRackPan(-9, 1.2)).toBe(-1.2);
    expect(clampRackPan(0.3, 0)).toBe(0);
  });

  it('maps arrow keys and wheel deltas for lateral pan', () => {
    expect(rackArrowDelta('ArrowLeft')).toBe(-1);
    expect(rackArrowDelta('ArrowRight')).toBe(1);
    expect(rackArrowDelta('Enter')).toBe(0);
    expect(wheelPanPixels({ deltaX: 40, deltaY: 8, deltaMode: 0 })).toBe(40);
    expect(wheelPanPixels({ deltaX: 0, deltaY: 80, deltaMode: 0 })).toBe(80);
    expect(wheelPanPixels({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toBe(48);
    expect(HANGER_SPACING).toBeGreaterThan(0.5);
    expect(isPinchZoomEvent({ ctrlKey: true })).toBeTrue();
    expect(shouldBlockWheelZoom({ overRack: true, pinch: false })).toBeTrue();
    expect(shouldBlockWheelZoom({ overRack: true, pinch: true })).toBeFalse();
    expect(shouldBlockWheelZoom({ overRack: false, pinch: false })).toBeFalse();
    expect(shouldPanRackOnWheel({ overRack: true, pinch: false, panRange: 2 })).toBeTrue();
    expect(shouldPanRackOnWheel({ overRack: true, pinch: true, panRange: 2 })).toBeFalse();
    expect(shouldPanRackOnWheel({ overRack: false, pinch: false, panRange: 2 })).toBeFalse();
    expect(shouldPanRackOnWheel({ overRack: true, pinch: false, panRange: 0 })).toBeFalse();
  });
});
