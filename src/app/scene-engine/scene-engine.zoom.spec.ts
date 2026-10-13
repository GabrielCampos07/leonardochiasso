import { createSceneEngine, type SceneEngine } from './scene-engine';
import type { SceneLayout } from './types';

function mountHost(
  width: number,
  height: number,
): { host: HTMLDivElement; canvas: HTMLCanvasElement } {
  const host = document.createElement('div');
  host.style.cssText = `width:${width}px;height:${height}px;position:relative;`;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  host.appendChild(canvas);
  document.body.appendChild(host);
  return { host, canvas };
}

function sampleLayout(): SceneLayout {
  return {
    racks: [
      {
        id: 'organic-dreams',
        name: 'Organic Dreams',
        sortOrder: 1,
        kind: 'rack',
        hangers: [
          {
            productId: 'p1',
            slug: 'vestido-lg-bateau',
            name: 'Vestido',
            imageUrl: null,
            stockQty: 1,
            priceLabel: 'R$ 1,00',
            status: 'published',
            rackId: 'organic-dreams',
            kind: 'garment',
          },
        ],
      },
    ],
  };
}

function dispatchPointer(
  canvas: HTMLCanvasElement,
  type: string,
  x: number,
  y: number,
  buttons: number,
): void {
  canvas.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'mouse',
      bubbles: true,
      buttons,
    }),
  );
}

function dragOn(canvas: HTMLCanvasElement, startX: number, startY: number, dx: number, dy: number): void {
  dispatchPointer(canvas, 'pointerdown', startX, startY, 1);
  dispatchPointer(canvas, 'pointermove', startX + dx, startY + dy, 1);
  canvas.dispatchEvent(
    new MouseEvent('mousemove', {
      clientX: startX + dx,
      clientY: startY + dy,
      bubbles: true,
      buttons: 1,
    }),
  );
  dispatchPointer(canvas, 'pointerup', startX + dx, startY + dy, 0);
}

function wheelOn(canvas: HTMLCanvasElement, deltaY: number): void {
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new WheelEvent('wheel', {
      deltaY,
      deltaX: 80,
      clientX: rect.left + 12,
      clientY: rect.top + 12,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('SceneEngine orbit after #44 prod failures', () => {
  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let engine: SceneEngine | null;

  beforeEach(() => {
    ({ host, canvas } = mountHost(800, 450));
    engine = createSceneEngine(canvas, { reducedMotion: false, host });
    if (!engine) pending('WebGL not available in this browser');
    engine?.start();
    engine?.setLayout(sampleLayout());
  });

  afterEach(() => {
    engine?.dispose();
    host.remove();
  });

  it('re-enables wheel zoom 600ms after a drag and dollies the camera', (done) => {
    if (!engine) return;
    const rect = canvas.getBoundingClientRect();
    dragOn(canvas, rect.left + 400, rect.top + 220, 56, 18);
    expect(engine.orbitZoomEnabled()).toBeFalse();
    const before = engine.orbitDistance();

    setTimeout(() => {
      if (!engine) return;
      expect(engine.orbitZoomEnabled()).toBeTrue();
      expect(engine.isCameraTweening()).toBeFalse();
      const settled = engine.orbitDistance();
      wheelOn(canvas, 160);
      const after = engine.orbitDistance();
      expect(after).not.toBeCloseTo(settled, 3);
      expect(engine.orbitZoomEnabled()).toBeTrue();
      expect(before).toBeGreaterThan(0);
      done();
    }, 600);
  });

  it('keeps a floor drag where it was released and settles under 420ms', (done) => {
    if (!engine) return;
    const boot = engine.cameraSnapshot();
    const rect = canvas.getBoundingClientRect();
    dragOn(canvas, rect.left + 400, rect.top + 380, 64, 10);
    const released = engine.cameraSnapshot();
    expect(engine.isCameraTweening()).toBeFalse();

    setTimeout(() => {
      if (!engine) return;
      const mid = engine.cameraSnapshot();
      setTimeout(() => {
        if (!engine) return;
        const late = engine.cameraSnapshot();
        expect(engine.isCameraTweening()).toBeFalse();
        expect(late.x).toBeCloseTo(mid.x, 2);
        expect(late.y).toBeCloseTo(mid.y, 2);
        expect(late.z).toBeCloseTo(mid.z, 2);
        expect(late.distance).toBeCloseTo(released.distance, 1);
        expect(Math.abs(late.x - boot.x) + Math.abs(late.z - boot.z)).toBeGreaterThan(0.0001);
        host.style.width = '640px';
        host.style.height = '360px';
        engine.resize();
        const afterResize = engine.cameraSnapshot();
        expect(afterResize.x).toBeCloseTo(late.x, 2);
        expect(afterResize.z).toBeCloseTo(late.z, 2);
        done();
      }, 200);
    }, 420);
  });

  it('orbits when the drag starts on the wall and does not start a focus tween', () => {
    if (!engine) return;
    const boot = engine.cameraSnapshot();
    const rect = canvas.getBoundingClientRect();
    dragOn(canvas, rect.left + 400, rect.top + 80, 72, 8);
    expect(engine.isCameraTweening()).toBeFalse();
    const moved = engine.cameraSnapshot();
    expect(Math.abs(moved.x - boot.x) + Math.abs(moved.z - boot.z)).toBeGreaterThan(0.0001);
  });
});
