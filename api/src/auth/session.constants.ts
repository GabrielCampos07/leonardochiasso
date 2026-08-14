import type { CookieOptions } from 'express';

export const DEFAULT_SESSION_COOKIE_NAME = 'lc_session';

/** Session lifetime — 7 days. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}
