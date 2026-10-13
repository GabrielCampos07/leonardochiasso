import { afterOverlayPaint } from './after-overlay-paint';

describe('afterOverlayPaint', () => {
  it('does not run the work on the current call stack', () => {
    let ran = false;
    afterOverlayPaint(() => {
      ran = true;
    });
    expect(ran).toBeFalse();
  });

  it('runs after two animation frames', (done) => {
    afterOverlayPaint(() => {
      expect(true).toBeTrue();
      done();
    });
  });
});
