# Leo Chiasso — Backend, Media & Security Plan

Practical architecture plan for moving the Angular storefront from a static catalog to a secure backend + object storage setup, then payments — sized for a fashion boutique (HempCouture), not a marketplace platform.

**Status:** Phase 1 scaffold **done** — NestJS + Prisma catalog API in `api/`, Angular `CatalogService` with local `PRODUCTS` fallback. Admin CMS / uploads / payments remain Phase 2–3.  
**Audience:** engineering + brand ops  
**Related:** [README](../README.md), [API README](../api/README.md), current catalog in `src/app/core/products.ts`, media in `src/assets/media/`

---

## 0. Current frontend (what we are evolving)

| Area | Today |
|------|--------|
| Stack | Angular 20 standalone SPA (SCSS tokens, local cart) |
| Catalog | Hardcoded `PRODUCTS` array + helpers in `src/app/core/products.ts` |
| Product shape | `id`, `slug`, `name`, `price` (centavos-style BRL number), `priceLabel`, color/size/fabric/season, `details[]`, `thumb` + `gallery[]` as asset paths, `category` (`feminino` \| `masculino`), `collection` string |
| Media | Bundled under `src/assets/media/` and `src/assets/brand/` (~13MB+ already; hero/about JPGs are large). Real product PNGs are landing in the same folder. |
| Cart | `CartService` — `localStorage` key `lc-cart`; checkout is a stub (`attemptCheckout` → payment notice). No gateway. |
| Routes | `/`, `/about`, `/feminino/novidades` (PLP), `/produto/:slug` (PDP) |
| Collections (UI) | Organic Dreams (copy on products), Brazilian Dreams / Niponic Dreams (nav/footer placeholders) |

**Pain this plan solves:** bundling every photo into the SPA increases build size, cache invalidation pain, and forces redeploys for catalog changes. Payments and PII must never live in the frontend alone.

---

## 1. Recommended stack (pragmatic boutique)

Keep TypeScript end-to-end so one team can own storefront + API.

### Recommended (default)

| Layer | Choice | Why |
|-------|--------|-----|
| API | **NestJS** (Node) or **Fastify + TypeScript** | Fits Angular team; solid modules for auth, validation, webhooks |
| ORM / DB | **Prisma + PostgreSQL** | Parameterized queries by default; clear migrations; good for products/orders |
| Auth (admin) | **Session cookies (httpOnly, Secure, SameSite)** for admin SPA *or* short-lived JWT access + rotating refresh in httpOnly cookie | Prefer sessions for a small admin CMS; avoid long-lived JWTs in `localStorage` |
| Admin CMS | Thin **Angular admin** (or Nest + simple server-rendered admin) calling the same API with RBAC | Boutique volume: CRUD products, collections, media, orders — not a full headless CMS product |
| Object storage | **S3-compatible** (AWS S3, Cloudflare R2, or Contabo/DigitalOcean Spaces) | Never store binaries in Postgres |
| CDN | CloudFront / Cloudflare in front of the public bucket (or R2 public + CDN) | Fast product imagery worldwide |
| Image pipeline | Upload original → worker generates **variants** (thumb, card, PDP, zoom) via Sharp or a managed image CDN (Cloudflare Images / imgproxy) | Store variant URLs/keys in DB |
| Hosting | API on a small VPS or managed container (Fly/Railway/Render); Postgres managed; static Angular on CDN | Low ops for boutique scale |
| Payments (BR) | **Stripe** *or* **Mercado Pago** / **PagSeguro** (PCI-compliant PSP) | Tokenization / Checkout redirect / Pix; webhook-driven order confirmation |

### Alternatives (acceptable)

- **Supabase** (Postgres + Auth + Storage) if you want faster Phase 1–2 with less custom infra — still put a thin Nest/Edge layer in front for payment webhooks and admin RBAC; do not expose service keys to the browser.
- **Medusa / Saleor** only if you want a ready-made commerce engine; heavier than needed for a few dozen SKUs unless ops prefers it.

### What the Angular storefront becomes

- Replace `PRODUCTS` / `getProductBySlug` with an `HttpClient` **CatalogService** (`GET /api/products`, `GET /api/products/:slug`, `GET /api/collections/:slug`).
- Keep cart client-side until Phase 3; then create **server-side order drafts** before redirecting to the PSP (prices/stock validated on the server — never trust client prices).
- Image `src`s become CDN URLs from the API response, not `assets/media/...`.

