# Leo Chiasso API (Phase 1)

Read-only catalog API for the Leonardo Chiasso storefront. NestJS + Prisma + PostgreSQL.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | NestJS (TypeScript) |
| ORM | Prisma 6 |
| DB | PostgreSQL 16 |
| Auth | Customer sessions (argon2id + cookie); admin still Phase 2 |
| Media | Metadata + URLs only; binaries stay in SPA assets until S3/CDN |

## Production deploy (Docker)

```bash
# Build and run (Railway / Render / Fly)
docker build -t leo-chiasso-api .
docker run -p 3000:3000 \
  -e DATABASE_URL=... \
  -e SESSION_SECRET=... \
  -e CORS_ORIGINS=https://leonardochiasso.com \
  -e ADMIN_EMAIL=... \
  -e ADMIN_PASSWORD=... \
  -e STORAGE_ENDPOINT=... \
  -e STORAGE_BUCKET=... \
  -e STORAGE_ACCESS_KEY=... \
  -e STORAGE_SECRET_KEY=... \
  -e CDN_BASE_URL=https://cdn.example.com \
  leo-chiasso-api
```

On start the container runs `prisma migrate deploy` then `node dist/main.js`. Health: `GET /api/health`.

### Migrate assets to S3/R2

After bucket + CDN are configured:

```bash
npm run migrate:assets
```

Uploads variants (thumb/card/pdp/zoom) and updates `media_assets.cdn_url`.

## Admin CMS endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/auth/login` | `{ email, password }` → httpOnly admin cookie |
| `POST` | `/api/admin/auth/logout` | Clears admin session |
| `GET` | `/api/admin/auth/me` | Current admin user |
| `PATCH` | `/api/admin/products/:slug` | `{ path, value }` JSON patch |
| `PATCH` | `/api/admin/content/:kind/:slug` | Joias, arte, lookbooks, etc. |
| `POST` | `/api/admin/media/presign` | Presigned upload URL |
| `POST` | `/api/admin/media/complete` | Process variants with Sharp |

Public content: `GET /api/joias`, `/api/arte`, `/api/alta-costura/wearers`, `/api/lookbooks/:slug`, `/api/desfiles/:slug`.

## Quick start

```bash
# From api/
cp .env.example .env   # if needed

# 1. Postgres (host port 5433 → container 5432)
docker compose up -d

# 2. Migrate + seed (from products.ts data)
npm install
npm run prisma:migrate   # creates schema
npm run prisma:seed

# 3. API
npm run start:dev
```

API listens on `http://localhost:3000` by default.

### Scripts

| Script | What |
|--------|------|
| `npm run start:dev` | Nest watch mode |
| `npm run build` | Compile |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:deploy` | `prisma migrate deploy` (CI/prod) |
| `npm run prisma:seed` | Re-seed catalog |
| `npm run prisma:studio` | Prisma Studio |
| `npm run prisma:validate` | Validate schema |

## Public endpoints

All responses are JSON. Cache-Control: `public, max-age=60`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | Published products |
| `GET` | `/api/products/:slug` | Product by slug |
| `GET` | `/api/collections` | All collections |
| `GET` | `/api/collections/:slug` | Collection + its published products |

CORS: origins from `CORS_ORIGINS` (comma-separated), `credentials: true`, methods `GET`/`HEAD`/`OPTIONS`/`POST`/`PUT`/`PATCH`/`DELETE`. Helmet enabled. A global `ValidationPipe` whitelists DTO fields and rejects unknown ones.

## Customer auth

Storefront shoppers only — admin auth is still Phase 2. Guest browsing and cart never require an account; **checkout requires login**. Details in `docs/agent-briefs/agent-2-auth.md` and `docs/checkout-flow.md`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | `{ email, password, name, lgpdConsent }` — consent must be `true` |
| `POST` | `/api/auth/login` | `{ email, password }` |
| `POST` | `/api/auth/logout` | `204`, clears the cookie |
| `GET` | `/api/auth/me` | `{ id, email, name, cpf?, phone? }` or `401` |
| `GET` \| `PUT` | `/api/wishlist` | Read / replace the customer's product slugs (auth required) |
| `POST` \| `DELETE` | `/api/wishlist/:slug` | Add / remove one slug (auth required) |

Passwords use argon2id. Sessions are opaque random tokens in an `httpOnly`, `sameSite=lax`, 7-day `lc_session` cookie (`secure` in production); only the token's HMAC (`SESSION_SECRET`) is stored in `sessions.token_hash`. Auth routes carry light per-IP in-memory rate limits — move to Redis before scaling past one node.

```bash
# Register → me → logout
curl -c jar -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ana@exemplo.com","password":"segredo123","name":"Ana","lgpdConsent":true}'
curl -b jar localhost:3000/api/auth/me
curl -b jar -X POST localhost:3000/api/auth/logout
```

## Env

See `.env.example`:

- `DATABASE_URL` — Postgres connection string
- `CORS_ORIGINS` — e.g. `http://localhost:4200` (must list every origin; credentials are enabled)
- `SESSION_SECRET` — HMAC key for session token hashes; rotating it logs every customer out
- `ENABLE_DEV_LOGIN` — set `true` only locally for passwordless `POST /api/auth/dev-login` (always ignored when `NODE_ENV=production`)
- `SESSION_COOKIE_NAME` — optional, defaults to `lc_session`
- `PUBLIC_ASSET_BASE` — optional prefix for seeded media URLs (empty → relative `assets/media/...`)
- `CDN_BASE_URL` / `STORAGE_*` — placeholders for Phase 2

