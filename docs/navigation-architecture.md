# Arquitetura de navegação — Leonardo Chiasso

Plano conciso para rotas e menus escaláveis. Evitar literais de path espalhados; uma fonte de verdade; migração incremental.

## Estado atual (diagnóstico)

| Área | Situação |
|------|----------|
| `app.routes.ts` | Shell + 4 rotas eager-structure / lazy components: `''`, `about`, `feminino/novidades`, `produto/:slug` |
| Shell | Header + mega + footer + menu-sheet fora do `router-outlet` — OK para chrome compartilhado |
| Links | `'/feminino/novidades'` e `'/about'` repetidos em header, mega, menu-sheet, landing, PLP, PDP, about |
| PDP | `'/produto/' + slug` no product-card |
| About | Fragments via `href="#id"` (anchors locais) + `routerLink`+`fragment` em “Saiba mais” |
| Footer / mega | Coleções e legal ainda `href="#"` (stubs) |
| Produtos | `collection: 'Novidades Feminino'` (label), não slug URL (`organic-dreams`) |

**Problema:** paths como string em ~15 lugares → drift e gambiarras ao crescer coleções/categorias.

**Fundação já criada:** `src/app/core/routes.ts` (`PATH`, `ROUTES`, builders, fragments, collection slugs).

---

## Mapa de rotas alvo

Todas as páginas de conteúdo ficam filhas de `LcShell` (header/footer/mega persistentes).

| URL | Página | Notas |
|-----|--------|-------|
| `/` | Landing | Já existe |
| `/about` | About | Fragments: `#marca`, `#criador`, `#casa`, `#tecido`, `#pilares` |
| `/colecao/:collectionSlug` | PLP por coleção | Ex.: `/colecao/organic-dreams` |
| `/categoria/:categorySlug` | PLP por categoria | Ex.: `/categoria/feminino` (opcional, fase 2) |
| `/feminino/novidades` | PLP legado | Redirect → `/colecao/...` ou `/categoria/feminino` após migração |
| `/produto/:slug` | PDP | Já existe; slug estável |
| `/carrinho` | Cart (futuro) | Drawer pode coexistir; rota para deep-link / SSR |
| `/checkout` | Checkout (futuro) | Lazy feature |
| `/legal/privacidade`, `/legal/termos`, `/legal/cookies` | Legal | Lazy leve |
| `**` | → `/` | Manter |

### Coleções (slugs canônicos)

| Nome | Slug |
|------|------|
| Organic Dreams | `organic-dreams` |
| Niponic Dreams | `niponic-dreams` |
| Brazilian Dreams | `brazilian-dreams` |

Constantes: `COLLECTION_SLUGS` em `core/routes.ts`. Modelo de produto deve usar `collectionSlug` (URL) + `collectionLabel` (UI), não só o label atual.

### Categorias (nav principal)

`feminino` | `masculino` | `joia` | `arte` | `casa` — mega-menu e header; URLs concretas só quando houver PLP real.

---

## Fonte única de verdade

```
core/routes.ts          ← PATH, ROUTES, builders, ABOUT_FRAGMENTS, COLLECTION_SLUGS
core/nav.config.ts      ← arrays de menu (header, mega, footer, mobile) — PR seguinte
app.routes.ts           ← usa PATH.* nos `path:`; loadComponent por feature
```

### Regras

1. **Nunca** `routerLink="/feminino/novidades"` hardcoded — usar `ROUTES.*` ou builders.
2. Templates: `[routerLink]="productPath(p.slug)"` ou importar helpers no componente.
3. `app.routes.ts` e links UI leem os **mesmos** segmentos (`PATH`).
4. Redirects de URLs antigas ficam em `app.routes.ts`, não espalhados em componentes.

### Helpers (já em `routes.ts`)

- `productPath(slug)` → `/produto/:slug`
- `collectionPath(slug)` → `/colecao/:slug`
- `aboutPath(fragment?)` / `aboutLink(fragment?)` → About + fragment
- `legalPath('privacidade' | …)`

---

## Lazy loading

Já há `loadComponent` por página — manter.

Quando o catálogo crescer:

```
app.routes.ts
  └─ shell (eager)
       ├─ landing, about          (loadComponent)
       ├─ shop.routes.ts          (loadChildren) — PLP + PDP + redirects
       ├─ checkout.routes.ts      (loadChildren) — cart + checkout
       └─ legal.routes.ts         (loadChildren)
```

