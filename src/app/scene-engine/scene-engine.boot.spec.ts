import { createSceneEngine } from './scene-engine';
import type { SceneLayout } from './types';

function fakeLayout(rackCount: number, hangersPerRack = 6): SceneLayout {
  return {
    racks: Array.from({ length: rackCount }, (_, i) => ({
      id: `c${i}`,
      name: `Coleção ${i}`,
      sortOrder: i,
      kind: 'rack' as const,
      hangers: Array.from({ length: hangersPerRack }, (_, j) => ({
        productId: `${i}-${j}`,
        slug: `p-${i}-${j}`,
        name: `Peça ${j}`,
        imageUrl: null,
        stockQty: 1,
        priceLabel: 'R$ 1,00',
        status: 'published',
        rackId: `c${i}`,
        kind: 'garment' as const,
      })),
    })),
  };
}

describe('SceneEngine first frame', () => {
  it('reaches the first frame after mounting only the active collection', (done) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    document.body.appendChild(canvas);
    const engine = createSceneEngine(canvas, { reducedMotion: true });
    if (!engine) {
      canvas.remove();
      pending('WebGL not available in this browser');
      return;
    }
    const started = performance.now();
    engine.onFirstFrame(() => {
      const ms = performance.now() - started;
      console.info(`[admin-3d] local-first-frame ${Math.round(ms)}ms`);
      expect(ms).toBeLessThan(1500);
      engine.dispose();
      canvas.remove();
      done();
    });
    engine.onSceneComplete(() => {
      /* photos are null placeholders; still counts as complete */
    });
    engine.start();
    engine.setLayout(fakeLayout(8));
  });
});
