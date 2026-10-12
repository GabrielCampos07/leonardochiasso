import {
  atelierPixelRatio,
  createSceneEngine,
  hostDrawingSize,
  type SceneEngine,
} from './scene-engine';

function mountHost(
  width: number,
  height: number,
): { host: HTMLDivElement; canvas: HTMLCanvasElement } {
  const host = document.createElement('div');
  host.style.cssText = `width:${width}px;height:${height}px;position:relative;`;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  host.appendChild(canvas);
  document.body.appendChild(host);
  return { host, canvas };
}

function createEngine(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
): SceneEngine | null {
  const engine = createSceneEngine(canvas, { reducedMotion: true, host });
  if (!engine) pending('WebGL not available in this browser');
  return engine;
}

describe('atelierPixelRatio', () => {
  it('caps at 2 and stays at 1 when motion is reduced', () => {
    expect(atelierPixelRatio(true, 3)).toBe(1);
    expect(atelierPixelRatio(false, 3)).toBe(2);
    expect(atelierPixelRatio(false, 1.25)).toBe(1.25);
  });
});

describe('hostDrawingSize', () => {
  it('ignores a collapsed host and rounds a live box', () => {
    const collapsed = document.createElement('div');
    Object.defineProperty(collapsed, 'clientWidth', { value: 0 });
    Object.defineProperty(collapsed, 'clientHeight', { value: 400 });
    expect(hostDrawingSize(collapsed)).toBeNull();

    const live = document.createElement('div');
    Object.defineProperty(live, 'clientWidth', { value: 800.4 });
    Object.defineProperty(live, 'clientHeight', { value: 450.6 });
    expect(hostDrawingSize(live)).toEqual({ width: 800, height: 451 });
  });
});

describe('SceneEngine resize and WebGL context', () => {
  afterEach(() => {
    document.body.querySelectorAll('div').forEach((el) => {
      if (el.querySelector('canvas')) el.remove();
    });
  });

  it('updates setSize, pixel ratio and aspect when the host box changes', () => {
    const { host, canvas } = mountHost(800, 450);
    const engine = createEngine(canvas, host);
    if (!engine) return;
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(450);

    host.style.width = '400px';
    host.style.height = '300px';
    engine.resize();
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);

    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(400);
    engine.dispose();
  });

  it('resizes from a window resize after the host box changes', () => {
    const { host, canvas } = mountHost(640, 360);
    const engine = createEngine(canvas, host);
    if (!engine) return;
    host.style.width = '512px';
    host.style.height = '288px';
    window.dispatchEvent(new Event('resize'));
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(288);
    engine.dispose();
  });

  it('prevents the default context-lost path and skips resize until restore', () => {
    const { host, canvas } = mountHost(640, 360);
    const recorded: Array<{ type: string; fn: EventListener }> = [];
    const nativeAdd = canvas.addEventListener.bind(canvas);
    spyOn(canvas, 'addEventListener').and.callFake(
      (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        recorded.push({ type, fn: listener as EventListener });
        return nativeAdd(type, listener, options);
      },
    );
    const engine = createEngine(canvas, host);
    if (!engine) return;
    expect(canvas.width).toBe(640);

    const lost = recorded.filter((entry) => entry.type === 'webglcontextlost');
    expect(lost.length).toBeGreaterThan(0);
    const ev = {
      type: 'webglcontextlost',
      preventDefault: jasmine.createSpy('preventDefault'),
    } as unknown as Event;
    lost[lost.length - 1]!.fn(ev);
    expect((ev as unknown as { preventDefault: jasmine.Spy }).preventDefault).toHaveBeenCalled();

    host.style.width = '320px';
    host.style.height = '200px';
    engine.resize();
    expect(canvas.width).toBe(640);

    const restored = recorded.filter((entry) => entry.type === 'webglcontextrestored');
    expect(restored.length).toBeGreaterThan(0);
    restored[restored.length - 1]!.fn(new Event('webglcontextrestored'));
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(200);
    engine.dispose();
  });
});
