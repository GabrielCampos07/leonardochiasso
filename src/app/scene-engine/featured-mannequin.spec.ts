import { hangerPhotoSpan, mannequinOffset, MANNEQUIN_HALF_W } from './featured-mannequin';
import { PHOTO_MAX_W } from './garment-hanger';
import { UNIT_GAP } from './unit-layout';
import { rackWidth } from './collection-rack';

describe('mannequinOffset', () => {
  it('omits the dress form on a narrow two-hanger rack so it cannot cover a photo', () => {
    expect(mannequinOffset(1.8, 'rack', 2)).toBeNull();
    expect(mannequinOffset(1.1, 'rack', 2)).toBeNull();
  });

  it('sits outside the hanger photos and behind the rail on a wider rack', () => {
    const width = rackWidth(6);
    const offset = mannequinOffset(width, 'rack', 6);
    expect(offset).toBeTruthy();
    const photos = hangerPhotoSpan(6, width);
    expect(offset!.x - MANNEQUIN_HALF_W).toBeGreaterThan(photos.maxX);
    expect(offset!.x + MANNEQUIN_HALF_W).toBeLessThan(width / 2 + UNIT_GAP);
    expect(offset!.z).toBeLessThan(-0.7);
  });
});

describe('hangerPhotoSpan', () => {
  it('covers each photo plane on the rail', () => {
    const span = hangerPhotoSpan(2, 1.8);
    expect(span.maxX - span.minX).toBeGreaterThan(PHOTO_MAX_W);
  });
});
