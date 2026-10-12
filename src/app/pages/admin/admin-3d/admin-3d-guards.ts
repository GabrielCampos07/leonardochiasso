export const ADMIN_3D_MOCK_KEY = 'lc.admin.3d.mock';

export interface Admin3dMockFlags {
  /** `environment.production === true` — mock is forbidden. */
  production: boolean;
  /** `environment.admin3dMock` (ignored in production). */
  envMock?: boolean;
  queryMock?: string | null;
  storageMock?: string | null;
}

export function isAdmin3dMockEnabled(flags: Admin3dMockFlags): boolean {
  if (flags.production) return false;
  if (flags.envMock) return true;
  if (flags.queryMock === '1' || flags.queryMock === 'true') return true;
  return flags.storageMock === '1' || flags.storageMock === 'true';
}

export function readAdmin3dMockStorage(
  storage: Pick<Storage, 'getItem'> | null = defaultStorage(),
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(ADMIN_3D_MOCK_KEY);
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

/** Local PRODUCTS catalog is a silent fallback — never in production builds. */
export function shouldUseLocalAdmin3dCatalog(opts: {
  production: boolean;
  useApi: boolean;
}): boolean {
  if (opts.production) return false;
  return !opts.useApi;
}
