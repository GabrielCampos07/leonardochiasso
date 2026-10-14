import {
  STOCKROOM_B_HINT_COPY,
  STOCKROOM_HINT_COPY,
  STOCKROOM_MIN_WIDTH,
  adminSceneMode,
  isDesktopOnlyBlocked,
  isStockroomMode,
  sceneNeedsCredits,
} from './admin-3d-scene-mode';

function params(query: string): { get(name: string): string | null } {
  const search = new URLSearchParams(query);
  return { get: (name) => search.get(name) };
}

describe('adminSceneMode', () => {
  it('keeps the current atelier when no option flag is set', () => {
    expect(adminSceneMode(params(''))).toBe('atelier');
    expect(adminSceneMode(params('mock=1'))).toBe('atelier');
    expect(adminSceneMode(params('cc0=0'))).toBe('atelier');
  });

  it('mounts option A with ?cc0=1 and option B with ?sketchfab=1', () => {
    expect(adminSceneMode(params('cc0=1'))).toBe('cc0');
    expect(adminSceneMode(params('cc0=true&mock=1'))).toBe('cc0');
    expect(adminSceneMode(params('sketchfab=1'))).toBe('sketchfab');
    expect(adminSceneMode(params('cc0=1&sketchfab=1'))).toBe('cc0');
  });
});

describe('isDesktopOnlyBlocked', () => {
  it('blocks options A/B below 1280px and never the default atelier', () => {
    expect(STOCKROOM_MIN_WIDTH).toBe(1280);
    expect(isDesktopOnlyBlocked('cc0', 1279)).toBeTrue();
    expect(isDesktopOnlyBlocked('cc0', 1280)).toBeFalse();
    expect(isDesktopOnlyBlocked('sketchfab', 900)).toBeTrue();
    expect(isDesktopOnlyBlocked('atelier', 390)).toBeFalse();
  });
});

describe('isStockroomMode / sceneNeedsCredits', () => {
  it('treats both options as stockrooms and only B needs a Créditos screen', () => {
    expect(isStockroomMode('cc0')).toBeTrue();
    expect(isStockroomMode('sketchfab')).toBeTrue();
    expect(isStockroomMode('atelier')).toBeFalse();
    expect(sceneNeedsCredits('sketchfab')).toBeTrue();
    expect(sceneNeedsCredits('cc0')).toBeFalse();
    expect(sceneNeedsCredits('atelier')).toBeFalse();
  });
});

describe('stockroom hint copy', () => {
  it('names the stockroom gestures and stays free of Fechar', () => {
    for (const copy of [STOCKROOM_HINT_COPY, STOCKROOM_B_HINT_COPY]) {
      expect(copy).toContain('Clique');
      expect(copy).toContain('scroll');
      expect(copy).not.toMatch(/fechar/i);
    }
    expect(STOCKROOM_B_HINT_COPY).toContain('peça');
  });
});
