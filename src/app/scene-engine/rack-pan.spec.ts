import { HANGER_SPACING, RACK_FRAME_COLUMNS, rackFrameWidth, rackPanRange } from './collection-rack';
import {
  EMPTY_RACK_PAN,
  RACK_EDGE_CUT,
  clampRackPan,
  rackArrowDelta,
  rackLookFrame,
  rackPanLabel,
  rackPanProgress,
  rackStartPanX,
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
  it('clips the right edge at the start so the last visible piece is cut', () => {
    const start = rackLookFrame(19, rackStartPanX(19));
    const full = rackFrameWidth(19);
    expect(RACK_EDGE_CUT).toBeGreaterThan(0.2);
    expect(start.halfW * 2).toBeLessThan(full);
    expect(start.offset).toBeLessThan(0);
    expect(start.offset + start.halfW).toBeCloseTo(rackStartPanX(19) + full / 2 - RACK_EDGE_CUT, 5);
  });

  it('clips the left edge at the end of the rail', () => {
    const end = rackLookFrame(19, rackPanRange(19));
    const full = rackFrameWidth(19);
    expect(end.offset - end.halfW).toBeCloseTo(rackPanRange(19) - full / 2 + RACK_EDGE_CUT, 5);
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
  });
});
