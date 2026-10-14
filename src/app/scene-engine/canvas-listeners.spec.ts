import { bindNonPassiveKeydown, forceNonPassiveCanvasListeners } from './canvas-host';

describe('forceNonPassiveCanvasListeners', () => {
  it('registers pointer, touch, wheel and keyboard as non-passive', () => {
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
    canvas.addEventListener('keydown', noop);
    expect(seen.every((entry) => entry.passive === false)).toBeTrue();
    expect(seen.some((entry) => entry.type === 'keydown' && entry.passive === false)).toBeTrue();
    restore();
  });

  it('binds window keydown as {passive:false} so preventDefault can run', () => {
    const seen: AddEventListenerOptions[] = [];
    const target = {
      addEventListener: (
        _type: string,
        _listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (typeof options === 'object' && options) seen.push(options);
      },
      removeEventListener: () => undefined,
    };
    const stop = bindNonPassiveKeydown(target, () => undefined);
    expect(seen).toEqual([{ passive: false }]);
    stop();
  });
});
