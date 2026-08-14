# Feature briefs — dispatch prompts

## G1 — Legal pages (Composer 2.5 Fast)

Create lazy routes `/legal/privacidade`, `/legal/termos`, `/legal/cookies` under shell. Wire `FOOTER_LINKS.legal` via `legalPath()`. Boutique typography (void/white). Placeholder PT-BR copy marked “modelo — revisar com advogado”. Link from footer.

## G3 — Guia de tamanhos (Composer)

Page `/guia-de-tamanhos` or `/conta`-adjacent; wire footer link. Simple size table for Unique/ÚNICO pieces + contact atelier.

## G7 — Newsletter (Composer)

`POST /api/newsletter` { email } with Prisma `newsletter_subscribers`; front newsletter component submits; toast/inline success. LGPD note under field.

## G8 — Search (Sonnet)

Search sheet or `/busca?q=`; query products by name via API `GET /api/products?q=` or client filter. Wire utility search icon.

## G2 — Checkout UI (with Agent 3 / Opus)

Pages `/checkout/sucesso`, `/checkout/cancelado`; enable cart FINALIZAR COMPRA.

## G10 — Frete (Opus)

CEP → shipping quote stub or Correios/melhor envio later; show on checkout before Stripe.

## G11 — Stock (with Stripe / Opus)

Decrement/reserve stock on paid webhook; reject checkout if stock_qty < qty.

## G13 — Prod env (Opus)

`environment.ts` apiBaseUrl empty or production URL; document build-time replacement.
