import { LITE_VIEWPORT_MAX, detectAtelierLiteMode } from './atelier-look';

describe('detectAtelierLiteMode', () => {
  it('turns on for compact viewports without touching layout chrome', () => {
    expect(detectAtelierLiteMode({ width: LITE_VIEWPORT_MAX, hardwareConcurrency: 8, deviceMemory: 8 })).toBeTrue();
    expect(detectAtelierLiteMode({ width: 390, hardwareConcurrency: 8, deviceMemory: 8 })).toBeTrue();
  });

  it('stays off on a capable desktop', () => {
    expect(
      detectAtelierLiteMode({
        width: 1440,
        coarsePointer: false,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        reducedMotion: false,
      }),
    ).toBeFalse();
  });

  it('turns on for reduced motion and low-end hardware', () => {
    expect(detectAtelierLiteMode({ width: 1440, reducedMotion: true, hardwareConcurrency: 8, deviceMemory: 8 })).toBeTrue();
    expect(detectAtelierLiteMode({ width: 1440, hardwareConcurrency: 4, deviceMemory: 8 })).toBeTrue();
    expect(detectAtelierLiteMode({ width: 1440, hardwareConcurrency: 8, deviceMemory: 4 })).toBeTrue();
  });
});
