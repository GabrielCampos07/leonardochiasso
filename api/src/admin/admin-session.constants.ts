export const ADMIN_SESSION_COOKIE_NAME = 'lc_admin_session';
export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function adminSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ADMIN_SESSION_TTL_MS,
  };
}