---

## 2. Media architecture

### Principles

1. **Binaries live in object storage** — never in Postgres, never required in the Angular bundle for catalog photos.
2. **DB holds metadata only:** `storage_key`, `cdn_url`, mime, width/height, alt text, sort order, variant role (`thumb` \| `gallery` \| `hero` \| `og`).
3. **Public product images** via CDN with long cache + immutable keys (content-hash or version in path).
4. **Private assets** (unreleased lookbooks, invoices PDFs) via **short-lived signed URLs** only when needed.

### Upload flow (admin)

```
Admin UI → API (auth + RBAC)
  → validate file (size, MIME, magic bytes)
  → optional virus scan
  → PUT to private staging prefix OR direct-to-storage with pre-signed POST
  → enqueue variant job
  → on success: write media_asset rows + attach to product
  → CDN purge/invalidate only if overwriting same key (prefer new keys)
```

### Variants (suggested)

| Role | Max edge | Use |
|------|----------|-----|
| `thumb` | 400px | PLP / cart |
| `card` | 800px | PLP hover / grids |
| `pdp` | 1600px | PDP gallery |
| `zoom` | 2400px | optional lightbox |
| `og` | 1200×630 | social share |

Keep originals in a non-public prefix (`originals/`) if storage cost allows; serve only derivatives publicly.

### Frontend migration

- Phase 1: seed DB from current `products.ts` + upload existing files from `src/assets/media/`.
- Leave brand marks (logo, favicon) in frontend or a small static CDN folder — they change rarely.
- Campaign heroes can move to CMS/media table when marketing needs non-deploy updates.

---

## 3. Data model sketch

IDs: UUIDs. Money: **integer centavos** (`price_cents`) + `currency = 'BRL'`. Slugs unique.

```
collections
  id, slug, name, description, sort_order, published_at
  -- Organic Dreams, Niponic Dreams, Brazilian Dreams, plus PLP groupings if needed

categories
  id, slug, name          -- feminino, masculino (extend later)

products
  id, slug, name, description, details jsonb, shipping_copy
  price_cents, currency
  color, size, fabric, season
  category_id, status (draft|published|archived)
  stock_qty (or inventory table later)
  created_at, updated_at

product_collections
  product_id, collection_id, sort_order   -- M:N

media_assets
  id, storage_key, cdn_url, mime, bytes, width, height
  alt_pt, role, variant_of (nullable FK self), created_at

product_media
  product_id, media_asset_id, sort_order, is_primary

customers
  id, email, name, phone, lgpd_consent_at, marketing_consent_at
  created_at

addresses (optional early)
  id, customer_id, label, street, number, complement, district, city, state, postal_code, country

orders
  id, public_code, customer_id (nullable guest)
  status (pending_payment|paid|fulfillment|shipped|cancelled|refunded)
  subtotal_cents, shipping_cents, total_cents, currency
  shipping_address jsonb (snapshot), billing_address jsonb
  psp_name, psp_payment_id, psp_checkout_id
  idempotency_key unique
  created_at, updated_at, paid_at

order_items
  id, order_id, product_id, product_snapshot jsonb  -- name/slug/price at purchase
  quantity, unit_price_cents, line_total_cents

payment_events (audit)
  id, order_id, psp, event_type, psp_event_id unique, payload jsonb, verified, received_at

admin_users
  id, email, password_hash (argon2id), role (owner|editor|viewer), last_login_at, disabled_at

audit_logs
  id, actor_admin_id, action, entity_type, entity_id, meta jsonb, ip, created_at
```

**Notes aligning with current UI**

- Today `collection` is a free string (`Novidades Feminino`); normalize to `collections` + optional “channel”/nav groupings later.
- `priceLabel` is derived client-side from `price_cents` via `Intl` — do not store formatted strings as source of truth.
- Guest checkout is fine: create `customers` on first successful order email.

---

## 4. Payments (secure by design)

### Rules (non-negotiable)

