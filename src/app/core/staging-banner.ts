/** Default copy when the host is staging but `environment.stagingBanner` is absent. */
export const STAGING_BANNER_DEFAULT = 'Ambiente de teste, dados reais';
export const STAGING_HOST = 'staging.leonardochiasso.com';
/** Local preview: `?stagingBanner=1` or `localStorage.lc.admin.stagingBanner=1`. */
export const STAGING_BANNER_PREVIEW_KEY = 'lc.admin.stagingBanner';

const PROD_HOSTS = new Set(['leonardochiasso.com', 'www.leonardochiasso.com']);

/** Defensive read — PR #1 adds the field; this branch must not assume it exists. */
export function readEnvStagingBanner(env: unknown): string {
  const value = (env as { stagingBanner?: string } | null | undefined)?.stagingBanner;
  return typeof value === 'string' ? value.trim() : '';
}

export function isProductionAdminHost(hostname: string): boolean {
  return PROD_HOSTS.has(hostname.trim().toLowerCase());
}

export interface StagingBannerContext {
  env: unknown;
  hostname: string;
  queryPreview?: string | null;
  storagePreview?: string | null;
}

/**
 * Banner text or `null` when it must stay hidden.
 * 1. Non-empty `environment.stagingBanner` (staging file from PR #1).
 * 2. Hostname `staging.leonardochiasso.com` → default copy.
 * 3. Dev preview override on non-prod hosts only.
 * Never shown on leonardochiasso.com / www via fallback or preview.
 */
export function resolveStagingBannerText(ctx: StagingBannerContext): string | null {
  const fromEnv = readEnvStagingBanner(ctx.env);
  if (fromEnv) return fromEnv;

  const host = ctx.hostname.trim().toLowerCase();
  if (host === STAGING_HOST) return STAGING_BANNER_DEFAULT;
  if (isProductionAdminHost(host)) return null;

  const preview =
    ctx.queryPreview === '1' ||
    ctx.queryPreview === 'true' ||
    ctx.storagePreview === '1' ||
    ctx.storagePreview === 'true';
  return preview ? STAGING_BANNER_DEFAULT : null;
}

export function readStagingBannerStorage(
  storage: Pick<Storage, 'getItem'> | null = defaultStorage(),
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(STAGING_BANNER_PREVIEW_KEY);
  } catch {
    return null;
  }
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
