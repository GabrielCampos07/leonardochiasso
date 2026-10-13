import { hangerPhotoSpan, mannequinOffset, MANNEQUIN_HALF_W } from './featured-mannequin';
import { PHOTO_MAX_W } from './garment-hanger';
import { UNIT_GAP } from './unit-layout';

describe('mannequinOffset', () => {
  it('sits outside the hanger photos and behind the rail, never in the next slot', () => {
    const width = 1.8;
    const offset = mannequinOffset(width, 'rack', 2);
    expect(offset).toBeTruthy();
    const photos = hangerPhotoSpan(2, width);
    expect(offset!.x - MANNEQUIN_HALF_W).toBeGreaterThan(photos.maxX);
    expect(offset!.x + MANNEQUIN_HALF_W).toBeLessThan(width / 2 + UNIT_GAP);
    expect(offset!.z).toBeLessThan(-0.7);
  });

  it('omits the dress form when it cannot clear the photo band', () => {
    const squeezed = mannequinOffset(1.1, 'rack', 2);
    expect(squeezed).toBeNull();
  });
});

describe('hangerPhotoSpan', () => {
  it('covers each photo plane on the rail', () => {
    const span = hangerPhotoSpan(2, 1.8);
    expect(span.maxX - span.minX).toBeGreaterThan(PHOTO_MAX_W);
  });
});
