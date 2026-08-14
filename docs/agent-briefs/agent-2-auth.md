# Agent 2 — Customer Auth — delivered

Storefront customer accounts (**not** admin/CMS auth). Browsing, cart and guest
checkout stay open — login is never required.

## What was built

- Prisma: `customers`, `sessions`, `wishlist_items` (migration `add_customers_auth`)
- Session cookie auth with argon2id password hashing
- `AuthModule` — register / login / logout / me
- `WishlistModule` — per-customer favourites, guest list merged on login
- Angular `AuthService` + `/conta/entrar` and `/conta/cadastro` pages
- Account icon in the utility bar points at favourites when signed in, login when not

## Endpoints

| Method | Path | Auth | Body / Result |
|--------|------|------|---------------|
| `POST` | `/api/auth/register` | — | `{ email, password, name, lgpdConsent }` → `201 { id, email, name }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `200 { id, email, name }` |
| `POST` | `/api/auth/logout` | — | `204`, clears the cookie |
| `GET` | `/api/auth/me` | cookie | `200 { id, email, name }` or `401` |
| `GET` | `/api/wishlist` | cookie | `200 string[]` of product slugs |
| `PUT` | `/api/wishlist` | cookie | `{ productSlugs: string[] }` replaces the list → `200 string[]` |
| `POST` | `/api/wishlist/:slug` | cookie | adds one slug → `201 string[]` |
| `DELETE` | `/api/wishlist/:slug` | cookie | removes one slug → `200 string[]` |

Errors are Portuguese and safe to show as-is: `409` duplicate e-mail, `401`
`E-mail ou senha inválidos.` (identical for unknown e-mail and wrong password),
`400` missing LGPD consent or invalid payload, `429` rate limited.

## Session model

- Cookie `lc_session`: `httpOnly`, `sameSite=lax`, `path=/`, 7-day `maxAge`,
  `secure` when `NODE_ENV=production`. Name overridable via `SESSION_COOKIE_NAME`.
- The cookie holds 32 random bytes (base64url). Only its HMAC-SHA256 digest is
  stored in `sessions.token_hash`, keyed by `SESSION_SECRET` — a leaked database
  dump cannot be replayed as a session. Rotating the secret logs everyone out.
- Passwords: argon2id. Unknown e-mails are still verified against a throwaway
  hash so login timing cannot be used to enumerate customers.
- Expired rows are pruned on login and on first use after expiry.
- Rate limits (in-memory, per IP + route): register 5/min, login 10/min,
  logout 30/min, me 120/min. Swap for Redis before running multiple API nodes.

## Guest vs logged-in wishlist

| | Storage | Behaviour |
|---|---|---|
| Guest | `localStorage['lc-wishlist']` | Favourites work with no account; nothing is sent to the API |
| Logged in | `localStorage` + `wishlist_items` | Every add/remove mirrors to `PUT /api/wishlist` (fire-and-forget) |

On login, register, or a session restored from the cookie on page load,
`WishlistService.syncAfterLogin()` runs a **union merge**: it reads the server
list, merges the local one into it, and writes the result back. A guest who
favourites three pieces and then signs in keeps all three. Logout leaves the
list on the device and stops syncing — the server copy is untouched.

Wishlist entries are product slugs, which match storefront product `id`s, so the
existing localStorage lists carry over without migration.

## Env

`api/.env.example` documents:

- `SESSION_SECRET=` — HMAC key for session token hashes. Set a long random
  string in production; rotating it invalidates all sessions.
- `SESSION_COOKIE_NAME=` — optional, defaults to `lc_session`.

CORS now allows `GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE` with
`credentials: true`, so every storefront origin must be listed explicitly in
`CORS_ORIGINS` (wildcards are invalid with credentials).

## Frontend notes

- `AuthService` exposes `user` / `isLoggedIn` / `resolved` signals and calls
  `me()` once on startup to rehydrate from the cookie.
- Every API call passes `{ withCredentials: true }`, matching `CartService`. No
  HTTP interceptor was needed, so `app.config.ts` is unchanged.
- `authErrorMessage()` flattens Nest error payloads (string or class-validator
  array) into one line for the forms.
- Sign-out lives on the favourites page (`/conta/favoritos`).

## Not in scope

Stripe/orders (Agent 3), admin auth, password reset, e-mail verification,
addresses. `POST`/`DELETE /api/wishlist/:slug` exist but the storefront only
uses `PUT`.
