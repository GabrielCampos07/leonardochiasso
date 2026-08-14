# Feature gap backlog — Leonardo Chiasso

Audited against storefront routes, `nav.config.ts`, Figma script (`01-script-figma.md`), and Phase plans.

| ID | Gap | Priority | Suggested model | Status |
|----|-----|----------|-----------------|--------|
| G1 | Páginas `/legal/privacidade\|termos\|cookies` + wire footer | Alta | Composer 2.5 Fast | done |
| G2 | Checkout sucesso/cancelado UI (+ enable buy with Stripe) | Alta | Sonnet / Opus (w/ Agent 3) | done |
| G3 | Guia de tamanhos | Média | Composer 2.5 Fast | open |
| G4 | Filtros / ordenar PLP (Figma) | Média | Sonnet | open |
| G5 | Categorias RTW (Vestidos/Calças/…) | Baixa | Composer or skip | open |
| G6 | Masculino / Jóia / Arte / Casa / Lookbook | Baixa | Composer or skip | open |
| G7 | Newsletter funcional (API + persist) | Média | Composer 2.5 Fast | open |
| G8 | Search (ícone sem página) | Média | Sonnet | open |
| G9 | Conta: pedidos / dados (pós-auth) | Média | Sonnet | open |
| G10 | Frete real / CEP | Alta pré-prod | Opus | open |
| G11 | Estoque server-side no checkout | Alta (c/ Stripe) | Opus | open |
| G12 | E-mails transacionais | Média | Sonnet | open |
| G13 | Prod `apiBaseUrl` (não localhost) | Alta deploy | Opus | open |
| G14 | Niponic/Brazilian Dreams produtos | Conteúdo | n/a | open |
| G15 | Separar copy arrependimento 7d × troca 14d (shipping) | Alta | Composer | done |
| G16 | CNPJ + razão social + endereço no footer (Decreto 7.962) | Alta | Composer + Ops | open |
| G17 | Página `/legal/trocas-devolucoes` | Alta | Composer + Jurídico | open |

## Navigation audit notes

- Working: `/`, `/about`, `/colecao/:slug`, `/produto/:slug`, `/conta/favoritos`, cart drawer
- Stubs (`route: null`): RTW links, Lookbook, Masculino novidades, Jóia/Arte/Casa, Guia de tamanhos, legal footer
- Mega stubs: Novidades / Jóia / Arte / Casa show “Em breve”
- Checkout button disabled until Stripe
- Account icon in utility is a non-linked button
- Search icon is a non-linked button
- Newsletter is UI-only (no submit handler to API)

## Dispatch order (recommended)

1. G1 legal pages (Composer) — production blocker for content
2. G2+G11 with Stripe agent (Opus)
3. G7 newsletter, G3 size guide (Composer) in parallel
4. G8 search (Sonnet)
5. G13 before any real deploy
6. G10 frete before charging real customers
7. Defer G4–G6, G14 until catalog grows

## Briefs

See `docs/agent-briefs/feature-*.md` for per-gap agent prompts.
