/** Font size / texture height in `makeSoldOutTexture` (28px on a 72px canvas). */
export const SOLD_OUT_TEXT_RATIO = 28 / 72;
export const SOLD_OUT_MIN_TEXT_PX = 9;

/**
 * Hook ribbons stay world-fixed. Growing with distance made Esgotado cover
 * the photo and name plate in Ver todas / mobile lite / close-up.
 */
export function soldOutBadgeScale(
  _distance?: number,
  _fovDeg?: number,
  _viewportHeightPx?: number,
  _badgeWorldHeight?: number,
  _minTextPx?: number,
): number {
  return 1;
}
