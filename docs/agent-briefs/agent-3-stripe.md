# Agent 3 — Stripe Checkout — delivered

## What was built

- Prisma: `orders`, `order_items`, `payment_events`
- `POST /api/checkout/sessions` → Stripe Checkout URL (guest OK)
- `POST /api/webhooks/stripe` with signature + idempotent `payment_events`
- Stock decrement on `checkout.session.completed`
- Front: FINALIZAR COMPRA enabled; `/checkout/sucesso` + `/checkout/cancelado`
- Env placeholders in `api/.env.example`

## User action required

1. Add test keys to `api/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
2. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Restart API; complete a test purchase

Without keys, API returns **503** with a clear message (verified).
