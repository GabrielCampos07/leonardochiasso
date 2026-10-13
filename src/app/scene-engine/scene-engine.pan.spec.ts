import { createSceneEngine } from './scene-engine';
import { rackPanRange } from './collection-rack';
import type { SceneLayout } from './types';

function rackLayout(id: string, count: number): SceneLayout {
  return {
    racks: [
      {
        id,
        name: id,
        sortOrder: 0,
        kind: 'rack',
        hangers: Array.from({ length: count }, (_, i) => ({
          productId: `p${i}`,
          slug: `peca-${i}`,
          name: `Peça ${i}`,
          imageUrl: null,
          stockQty: 1,
          priceLabel: 'R$ 1,00',
          status: 'published',
          rackId: id,
          kind: 'garment' as const,
        })),
      },
    ],
  };
}

function longRackLayout(): SceneLayout {
  return rackLayout('niponic-dreams', 19);
}

function organicLayout(): SceneLayout {
  return rackLayout('organic-dreams', 8);
}

describe('SceneEngine lateral pan', () => {
  it('pans a 19-piece rack and stops at the rail end', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(longRackLayout());
    engine.focusRack('niponic-dreams', true);
    expect(rackPanRange(19)).toBeGreaterThan(0);
    expect(engine.canPan(-1)).toBeFalse();
    expect(engine.canPan(1)).toBeTrue();
    expect(engine.rackPanState().label).toBe('8 de 19');
    expect(engine.panRack(1)).toBeTrue();
    let steps = 0;
    while (engine.panRack(1) && steps < 20) steps += 1;
    expect(engine.canPan(1)).toBeFalse();
    expect(engine.canPan(-1)).toBeTrue();
    expect(engine.rackPanState().label).toBe('19 de 19');
    engine.dispose();
    canvas.remove();
  });

  it('pans from a mouse wheel on the canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(longRackLayout());
    engine.focusRack('niponic-dreams', true);
    expect(engine.rackPanState().label).toBe('8 de 19');
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true }));
    expect(engine.canPan(-1)).toBeTrue();
    expect(engine.rackPanState().last).toBeGreaterThan(8);
    engine.dispose();
    canvas.remove();
  });

  it('keeps a ctrl+wheel / pinch as zoom even over a long rack', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(longRackLayout());
    engine.focusRack('niponic-dreams', true);
    const beforePan = engine.rackPanState().last;
    const beforeDist = engine.orbitDistance();
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -400,
        ctrlKey: true,
        clientX: rect.left + 200,
        clientY: rect.top + 180,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(engine.rackPanState().last).toBe(beforePan);
    expect(engine.orbitDistance()).toBeLessThan(beforeDist);
    engine.dispose();
    canvas.remove();
  });

  it('does not dolly when the wheel is over a short rack that cannot pan', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(organicLayout());
    engine.focusRack('organic-dreams', true);
    expect(engine.canPan(1)).toBeFalse();
    const before = engine.orbitDistance();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, bubbles: true, cancelable: true }));
    expect(engine.orbitDistance()).toBeCloseTo(before, 5);
    expect(engine.orbitZoomEnabled()).toBeFalse();
    engine.dispose();
    canvas.remove();
  });

  it('pans a long rack on wheel without changing camera distance', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(longRackLayout());
    engine.focusRack('niponic-dreams', true);
    const before = engine.orbitDistance();
    expect(engine.rackPanState().label).toBe('8 de 19');
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true }));
    expect(engine.rackPanState().last).toBeGreaterThan(8);
    expect(engine.orbitDistance()).toBeCloseTo(before, 5);
    engine.dispose();
    canvas.remove();
  });

  it('does not dolly when the wheel is in a gap inside the rack screen rectangle', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(organicLayout());
    engine.focusRack('organic-dreams', true);
    const bounds = engine.unitScreenBounds('organic-dreams');
    expect(bounds).toBeTruthy();
    const rect = canvas.getBoundingClientRect();
    const before = engine.orbitDistance();
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 400,
        clientX: rect.left + (bounds!.left + bounds!.right) * 0.5,
        clientY: rect.top + bounds!.top + (bounds!.bottom - bounds!.top) * 0.42,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(engine.orbitDistance()).toBeCloseTo(before, 5);
    engine.dispose();
    canvas.remove();
  });

  it('moves the Niponic counter down and back up from the pan offset', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(longRackLayout());
    engine.focusRack('niponic-dreams', true);
    expect(engine.rackPanState().label).toBe('8 de 19');
    const dist = engine.orbitDistance();
    expect(engine.panRack(1)).toBeTrue();
    expect(engine.rackPanState().last).toBe(9);
    expect(engine.orbitDistance()).toBeCloseTo(dist, 5);
    expect(engine.panRack(-1)).toBeTrue();
    expect(engine.rackPanState().last).toBe(8);
    expect(engine.rackPanState().label).toBe('8 de 19');
    expect(engine.orbitDistance()).toBeCloseTo(dist, 5);
    engine.dispose();
    canvas.remove();
  });
});
