import { createSceneEngine, type SceneEngine } from './scene-engine';
import { PORTRAIT_STACK_PITCH } from './camera-guide';
import type { SceneLayout } from './types';

function aisleLayout(brazilianCount = 8): SceneLayout {
  return {
    racks: [
      { id: 'organic-dreams', count: 8 },
      { id: 'niponic-dreams', count: 8 },
      { id: 'brazilian-dreams', count: brazilianCount },
    ].map((rack, i) => ({
      id: rack.id,
      name: rack.id,
      sortOrder: i,
      kind: 'rack' as const,
      hangers: Array.from({ length: rack.count }, (_, j) => ({
        productId: `${rack.id}-${j}`,
        slug: `${rack.id}-${j}`,
        name: `Peça ${j}`,
        imageUrl: null,
        stockQty: 1,
        priceLabel: 'R$ 1,00',
        status: 'published',
        rackId: rack.id,
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

async function saveShot(engine: SceneEngine, name: string, overlay?: string): Promise<void> {
  let url = engine.capturePng();
  if (overlay) {
    url = await compositeChrome(url, overlay);
  }
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

function compositeChrome(dataUrl: string, label: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 393;
      canvas.height = 852;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, 393, 852);
      ctx.fillStyle = 'rgb(32 24 18 / 88%)';
      ctx.fillRect(0, 692, 393, 160);
      ctx.fillStyle = '#efe8dc';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ver todas   Organic   Niponic   Brazilian', 196, 780);
      const countY = 692 - 16;
      ctx.fillStyle = 'rgb(255 255 255 / 82%)';
      const w = 72;
      ctx.fillRect(196 - w / 2, countY - 16, w, 22);
      ctx.fillStyle = '#3a2f26';
      ctx.font = '600 12px sans-serif';
      ctx.fillText(label, 196, countY);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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
    await saveShot(engine, 'mobile-ver-todas-393x852');

    engine.focusRack('brazilian-dreams', true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const focused = engine.unitScreenBounds('brazilian-dreams');
    expect(focused).toBeTruthy();
    expect(focused!.top).toBeGreaterThan(4);
    expect(focused!.bottom).toBeLessThan(852 - 110);
    await saveShot(engine, 'mobile-tap-brazilian-393x852');
    engine.dispose();
    host.remove();
  });

  it('fits Organic default and a 17-piece Brazilian focus on 393×852', async () => {
    const { host, canvas } = mountHost(393, 852);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engine.start();
    engine.setLayout(aisleLayout(17));
    engine.focusRack('organic-dreams', true);
    engine.refitToChrome();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const organic = engine.unitScreenBounds('organic-dreams');
    expect(organic).toBeTruthy();
    expect(organic!.left).toBeGreaterThan(8);
    expect(organic!.right).toBeLessThan(385);
    expect(organic!.top).toBeGreaterThan(8);
    expect(organic!.bottom).toBeLessThan(852 - 110);
    await saveShot(engine, 'mobile-organic-default-393x852');

    engine.focusRack('brazilian-dreams', true);
    engine.refitToChrome();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const focused = engine.unitScreenBounds('brazilian-dreams');
    expect(focused).toBeTruthy();
    expect(focused!.left).toBeGreaterThan(4);
    expect(focused!.right).toBeLessThan(389);
    const pan = engine.rackPanState();
    expect(pan.showChrome).toBeTrue();
    expect(pan.last).toBe(6);
    expect(pan.total).toBe(17);
    expect(pan.label).toBe('6 de 17');
    await saveShot(engine, 'mobile-brazilian-focus-393x852', pan.label);
    engine.dispose();
    host.remove();
  });

  it('focuses Niponic on the first touch tap from Ver todas', () => {
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
    const bounds = engine.unitScreenBounds('niponic-dreams');
    expect(bounds).toBeTruthy();
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + (bounds!.left + bounds!.right) / 2;
    const y = rect.top + (bounds!.top + bounds!.bottom) / 2;
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: x,
        clientY: y,
        pointerId: 7,
        pointerType: 'touch',
        bubbles: true,
        buttons: 1,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: x + 9,
        clientY: y + 6,
        pointerId: 7,
        pointerType: 'touch',
        bubbles: true,
        buttons: 0,
      }),
    );
    expect(engine.focusedRackId()).toBe('niponic-dreams');
    engine.dispose();
    host.remove();
  });

  it('uses the same desktop pose from Ver todas as the collections bar and keeps the tween', () => {
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
    engine.focusRack('organic-dreams', true);
    const fromOverview = engine.cameraSnapshot();
    expect(fromOverview.distance).toBeCloseTo(bar.distance, 2);
    expect(fromOverview.x).toBeCloseTo(bar.x, 2);
    expect(fromOverview.z).toBeCloseTo(bar.z, 2);

    engine.focusOverview(true);
    engine.focusRack('organic-dreams');
    expect(engine.focusedRackId()).toBe('organic-dreams');
    expect(engine.isCameraTweening()).toBeTrue();
    canvas.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 8,
        clientY: 8,
        pointerId: 1,
        pointerType: 'mouse',
        bubbles: true,
        buttons: 0,
      }),
    );
    expect(engine.focusedRackId()).toBe('organic-dreams');
    expect(engine.isCameraTweening()).toBeTrue();
    engine.dispose();
    host.remove();
  });
});
