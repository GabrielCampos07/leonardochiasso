import {
  TRAY_PHOTO,
  TRAY_PHOTO_Y,
  TRAY_SOLD_OUT_BADGE_H,
  TRAY_SOLD_OUT_BADGE_W,
  TRAY_SOLD_OUT_X,
  TRAY_SOLD_OUT_Y,
  VITRINE_SHELF_PITCH,
  createJewelryTray,
  createJewelryVitrine,
} from './jewelry-vitrine';
import type { SceneHanger } from './types';

describe('jewelry vitrine spacing', () => {
  it('keeps a small sold-out ribbon on the tray, not over the photo', () => {
    expect(TRAY_SOLD_OUT_BADGE_W).toBeLessThanOrEqual(0.12);
    expect(TRAY_SOLD_OUT_BADGE_H).toBeLessThanOrEqual(0.04);
    expect(TRAY_SOLD_OUT_X - TRAY_SOLD_OUT_BADGE_W / 2).toBeGreaterThan(TRAY_PHOTO / 2 - 0.02);
    expect(TRAY_SOLD_OUT_Y).toBeLessThan(TRAY_PHOTO_Y);
    const tray = createJewelryTray({
      productId: 'j',
      slug: 'brinco',
      name: 'Brinco',
      imageUrl: null,
      stockQty: 0,
      priceLabel: 'R$ 1,00',
      status: 'published',
      rackId: 'vitrine:gioielli',
      kind: 'jewelry',
    });
    const badge = tray.getObjectByName('badge');
    const photo = tray.getObjectByName('garment');
    expect(badge?.visible).toBeTrue();
    expect(badge!.position.y).toBeLessThan(photo!.position.y - 0.1);
  });

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
