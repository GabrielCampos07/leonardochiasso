/** Font size / texture height in `makeSoldOutTexture` (42px on a 96px canvas). */
export const SOLD_OUT_TEXT_RATIO = 42 / 96;
export const SOLD_OUT_MIN_TEXT_PX = 14;

/**
 * Scale a sold-out badge so its painted text stays at least `minTextPx` on screen.
 * Close-up the designed size wins (scale 1); far away the badge grows with distance.
 */
export function soldOutBadgeScale(
  distance: number,
  fovDeg: number,
  viewportHeightPx: number,
  badgeWorldHeight: number,
  minTextPx = SOLD_OUT_MIN_TEXT_PX,
): number {
  if (!(distance > 0) || !(viewportHeightPx > 0) || !(badgeWorldHeight > 0) || !(minTextPx > 0)) {
    return 1;
  }
  const worldPerPx = (2 * distance * Math.tan((fovDeg * Math.PI) / 360)) / viewportHeightPx;
  const textPx = (badgeWorldHeight * SOLD_OUT_TEXT_RATIO) / worldPerPx;
  if (!(textPx > 0)) return 1;
  return Math.max(1, minTextPx / textPx);
}
