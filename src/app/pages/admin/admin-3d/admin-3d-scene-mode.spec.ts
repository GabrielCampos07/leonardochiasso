import {
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
  it('mounts the Sketchfab stockroom with no flag', () => {
    expect(adminSceneMode(params(''))).toBe('stockroom');
    expect(adminSceneMode(params('mock=1'))).toBe('stockroom');
  });

  it('keeps ?sketchfab=1 as an alias and sends the retired ?cc0=1 to the same scene', () => {
    expect(adminSceneMode(params('sketchfab=1'))).toBe('stockroom');
    expect(adminSceneMode(params('cc0=1'))).toBe('stockroom');
    expect(adminSceneMode(params('cc0=true&mock=1'))).toBe('stockroom');
  });

  it('mounts the previous atelier only with ?atelier=1', () => {
    expect(adminSceneMode(params('atelier=1'))).toBe('atelier');
    expect(adminSceneMode(params('atelier=0'))).toBe('stockroom');
  });
});

describe('isDesktopOnlyBlocked', () => {
  it('blocks the stockroom below 1280px and never the atelier', () => {
    expect(STOCKROOM_MIN_WIDTH).toBe(1280);
    expect(isDesktopOnlyBlocked('stockroom', 1279)).toBeTrue();
    expect(isDesktopOnlyBlocked('stockroom', 1280)).toBeFalse();
    expect(isDesktopOnlyBlocked('atelier', 390)).toBeFalse();
  });
});

describe('isStockroomMode / sceneNeedsCredits', () => {
  it('treats the default scene as the stockroom, which needs a Créditos screen', () => {
    expect(isStockroomMode('stockroom')).toBeTrue();
    expect(isStockroomMode('atelier')).toBeFalse();
    expect(sceneNeedsCredits('stockroom')).toBeTrue();
    expect(sceneNeedsCredits('atelier')).toBeFalse();
  });
});

describe('stockroom hint copy', () => {
  it('names the stockroom gestures and stays free of Fechar', () => {
    expect(STOCKROOM_HINT_COPY).toContain('Clique na peça');
    expect(STOCKROOM_HINT_COPY).toContain('scroll');
    expect(STOCKROOM_HINT_COPY).not.toMatch(/fechar/i);
  });
});