- **Never** store card PAN, CVV, full track data, or magnetic stripe. Do not log them.
- **Never** build custom card crypto / “our own PCI vault.”
- All card/Pix UI flows go through a **PCI-compliant PSP** (Stripe Checkout / Elements, Mercado Pago Checkout Pro or Bricks, PagSeguro checkout). Prefer **hosted checkout / redirect** for smallest PCI SAQ scope (SAQ A when no card data touches your servers).

### Recommended flow

```
1. Client: cart → POST /api/checkout/sessions  (auth optional)
2. API: re-validate products, prices, stock; create order status=pending_payment
   with idempotency_key (client UUID or hash of cart+customer)
3. API: create PSP session/preference with order_id in metadata; return redirect_url / client_secret
4. Client: redirect or mount PSP widget (no PAN to our API)
5. PSP → POST /api/webhooks/{psp}  (raw body + signature verification)
6. API: verify signature; upsert payment_events by psp_event_id (idempotent);
   transition order → paid; decrement stock; enqueue email
7. Client success page: GET /api/orders/:public_code (read-only, no secrets)
```

### Webhooks & idempotency

- Verify **HMAC / signature** with PSP webhook secret; reject unsigned payloads.
- Deduplicate on `psp_event_id` (and your `idempotency_key` on session create).
- Treat webhooks as source of truth for payment state; do not mark paid only because the browser hit `/sucesso`.
- Store only: last4 (if PSP provides), brand, payment method type, amount, status — never CVV/PAN.

### Refunds / chargebacks

- Initiate refunds via PSP API from admin; mirror status in `orders` + `payment_events`.
- Log every money-affecting action in `audit_logs`.

---

## 5. Security checklist (what is necessary)

### Transport & config

- [ ] HTTPS/TLS everywhere (API, admin, storefront, webhooks); HSTS on public hosts
- [ ] Secrets only in env / secret manager (never commit `.env`, PSP keys, DB URLs, JWT secrets)
- [ ] Separate secrets per environment (dev / staging / prod)
- [ ] Disable directory listing; minimal server error detail in production

### API hardening

- [ ] Strict **CORS**: allow only storefront + admin origins
- [ ] **Rate limiting** on auth, checkout, newsletter, webhooks (webhook limit by IP + signature still required)
- [ ] Request size limits; disable unused HTTP methods
- [ ] Security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- [ ] **Input validation** (Zod/class-validator) on every write path; whitelist fields

### Auth & admin

