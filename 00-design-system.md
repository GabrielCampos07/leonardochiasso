# Leonardo Chiasso — Design System

**Arquivo:** https://www.figma.com/design/L85Svx7vIfwR6Y7SPz3Ch5 (`leo-chiasso`)  
**Script completo:** [01-script-figma.md](./01-script-figma.md)

## Posicionamento

Luxo sustentável · HempCouture · Organic dream.  
**Fundo infinito** em white `#FFFFFF`. Tipografia e trama em void `#0E0C0E`. Ash `#A4A4A4` para secundário.

## Tokens (somente estes)

| Token | Hex | CSS | Uso |
|---|---|---|---|
| white | `#FFFFFF` | `--lc-white` | Fundo infinito de página |
| void | `#0E0C0E` | `--lc-void` | Texto, tag, trama/overlays, CTA fill, footer |
| ash | `#A4A4A4` | `--lc-ash` | Secundário: divisórias, labels muted, overlays de textura |

Soil / hemp / sage foram **descontinuados** (`_deprecated/*` no Figma).

## Tipografia

| Papel | Fonte-alvo | Proxy no arquivo Figma | Peso |
|---|---|---|---|
| Marca / display | **Eurostile Extended** | Encode Sans Expanded | Light (não grosso) |
| Labels outline | **Eurostile Extended** | Encode Sans Expanded | Regular |
| Corpo / UI | **Geon Soft** | Quicksand | Light / Regular / Medium |

Instale **Eurostile Extended** e **Geon Soft** no Figma Desktop e troque os text styles — os styles já descrevem a fonte-alvo.

**Space:** 8 · 16 · 24 · 40 · 64 · 96 · 144.

## Texturas

Herringbone · Basket · Plain weave · Slub — **void sobre white** (ou ash suave), opacidade 8–18%.

## Logo

### Wordmark
Arquivos oficiais (transparentes):
- **Preta** (`Logo/Black`) — fundos claros / white `#FFFFFF` → header
- **Branca** (`Logo/White`) — fundos void → footer

Também: `Logo/Motion Black` e `Logo/Motion White` (versão com efeito).

Componentes Figma: `30:8` Black · `30:11` White · `30:14` Motion Black · `30:17` Motion White.

### Símbolo — Leão coroado
Marca auxiliar (bordado digitalizado, PNG com alpha — não vetorizar). **Não substitui** o wordmark.

| Componente | Uso | Asset local | Node |
|---|---|---|---|
| `Logo/Lion Black` | Fundos claros (white / ash) | `assets/logo-leao-black.png` | `97:18` |
| `Logo/Lion Silver` | Fundos void | `assets/logo-leao-silver.png` | `97:20` |

Página Figma: `14 Logo Leão` — components + antes/depois + previews white / ash / void.

## Components (`15 Components`)

Regra: **chrome só via instance** — fonte de verdade = Landing Desktop / Mobile.

| Componente | Node | Uso |
|---|---|---|
| `Chrome/Utility Desktop` | `119:322` | Barra utility 1440 |
| `Chrome/Header Desktop` | `133:1163` | Variants `Active=Default|Feminino|Masculino` — barra preta 2px sob o item selecionado |
| `Chrome/Footer Desktop` | `119:370` | 4 cols + Logo/White |
| `Chrome/Utility Mobile` | `119:618` | Utility 390 |
| `Chrome/Header Mobile` | `119:634` | Hamburger · Logo · Search/Bag (padrão Armani) |
| `Chrome/Footer Mobile` | `119:642` | Footer 390 |
| `Chrome/Menu Sheet Mobile` | `131:982` | Menu hamburger aberto (lista + FEMININO expandido + ABOUT no fim) |
| `Chrome/Mega Menu Feminino` | `129:73` | Painel full-width estilo [Armani](https://www.armani.com.br/experience/giorgio-armani) |
| `Chrome/Mega Menu Masculino` | `129:843` | Espelho masculino |
| `Section/Newsletter` | `119:725` | Landing Desktop |
| `Section/Newsletter Mobile` | `119:764` | Landing Mobile |
| `Card/Product Real` | `119:743` | PLP |
| `Card/Product Placeholder` | `119:748` | PLP “Em breve” |
| `Card/Fabric Spec` | `119:734` | About tecido (Canvas/Cambraia) |

Mega menus de produto (NOVIDADES / JÓIA / ARTE / CASA): stubs skeleton em `15 Components`. **ABOUT** não abre mega — só link.

Demo aberto: `LC Landing Desktop · Mega Feminino` `129:883` · `LC Landing Mobile · Menu Open` `131:984`.

Também: `Button/Primary` `3:31` · `Button/Ghost` `3:33` · `Icon/*` · `Overlay/*`.

## Páginas

Campo **white contínuo** (fundo infinito). Estrutura no modelo [Giorgio Armani Experience](https://www.armani.com.br/experience/giorgio-armani):

**Landing:** Utility → Header → Hero campanha → Novidades dual → Módulos de linha → Atelier → Instagram → Newsletter → Footer.

**About LC** (insp. [Lacoste About](https://corporate.lacoste.com/about/)): Utility + Header (instances) → ABOUT + âncoras → citação → Uma marca → O criador (foto \| texto) → A casa → pilares → tecido → saiba mais → Footer (instance).

**E-commerce** (insp. Armani): PLP / PDP / Sacola — mesmo chrome canônico.

Desktop 1440 + Mobile 390. Ver [01-script-figma.md](./01-script-figma.md).
