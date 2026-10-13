import { createSceneEngine } from './scene-engine';
import { rackPanRange } from './collection-rack';
import type { SceneLayout } from './types';

function longRackLayout(): SceneLayout {
  return {
    racks: [
      {
        id: 'niponic-dreams',
        name: 'Niponic Dreams',
        sortOrder: 0,
        kind: 'rack',
        hangers: Array.from({ length: 19 }, (_, i) => ({
          productId: `p${i}`,
          slug: `peca-${i}`,
          name: `Peça ${i}`,
          imageUrl: null,
          stockQty: 1,
          priceLabel: 'R$ 1,00',
          status: 'published',
          rackId: 'niponic-dreams',
          kind: 'garment' as const,
        })),
      },
    ],
  };
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
    expect(engine.canPan(1)).toBeTrue();
    expect(engine.panRack(1)).toBeTrue();
    let steps = 0;
    while (engine.panRack(1) && steps < 20) steps += 1;
    expect(engine.canPan(1)).toBeFalse();
    expect(engine.canPan(-1)).toBeTrue();
    engine.dispose();
    canvas.remove();
  });
});
