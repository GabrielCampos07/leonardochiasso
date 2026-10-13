import { createSceneEngine, type SceneEngine } from './scene-engine';
import { PORTRAIT_STACK_PITCH } from './camera-guide';
import type { SceneLayout } from './types';

function aisleLayout(): SceneLayout {
  return {
    racks: ['organic-dreams', 'niponic-dreams', 'brazilian-dreams'].map((id, i) => ({
      id,
      name: id,
      sortOrder: i,
      kind: 'rack' as const,
      hangers: Array.from({ length: 8 }, (_, j) => ({
        productId: `${id}-${j}`,
        slug: `${id}-${j}`,
        name: `Peça ${j}`,
        imageUrl: null,
        stockQty: 1,
        priceLabel: 'R$ 1,00',
        status: 'published',
        rackId: id,
        kind: 'garment' as const,
      })),
    })),
  };
}

function mountHost(
  width: number,
  height: number,
): { host: HTMLDivElement; canvas: HTMLCanvasElement } {
  const host = document.createElement('div');
  host.style.cssText = `width:${width}px;height:${height}px;position:relative;`;
  const chrome = document.createElement('div');
  chrome.className = 'admin-3d__chrome';
  chrome.style.cssText = 'position:absolute;top:8px;left:0;right:0;height:32px;';
  const guide = document.createElement('nav');
  guide.className = 'admin-3d__guide';
  guide.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:120px;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  host.append(canvas, chrome, guide);
  document.body.appendChild(host);
  return { host, canvas };
}

function dispatchClick(canvas: HTMLCanvasElement, x: number, y: number): void {
  const rect = canvas.getBoundingClientRect();
  const clientX = rect.left + x;
  const clientY = rect.top + y;
  canvas.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX,
      clientY,
      pointerId: 1,
      pointerType: 'mouse',
      bubbles: true,
      buttons: 1,
    }),
  );
  canvas.dispatchEvent(
    new PointerEvent('pointerup', {
      clientX,
      clientY,
      pointerId: 1,
      pointerType: 'mouse',
      bubbles: true,
      buttons: 0,
    }),
  );
}

async function saveShot(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const url = canvas.toDataURL('image/png');
  try {
    await fetch('http://127.0.0.1:9877/shot', {
      method: 'POST',
      headers: { 'x-shot-name': name, 'content-type': 'text/plain' },
      body: url,
    });
  } catch {
    /* shot server is optional outside the capture run */
  }
}

describe('SceneEngine portrait Ver todas stack', () => {
  afterEach(() => {
    document.body.querySelectorAll('div').forEach((el) => {
      if (el.querySelector('canvas')) el.remove();
    });
  });

  it('stacks every rack on Y at the same X, then restores the aisle on zoom', () => {
    const { host, canvas } = mountHost(393, 852);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(aisleLayout());
    engine.focusOverview(true);
    const organic = engine.unitLocalPosition('organic-dreams');
    const niponic = engine.unitLocalPosition('niponic-dreams');
    const brazilian = engine.unitLocalPosition('brazilian-dreams');
    expect(organic && niponic && brazilian).toBeTruthy();
    expect(organic!.x).toBeCloseTo(niponic!.x, 5);
    expect(niponic!.x).toBeCloseTo(brazilian!.x, 5);
    expect(organic!.y).toBeGreaterThan(niponic!.y);
    expect(niponic!.y).toBeGreaterThan(brazilian!.y);
    expect(brazilian!.y).toBeCloseTo(0, 5);
    expect(organic!.y - niponic!.y).toBeCloseTo(PORTRAIT_STACK_PITCH, 5);

    engine.focusRack('niponic-dreams', true);
    const zoomed = engine.unitLocalPosition('niponic-dreams');
    expect(zoomed!.y).toBeCloseTo(0, 5);
    expect(zoomed!.x).not.toBeCloseTo(organic!.x, 2);

    engine.focusOverview(true);
    host.style.width = '1280px';
    host.style.height = '800px';
    engine.resize();
    const desk = engine.unitLocalPosition('organic-dreams');
    expect(desk!.y).toBeCloseTo(0, 5);
    expect(desk!.x).not.toBeCloseTo(0, 2);
    engine.dispose();
    host.remove();
  });

  it('fits the 393×852 stack above the bar and frames a tapped rack', async () => {
    const { host, canvas } = mountHost(393, 852);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(aisleLayout());
    engine.focusOverview(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const organic = engine.unitScreenBounds('organic-dreams');
    const brazilian = engine.unitScreenBounds('brazilian-dreams');
    expect(organic && brazilian).toBeTruthy();
    expect(organic!.top).toBeGreaterThan(8);
    expect(brazilian!.bottom).toBeLessThan(852 - 110);
    await saveShot(canvas, 'mobile-ver-todas-393x852');

    engine.focusRack('brazilian-dreams', true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const focused = engine.unitScreenBounds('brazilian-dreams');
    expect(focused).toBeTruthy();
    expect(focused!.top).toBeGreaterThan(4);
    expect(focused!.bottom).toBeLessThan(852 - 110);
    await saveShot(canvas, 'mobile-tap-brazilian-393x852');
    engine.dispose();
    host.remove();
  });

  it('uses the same desktop pose for a Ver todas click and the collections bar', () => {
    const { host, canvas } = mountHost(1280, 800);
    const engine = createSceneEngine(canvas, { reducedMotion: false, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(aisleLayout());
    engine.focusRack('organic-dreams', true);
    const bar = engine.cameraSnapshot();
    engine.focusOverview(true);
    const box = engine.unitScreenBounds('organic-dreams');
    expect(box).toBeTruthy();
    dispatchClick(canvas, (box!.left + box!.right) / 2, (box!.top + box!.bottom) / 2);
    expect(engine.focusedRackId()).toBe('organic-dreams');
    expect(engine.isCameraTweening()).toBeTrue();
    engine.focusRack('organic-dreams', true);
    const after = engine.cameraSnapshot();
    expect(after.distance).toBeCloseTo(bar.distance, 2);
    expect(after.x).toBeCloseTo(bar.x, 2);
    expect(after.z).toBeCloseTo(bar.z, 2);
    engine.dispose();
    host.remove();
  });
});
