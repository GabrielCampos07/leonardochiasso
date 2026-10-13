import { Mesh } from 'three';
import {
  createGarmentHanger,
  HANGER_LABEL_MAX_W,
  HANGER_LABEL_Z,
  hangerLabelWidth,
  SOLD_OUT_BADGE_H,
  SOLD_OUT_BADGE_W,
  SOLD_OUT_HOOK_Y,
} from './garment-hanger';
import { isPhotoMaterial } from './photo-material';
import { HANGER_SPACING } from './collection-rack';

describe('garment hanger sold-out badge', () => {
  it('is a small hook ribbon, not a giant plate', () => {
    expect(SOLD_OUT_BADGE_W).toBeLessThanOrEqual(0.12);
    expect(SOLD_OUT_BADGE_H).toBeLessThanOrEqual(0.04);
    expect(SOLD_OUT_BADGE_W).toBeGreaterThan(0.08);
  });

  it('hangs on the hook and does not cover the photo or name plate', () => {
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
    const label = group.getObjectByName('label') as Mesh;
    const badge = group.getObjectByName('badge');
    const back = group.getObjectByName('badgeBack') as Mesh;
    expect(isPhotoMaterial(garment.material)).toBeTrue();
    expect(badge?.visible).toBeTrue();
    expect(back).toBeTruthy();
    expect(isPhotoMaterial(back.material)).toBeTrue();
    expect(badge!.position.y).toBe(SOLD_OUT_HOOK_Y);
    const photoTop = garment.position.y + garment.scale.y * 0.5;
    const ribbonBottom = badge!.position.y - SOLD_OUT_BADGE_H * 0.5;
    expect(ribbonBottom).toBeGreaterThan(photoTop + 0.04);
    expect(badge!.position.y).toBeGreaterThan(label.position.y + 0.5);
  });

  it('keeps published photos and labels opaque and unfogged', () => {
    const group = createGarmentHanger({
      productId: 'p',
      slug: 'vestido-lg-bateau',
      name: 'Vestido LG Bateau',
      imageUrl: null,
      stockQty: 2,
      priceLabel: 'R$ 1,00',
      status: 'published',
      rackId: 'organic-dreams',
      kind: 'garment',
    });
    const garment = group.getObjectByName('garment') as Mesh;
    const label = group.getObjectByName('label') as Mesh;
    const photo = garment.material;
    const tag = label.material;
    expect(isPhotoMaterial(photo)).toBeTrue();
    if (!isPhotoMaterial(photo) || !isPhotoMaterial(tag)) return;
    expect(photo.opacity).toBe(1);
    expect(photo.transparent).toBeFalse();
    expect(photo.depthWrite).toBeTrue();
    expect(photo.fog).toBeFalse();
    expect(tag.opacity).toBe(1);
    expect(tag.transparent).toBeFalse();
    expect(tag.depthWrite).toBeTrue();
    expect(label.position.z).toBeGreaterThan(garment.position.z + 0.08);
    expect(label.position.z).toBe(HANGER_LABEL_Z);
    expect(label.position.y).toBeLessThan(garment.position.y - garment.scale.y * 0.5);
    expect(label.scale.x).toBeLessThanOrEqual(HANGER_LABEL_MAX_W);
  });
});

describe('hangerLabelWidth', () => {
  it('keeps neighbor plates from overlapping on the rail', () => {
    expect(hangerLabelWidth(0.48)).toBeLessThan(HANGER_SPACING - 0.08);
    expect(hangerLabelWidth(0.8)).toBe(HANGER_LABEL_MAX_W);
  });
});
