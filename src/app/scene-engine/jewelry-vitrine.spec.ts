import { TRAY_PHOTO, TRAY_PHOTO_Y, VITRINE_SHELF_PITCH, createJewelryVitrine } from './jewelry-vitrine';
import type { SceneHanger } from './types';

describe('jewelry vitrine spacing', () => {
  it('keeps tray photos larger and below the shelf above', () => {
    expect(TRAY_PHOTO).toBeGreaterThanOrEqual(0.4);
    expect(VITRINE_SHELF_PITCH).toBeGreaterThan(TRAY_PHOTO_Y + TRAY_PHOTO / 2 + 0.04);
  });

  it('builds a case with room for three shelves of trays', () => {
    const hangers: SceneHanger[] = Array.from({ length: 8 }, (_, i) => ({
      productId: `j${i}`,
      slug: `joia-${i}`,
      name: `Joia ${i}`,
      imageUrl: 'https://cdn.example/pdp/joia-thumb.webp',
      thumbUrl: 'https://cdn.example/pdp/joia-thumb.webp',
      stockQty: 1,
      priceLabel: 'R$ 180,00',
      status: 'published',
      rackId: 'vitrine:gioielli',
      kind: 'jewelry',
    }));
    const group = createJewelryVitrine(
      { id: 'vitrine:gioielli', name: 'Gioielli', sortOrder: 1, hangers, kind: 'vitrine' },
      0,
    );
    expect(group.getObjectByName('hangers')?.children.length).toBe(8);
  });
});
