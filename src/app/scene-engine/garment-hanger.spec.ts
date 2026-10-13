import { Mesh } from 'three';
import { createGarmentHanger, SOLD_OUT_BADGE_H, SOLD_OUT_BADGE_W } from './garment-hanger';
import { isPhotoMaterial } from './photo-material';

describe('garment hanger sold-out badge', () => {
  it('is large enough to read on hangers', () => {
    expect(SOLD_OUT_BADGE_W).toBeGreaterThanOrEqual(0.28);
    expect(SOLD_OUT_BADGE_H).toBeGreaterThanOrEqual(0.1);
  });

  it('puts an unlit photo and a contrast backing on the Esgotado badge', () => {
    const group = createGarmentHanger({
      productId: 'p',
      slug: 'look-obi-organza',
      name: 'Look Obi',
      imageUrl: null,
      stockQty: 0,
      priceLabel: 'R$ 1,00',
      status: 'published',
      rackId: 'organic-dreams',
      kind: 'garment',
    });
    const garment = group.getObjectByName('garment') as Mesh;
    const badge = group.getObjectByName('badge');
    const back = group.getObjectByName('badgeBack') as Mesh;
    expect(isPhotoMaterial(garment.material)).toBeTrue();
    expect(badge?.visible).toBeTrue();
    expect(back).toBeTruthy();
    expect(isPhotoMaterial(back.material)).toBeTrue();
    expect(badge!.position.y).toBeGreaterThan(garment.position.y + 0.28);
  });
});
