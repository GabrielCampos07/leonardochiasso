import {
  STOCKROOM_HINT_COPY,
  STOCKROOM_MIN_WIDTH,
  adminSceneMode,
  isDesktopOnlyBlocked,
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

describe('stockroom hint copy', () => {
  it('names the stockroom gestures and stays free of Fechar', () => {
    expect(STOCKROOM_HINT_COPY).toContain('Clique');
    expect(STOCKROOM_HINT_COPY).toContain('scroll');
    expect(STOCKROOM_HINT_COPY).not.toMatch(/fechar/i);
  });
});
