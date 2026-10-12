import {
  FLOOR_Y,
  HANGER_BELOW_ORIGIN,
  createCollectionRack,
  hangerLocalY,
  rackBarTop,
  RACK_BAR_TOP,
  RACK_ROW_PITCH,
} from './collection-rack';
import type { SceneHanger } from './types';

describe('rack label clearance', () => {
  it('keeps the top-row hanger name above the lower rail', () => {
    const labelWorldY = hangerLocalY(0) - HANGER_BELOW_ORIGIN;
    const lowerBarY = RACK_BAR_TOP - RACK_ROW_PITCH;
    expect(labelWorldY - lowerBarY).toBeGreaterThan(0.2);
  });

  it('keeps the lowest hanger of a 2-row and 3-row rack above the floor', () => {
    for (const rows of [2, 3]) {
      const barTop = rackBarTop(rows);
      const restY = hangerLocalY(rows - 1, barTop);
      const labelY = restY - HANGER_BELOW_ORIGIN;
      expect(labelY).toBeGreaterThan(FLOOR_Y + 0.04);
    }
  });
});

describe('createCollectionRack first paint', () => {
  it('builds hangers with placeholders and does not wait on photos', () => {
    const hangers: SceneHanger[] = Array.from({ length: 8 }, (_, i) => ({
      productId: `p${i}`,
      slug: `peca-${i}`,
      name: `Peça ${i}`,
      imageUrl: 'https://cdn.example/full.jpg',
      stockQty: 1,
      priceLabel: 'R$ 1,00',
      status: 'published',
      rackId: 'organic-dreams',
      kind: 'garment',
    }));
    const started = performance.now();
    const group = createCollectionRack(
      { id: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1, hangers, kind: 'rack' },
      0,
    );
    const ms = performance.now() - started;
    expect(group.children.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(400);
  });
});
