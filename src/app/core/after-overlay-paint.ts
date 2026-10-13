/** Run after the current frame and the next paint so a static overlay can show first. */
export function afterOverlayPaint(run: () => void): void {
  if (typeof requestAnimationFrame !== 'function') {
    run();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}
