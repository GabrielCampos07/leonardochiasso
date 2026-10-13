import { createSceneEngine } from './scene-engine';
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

function mountPortraitHost(): { host: HTMLDivElement; canvas: HTMLCanvasElement } {
  const host = document.createElement('div');
  host.style.cssText = 'width:390px;height:844px;position:relative;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  host.appendChild(canvas);
  document.body.appendChild(host);
  return { host, canvas };
}

describe('SceneEngine portrait Ver todas stack', () => {
  afterEach(() => {
    document.body.querySelectorAll('div').forEach((el) => {
      if (el.querySelector('canvas')) el.remove();
    });
  });

  it('stacks every rack on Y at the same X, then restores the aisle on zoom', () => {
    const { host, canvas } = mountPortraitHost();
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
});