Não lazy-loadar o shell. Lazy só features que não abrem no first paint (checkout, legal, e depois shop se o bundle PLP/PDP crescer).

---

## Nav config orientado a dados

Arquivo alvo: `src/app/core/nav.config.ts` (PR 2).

```ts
// Esboço — não implementar tudo de uma vez
export const HEADER_NAV = [
  { key: 'novidades', label: 'NOVIDADES', mega: 'novidades' },
  { key: 'feminino', label: 'FEMININO', mega: 'feminino', route: ROUTES.femininoNovidades /* → collectionPath depois */ },
  { key: 'about', label: 'ABOUT', route: ROUTES.about, active: 'about' },
  // …
];

export const MEGA_LINKS = { /* colunas por MegaKey → { label, route }[] */ };
export const FOOTER_LINKS = { /* atelier, coleções, legal */ };
export const ABOUT_ANCHORS = [ /* id + label — shared with about.ts */ ];
```

- Header, mega-menu, menu-sheet e footer **consomem** esses arrays.
- Adicionar coleção = 1 entrada em `COLLECTION_SLUGS` + nav config + produtos; zero cópia de path em 4 templates.

---

## Fragments (About)

| Estratégia | Uso |
|------------|-----|
| `id` nas `<section>` | Já existe (`marca`, `criador`, …) |
| Nav interna na página | Preferir `routerLink` + `[fragment]` (ou `aboutLink`) em vez de só `href="#…"` — funciona se o user chegar de outra rota |
| Links externos → seção | `aboutLink(ABOUT_FRAGMENTS.criador)` |
| Scroll | `withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })` em `provideRouter` |
| Active state | `ViewportScroller` / IntersectionObserver opcional — fase 2 |

Centralizar IDs em `ABOUT_FRAGMENTS` + lista de labels em `nav.config` (ou `about.anchors.ts`) para o hero e o “Saiba mais” não divergirem.

---

## Shell ↔ rotas em sync

1. **Chrome ativo:** hoje `AboutPage` / PLP chamam `chrome.setActive(...)`. Melhor: um `Router` subscription no shell ou um pequeno `NavActiveService` que mapeia `UrlTree` → `navActive` (ex.: path começa com `about` → `'about'`; `colecao|categoria|feminino` → categoria). Páginas deixam de setar à mão.
2. **Mega:** fecha em `NavigationEnd` (já parcial via clicks) — um listener global no shell evita estado stuck.
3. **Header `routerLinkActive`:** funciona para rotas reais; itens só-mega continuam `button`.
4. **Footer:** mesmas `FOOTER_LINKS` / `COLLECTION_SLUGS` que o mega.

---

## Migração (sem big-bang)

### PR 1 — Fundação (baixo risco) ✅ / próximo wire-up

- [x] `core/routes.ts`
- [ ] `app.routes.ts` usa `PATH.*`
- [ ] Substituir literais óbvios: product-card, header about/feminino, about `moreLinks`
- [ ] Redirects ainda não — URLs públicas iguais

### PR 2 — Nav config

- Extrair `nav.config.ts`; header / mega / menu-sheet / footer leem config
- Footer: trocar `#` por `collectionPath` / `legalPath` / `aboutLink`

### PR 3 — Coleções URL

- PLP lê `:collectionSlug` (e/ou categoria)
- Produtos: `collectionSlug` tipado
- Landing CTAs → `collectionPath(...)` em vez de só feminino/novidades
- `path: 'feminino/novidades'` → `redirectTo: 'colecao/organic-dreams'` (ou categoria) com `pathMatch: 'full'`
- Mega “Linhas” aponta para as 3 coleções

### PR 4 — Features futuras

- `/carrinho`, `/checkout` lazy
- `/legal/*` lazy
- `withInMemoryScrolling` para About
- NavActive derivado da URL

Cada PR deve manter o site navegável; redirects cobrem bookmarks antigos.

---

## Padrão recomendado (resumo)

**Single source of truth:** `core/routes.ts` para paths + builders; `core/nav.config.ts` para menus. Componentes não inventam URLs. Rotas Angular e UI compartilham `PATH`/`ROUTES`. Coleções = `/colecao/:slug`; produtos = `/produto/:slug`; About = `/about` + fragments tipados. Migrar por PRs pequenos com redirects, sem reescrever o shell.
