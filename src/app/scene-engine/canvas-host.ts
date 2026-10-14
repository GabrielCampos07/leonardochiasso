/** Canvas / host sizing helpers shared by every admin 3D engine. No three.js. */

export interface SceneEngineOptions {
  reducedMotion?: boolean;
  host?: HTMLElement;
  lite?: boolean;
}

export function atelierPixelRatio(
  reducedMotion: boolean,
  dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
): number {
  return reducedMotion ? 1 : Math.min(dpr || 1, 2);
}

/** Keep the drawing buffer CSS at 100% so setSize never locks a px height. */
export function applyCanvasHostCss(canvas: HTMLCanvasElement): void {
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
}

/**
 * Current host box on both grow and shrink. Prefer the laid-out rect; fall back
 * to clientWidth/Height when the rect is collapsed (jsdom / detached nodes).
 */
export function hostDrawingSize(host: HTMLElement): { width: number; height: number } | null {
  const rect = typeof host.getBoundingClientRect === 'function' ? host.getBoundingClientRect() : null;
  const width = Math.max(0, Math.round(rect?.width || host.clientWidth));
  const height = Math.max(0, Math.round(rect?.height || host.clientHeight));
  if (width < 1 || height < 1) return null;
  return { width, height };
}

const NON_PASSIVE_TYPES = new Set([
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'wheel',
]);

/** OrbitControls calls preventDefault; Chrome defaults touch/wheel to passive. */
export function forceNonPassiveCanvasListeners(canvas: HTMLCanvasElement): () => void {
  const original = canvas.addEventListener.bind(canvas);
  canvas.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (NON_PASSIVE_TYPES.has(type)) {
      const next: AddEventListenerOptions =
        typeof options === 'object' && options
          ? { ...options, passive: false }
          : { capture: options === true, passive: false };
      return original(type, listener, next);
    }
    return original(type, listener, options);
  }) as HTMLCanvasElement['addEventListener'];
  return () => {
    canvas.addEventListener = original;
  };
}
