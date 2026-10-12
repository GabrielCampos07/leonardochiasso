import {
  TOAST_BG,
  TOAST_ERROR_BG,
  TOAST_ERROR_TEXT,
  TOAST_TEXT,
  contrastRatio,
} from './contrast';

describe('toast contrast', () => {
  it('keeps Salvo. at WCAG AA against the 3D notice colors', () => {
    expect(contrastRatio(TOAST_TEXT, TOAST_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(TOAST_ERROR_TEXT, TOAST_ERROR_BG)).toBeGreaterThanOrEqual(4.5);
  });
});
