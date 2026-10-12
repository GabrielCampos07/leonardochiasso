import { forceNonPassiveCanvasListeners } from './scene-engine';

describe('forceNonPassiveCanvasListeners', () => {
  it('registers pointer, touch and wheel as non-passive', () => {
    const canvas = document.createElement('canvas');
    const seen: Array<{ type: string; passive?: boolean }> = [];
    const native = canvas.addEventListener.bind(canvas);
    spyOn(canvas, 'addEventListener').and.callFake(
      (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        seen.push({
          type,
          passive: typeof options === 'object' ? options.passive : undefined,
        });
        return native(type, listener, options);
      },
    );
    const restore = forceNonPassiveCanvasListeners(canvas);
    const noop = () => undefined;
    canvas.addEventListener('pointerdown', noop);
    canvas.addEventListener('touchstart', noop);
    canvas.addEventListener('wheel', noop);
    expect(seen.every((entry) => entry.passive === false)).toBeTrue();
    restore();
  });
});
