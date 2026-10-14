import {
  UNPUBLISHED_PREVIEW_LABEL,
  isAdminUnpublishedPreviewEnabled,
  shouldShowUnpublishedPreviewBadge,
} from './admin-preview-badge';

describe('admin unpublished preview badge', () => {
  it('stays off by default', () => {
    expect(isAdminUnpublishedPreviewEnabled({ adminUnpublishedPreviewBadge: false }, { getItem: () => null })).toBeFalse();
    expect(
      shouldShowUnpublishedPreviewBadge(false, true, { publishedAt: null }),
    ).toBeFalse();
  });

  it('shows only for an admin on an unpublished collection when the flag is on', () => {
    expect(UNPUBLISHED_PREVIEW_LABEL).toBe('Prévia, não publicada');
    expect(
      shouldShowUnpublishedPreviewBadge(true, true, { publishedAt: null }),
    ).toBeTrue();
    expect(
      shouldShowUnpublishedPreviewBadge(true, true, { publishedAt: '2026-01-01T00:00:00.000Z' }),
    ).toBeFalse();
    expect(shouldShowUnpublishedPreviewBadge(true, false, { publishedAt: null })).toBeFalse();
  });
});
