import {
  FLOOR_Y,
  HANGER_BELOW_ORIGIN,
  HANGER_ROW_MAX,
  createCollectionRack,
  hangerLocalY,
  hangersPerRow,
  rackBarTop,
  rackFrameWidth,
  rackPanRange,
  rackRowCount,
  rackWidth,
  rackFrameColumns,
  syncRackTitlePlate,
  RACK_BAR_TOP,
  RACK_FRAME_COLUMNS,
  RACK_FRAME_COLUMNS_COMPACT,
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

describe('rackWidth', () => {
  it('shrinks for a two-hanger rack so the camera can come closer', () => {
    expect(rackWidth(2)).toBeLessThan(2.2);
    expect(rackWidth(8)).toBeGreaterThan(5);
  });

  it('keeps 15–19 hangers on at most two rows and lengthens the bar', () => {
    expect(HANGER_ROW_MAX).toBe(2);
    expect(rackRowCount(8)).toBe(1);
    expect(rackRowCount(15)).toBe(2);
    expect(rackRowCount(19)).toBe(2);
    expect(hangersPerRow(19)).toBe(10);
    expect(rackWidth(19)).toBeGreaterThan(rackWidth(8));
    expect(rackFrameWidth(19)).toBe(rackWidth(8));
    expect(rackPanRange(8)).toBe(0);
    expect(rackPanRange(19)).toBeGreaterThan(0);
    expect(rackFrameWidth(17, 6)).toBeLessThan(rackFrameWidth(17, 8));
    expect(rackPanRange(17, 6)).toBeGreaterThan(rackPanRange(17, 8));
    expect(rackFrameColumns(true, 8)).toBe(RACK_FRAME_COLUMNS_COMPACT);
    expect(rackFrameColumns(true, 17)).toBe(RACK_FRAME_COLUMNS_COMPACT);
    expect(rackFrameColumns(false, 17)).toBe(RACK_FRAME_COLUMNS);
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

  it('lays 19 hangers on two rails instead of shrinking to three rows', () => {
    const hangers: SceneHanger[] = Array.from({ length: 19 }, (_, i) => ({
      productId: `p${i}`,
      slug: `peca-${i}`,
      name: `Peça ${i}`,
      imageUrl: null,
      stockQty: 1,
      priceLabel: 'R$ 1,00',
      status: 'published',
      rackId: 'niponic-dreams',
      kind: 'garment',
    }));
    const group = createCollectionRack(
      { id: 'niponic-dreams', name: 'Niponic Dreams', sortOrder: 1, hangers, kind: 'rack' },
      0,
    );
    const hangersRoot = group.getObjectByName('hangers');
    const ys = [...new Set((hangersRoot?.children ?? []).map((child) => Number(child.position.y.toFixed(3))))];
    expect(ys.length).toBe(2);
    expect(group.userData['unitWidth']).toBeGreaterThan(rackWidth(8));
  });

  it('slides the collection sign with the pan so a 4-col frame keeps the title', () => {
    const hangers: SceneHanger[] = Array.from({ length: 8 }, (_, i) => ({
      productId: `p${i}`,
      slug: `peca-${i}`,
      name: `Peça ${i}`,
      imageUrl: null,
      stockQty: 1,
      priceLabel: 'R$ 1,00',
      status: 'published',
      rackId: 'organic-dreams',
      kind: 'garment',
    }));
    const group = createCollectionRack(
      { id: 'organic-dreams', name: 'Organic Dreams', sortOrder: 1, hangers, kind: 'rack' },
      0,
    );
    const start = rackPanRange(8, RACK_FRAME_COLUMNS_COMPACT);
    expect(start).toBeGreaterThan(0.5);
    syncRackTitlePlate(group, -start);
    expect(group.getObjectByName('plate')!.position.x).toBeCloseTo(-start, 5);
    expect(group.getObjectByName('plate-box')!.position.x).toBeCloseTo(-start, 5);
    syncRackTitlePlate(group, 0);
    expect(group.getObjectByName('plate')!.position.x).toBe(0);
  });
});
