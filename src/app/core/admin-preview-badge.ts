import { environment } from '../../environments/environment';

/** localStorage override so the badge can be confirmed without a deploy. */
export const ADMIN_UNPUBLISHED_PREVIEW_KEY = 'lc.admin.unpublishedPreviewBadge';

export const UNPUBLISHED_PREVIEW_LABEL = 'Prévia, não publicada';

/** Off until explicitly enabled in environment or localStorage. */
export function isAdminUnpublishedPreviewEnabled(
  env: { adminUnpublishedPreviewBadge?: boolean } = environment,
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage,
): boolean {
  if (env.adminUnpublishedPreviewBadge) return true;
  try {
    return storage?.getItem(ADMIN_UNPUBLISHED_PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

export function isCollectionUnpublished(
  meta: { publishedAt?: string | null } | null | undefined,
): boolean {
  return Boolean(meta) && !meta?.publishedAt;
}

export function shouldShowUnpublishedPreviewBadge(
  enabled: boolean,
  isAdmin: boolean,
  meta: { publishedAt?: string | null } | null | undefined,
): boolean {
  return enabled && isAdmin && isCollectionUnpublished(meta);
}