**Never** put DB/storage/PSP secrets in the Angular app.

## Media strategy (Phase 1 → S3/CDN)

**Phase 1 (now):** seed writes `media_assets.storage_key` and `cdn_url` pointing at existing frontend paths (`assets/media/...`), optionally prefixed with `PUBLIC_ASSET_BASE`. The Angular SPA still serves those files from `src/assets/`.

**Exit to Phase 2:**

1. Provision S3-compatible bucket + CDN (`CDN_BASE_URL`).
2. Upload originals under a versioned/content-hashed key; generate variants (thumb/card/pdp).
3. Update `media_assets` rows (`storage_key`, `cdn_url`, dimensions, mime).
4. Point storefront image `src`s at API `cdnUrl` / `thumb` / `gallery` (already the case once CatalogService is wired).
5. Stop bundling catalog photos in the SPA once CDN is authoritative.

Schema already has `role` (`thumb` \| `gallery` \| …), `storage_key`, `cdn_url`, and optional `variant_of`.

## Data model (catalog subset)

`collections`, `categories`, `products`, `product_collections`, `media_assets`, `product_media`.

Customer auth adds `customers`, `sessions`, `wishlist_items` (migration `add_customers_auth`).

Money: `price_cents` integer + `currency = BRL`. Seed collections: Organic / Niponic / Brazilian Dreams. Category: `feminino`.

## Deferred (Phase 2+)

- Admin auth (sessions/RBAC), product CRUD, media upload + Sharp variants
- ~~Orders, checkout sessions, PSP webhooks (Phase 3)~~ → **Stripe Checkout** (auth-only) in `CheckoutModule` + profile/addresses in `AccountModule` (fill `STRIPE_*` in `.env`)
- ~~Addresses~~ → `Address` model + `/api/account/addresses`
- Customer password reset + e-mail verification

## Checkout (Stripe, só logado)

Fluxo completo: [`docs/checkout-flow.md`](../docs/checkout-flow.md).

| Method | Path | Notes |
|--------|------|-------|
| GET/PATCH | `/api/account/profile` | name, email, cpf, phone (`CustomerGuard`) |
| GET/POST/PATCH/DELETE | `/api/account/addresses` | CRUD de endereços |
| POST | `/api/checkout/sessions` | body: `{ items, cpf, phone, addressId | address, idempotencyKey? }` → `{ url, publicCode }` |
| GET | `/api/checkout/orders/:publicCode` | read-only status |
| POST | `/api/webhooks/stripe` | signature verified |

Set in `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STOREFRONT_URL`.  
Local webhook: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`