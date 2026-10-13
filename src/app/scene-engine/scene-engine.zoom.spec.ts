import { createSceneEngine, type SceneEngine } from './scene-engine';

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

function dragThenRelease(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  dispatchPointer(canvas, 'pointerdown', x, y, 1);
  dispatchPointer(canvas, 'pointermove', x + 48, y + 12, 1);
  dispatchPointer(canvas, 'pointerup', x + 48, y + 12, 0);
}

function wheelOn(canvas: HTMLCanvasElement, deltaY: number): void {
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new WheelEvent('wheel', {
      deltaY,
      deltaX: 80,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('SceneEngine wheel zoom after a drag', () => {
  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let engine: SceneEngine | null;

  beforeEach(() => {
    ({ host, canvas } = mountHost(800, 450));
    engine = createSceneEngine(canvas, { reducedMotion: false, host });
    if (!engine) pending('WebGL not available in this browser');
    engine?.start();
  });

  afterEach(() => {
    engine?.dispose();
    host.remove();
  });

  it('keeps zoom off on release, then dollies after 500ms even with a horizontal deltaX', (done) => {
    if (!engine) return;
    dragThenRelease(canvas);
    expect(engine.orbitZoomEnabled()).toBeFalse();
    const before = engine.orbitDistance();

    setTimeout(() => {
      if (!engine) return;
      expect(engine.orbitZoomEnabled()).toBeTrue();
      const settled = engine.orbitDistance();
      wheelOn(canvas, 160);
      const after = engine.orbitDistance();
      expect(after).not.toBeCloseTo(settled, 3);
      expect(engine.orbitZoomEnabled()).toBeTrue();
      expect(before).toBeGreaterThan(0);
      done();
    }, 500);
  });
});
