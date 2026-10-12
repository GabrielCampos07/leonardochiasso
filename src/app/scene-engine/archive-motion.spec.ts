import { ARCHIVE_TWEEN_MS } from './scene-engine';

describe('archive 3D motion', () => {
  it('keeps the leave/sink tween between 400 and 600 ms', () => {
    expect(ARCHIVE_TWEEN_MS).toBeGreaterThanOrEqual(400);
    expect(ARCHIVE_TWEEN_MS).toBeLessThanOrEqual(600);
  });
});