- [ ] Admin auth: argon2id passwords, lockout / rate limit, optional MFA for `owner`
- [ ] **RBAC**: `owner` (payments/refunds/users), `editor` (catalog/media), `viewer` (orders read-only)
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Strict` (or Lax if cross-subdomain); CSRF token for cookie-based mutating admin APIs
- [ ] No admin JWT in `localStorage` if avoidable
- [ ] Separate admin origin or path; no public registration for admin

### Injection / XSS / uploads

- [ ] ORM / parameterized SQL only (Prisma) — no string-concat queries
- [ ] Escape/sanitize any rich text; prefer plain text + structured `details` arrays
- [ ] Angular default escaping + CSP (`default-src 'self'`; allow CDN img/font hosts; tight `script-src`)
- [ ] File uploads: max size, allowlist MIME (`image/jpeg`, `image/png`, `image/webp`), **magic-byte** check, strip EXIF GPS if policy requires, random storage keys, no user-controlled executable extensions
- [ ] Serve uploads from separate media domain when possible (cookie-less)

### Payments & data

- [ ] Webhook signature verification + idempotent handlers
- [ ] Order/payment **audit trail** (`payment_events`, `audit_logs`)
- [ ] Server-side price/stock authority
- [ ] Signed URLs for private objects; short TTL

### Privacy (LGPD)

- [ ] **PII minimization**: collect only what fulfillment/tax needs
- [ ] Explicit consent for marketing; store `lgpd_consent_at` / purpose
- [ ] Retention policy (orders vs newsletter); process for access/deletion requests
- [ ] Access logs for admin viewing customer PII
- [ ] DPA with PSP/hosting providers; document subprocessors

### Ops

- [ ] Automated DB backups + restore drill; object storage versioning optional
- [ ] Dependency scanning (npm audit / Dependabot / Snyk) in CI
- [ ] Structured logs without secrets/PII in clear text where possible
- [ ] Staging environment with test PSP keys only

---

## 6. What NOT to build custom

| Do not build | Use instead |
|--------------|-------------|
| Card PAN capture / storage / encryption “vault” | PSP hosted fields / Checkout |
| Homegrown payment crypto or 3DS | PSP |
| DIY CDN / image resizing on the API request path at scale | Object storage + CDN + async variants or image CDN |
| Full PCI DSS Level 1 compliance program for card data | Stay out of card data (SAQ A / A-EP as applicable) |
| Custom “secure messaging” replacing TLS | TLS 1.2+ |
| Rolling your own auth protocol | Sessions/OIDC patterns; argon2id; proven libraries |
| Storing CVV “for recurring” | Forbidden; use PSP tokens / customer vault at PSP |

---

## 7. Phased roadmap

### Phase 0 — Current frontend (now)

- Angular SPA, static catalog + assets, local cart, checkout stub.
- Document product schema; stop growing `src/assets/media` as the long-term catalog store.

### Phase 1 — Read-only catalog API + CDN

- Provision Postgres + Nest/Fastify API + S3-compatible bucket + CDN.
- Seed products/collections from `products.ts`; upload existing media; return CDN URLs.
- Angular: `CatalogService` replaces static imports; PLP/PDP/cart resolve products via API (cart may still be local).
- Public endpoints only; aggressive caching (`Cache-Control` / CDN) for published catalog.
- **Exit criteria:** storefront works with empty `PRODUCTS` array; images load from CDN; SPA bundle no longer ships product photos.

### Phase 2 — Admin uploads & catalog CMS

- Admin auth + RBAC; product/collection CRUD; media upload + variants.
- Draft/publish workflow; audit log for catalog changes.
- Optional: migrate campaign/landing images that marketing changes often.
- **Exit criteria:** ops can add a product + photos without a frontend redeploy.

### Phase 3 — Checkout & payments

- Checkout session API; order + order_items; stock reservation strategy (soft hold vs confirm-on-pay).
- Integrate Mercado Pago / Stripe / PagSeguro; webhook verification; success/cancel pages.
- Emails (order confirmation); basic admin order list + refund trigger via PSP.
- Cart: still UX on client, but checkout always server-priced.
- **Exit criteria:** paid test order in staging; webhook idempotency proven; no card data in logs/DB.

### Phase 4 — Hardening

- CSP tuned in production; WAF/rate limits; MFA for admin owners.
- Backup restore test; dependency scanning gates; LGPD request runbook.
- Monitoring/alerts on webhook failures, 5xx, auth lockouts.
- Penetration test or checklist review before major campaign.
- **Exit criteria:** security checklist above largely green; documented incident response for payment anomalies.

---

## 8. Frontend touchpoints (implementation map)

| Current module | Change when |
|----------------|-------------|
| `src/app/core/products.ts` | Phase 1 — delete/seed-only; replace with API |
| `src/app/core/product.model.ts` | Phase 1 — align with API DTOs (`priceCents`, `media[]`) |
| `src/app/core/cart.service.ts` | Phase 3 — call checkout session; keep local lines until then |
| PLP / PDP / product-card | Phase 1 — bind to CDN URLs |
| Cart drawer “FINALIZAR COMPRA” | Phase 3 — enable against PSP |
| Mega-menu / footer collection links | Phase 1–2 — real collection slugs |

---

## 9. Suggested env surface (illustrative)

```bash
DATABASE_URL=
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
CDN_BASE_URL=
SESSION_SECRET=
CORS_ORIGINS=
PSP_SECRET_KEY=
PSP_WEBHOOK_SECRET=
ADMIN_COOKIE_DOMAIN=
```

Rotate on leak; never expose `PSP_SECRET_KEY` or `STORAGE_SECRET_KEY` to Angular (`environment.ts` only gets public PSP publishable key if Elements-style UI is used).

---

## 10. Success metrics

- Product image weight **not** in `ng build` output for catalog media.
- Catalog update latency: publish in admin → live on CDN/API within minutes without redeploy.
- Zero card PAN/CVV in application DB, logs, or support tools.
- Webhook-driven `paid` state with duplicate delivery safety.
- Documented LGPD + backup restore path before first real customer order.

---

*This plan is intentionally boutique-scoped: one brand, few collections, admin-operated catalog, PSP for money movement. Expand inventory, multi-warehouse, or OMS only when volume demands it.*
