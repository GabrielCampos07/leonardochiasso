# Leonardo Chiasso — Script Figma

Landing no modelo [Giorgio Armani Experience](https://www.armani.com.br/experience/giorgio-armani).  
About LC inspirado na [Lacoste About](https://corporate.lacoste.com/about/).  
E-commerce (PLP / PDP / Sacola) no padrão [Armani](https://www.armani.com.br/giorgio-armani/masculino/novidades).

**Arquivo:** https://www.figma.com/design/L85Svx7vIfwR6Y7SPz3Ch5 · `L85Svx7vIfwR6Y7SPz3Ch5`

## DNA

| Token | Hex | Uso |
|---|---|---|
| white | `#FFFFFF` | Fundo infinito de página |
| void | `#0E0C0E` | Texto, tag, trama, CTA, footer, faixa pilares |
| ash | `#A4A4A4` | Secundário: divisórias, labels muted, âncoras |

**Marca/display:** Eurostile Extended Light (proxy: Encode Sans Expanded Light)  
**Corpo:** Geon Soft (proxy: Quicksand)

---

## Components · página `15 Components`

Chrome canônico (Landing): `Chrome/Utility|Header|Footer` Desktop + Mobile.  
Nav Desktop: `NOVIDADES · FEMININO · MASCULINO · JÓIA · ARTE · CASA · ABOUT` (ABOUT no fim).  
Mega menus produto (padrão [Armani](https://www.armani.com.br/experience/giorgio-armani)): `Chrome/Mega Menu Feminino` `129:73` · `Masculino` `129:843` (+ stubs NOVIDADES/JÓIA/ARTE/CASA).  
Mobile: header hamburger Armani `119:634` + `Chrome/Menu Sheet Mobile` `131:982` (demo `LC Landing Mobile · Menu Open`).  
Sections: `Section/Newsletter` · Cards: `Card/Product Real|Placeholder` · `Card/Fabric Spec`.  
**Não duplicar** header/footer — só instances.

---

## Desktop Landing · `LC Landing Desktop` `18:1467` · 1440

| Seção | Node | Notas |
|---|---|---|
| S0–S1 | instances `Chrome/Utility|Header Desktop` | ABOUT no fim da nav |
| S2 Hero | Campanha full-bleed | CTAs → `Button/Primary|Ghost` |
| S3 Novidades | `19:42` · h 720 | Full-bleed · crop top · texto/CTA overlay |
| S7–S8 | `Section/Newsletter` + `Chrome/Footer Desktop` | |

Demo mega aberto: `LC Landing Desktop · Mega Feminino` `129:883` (Utility + Header + Mega Feminino).

### S3 Novidades

Foto ABSOLUTE full-bleed (`CROP` top-aligned) · layers: photo → veil · título → EXPLORAR · pairing feminino/masculino correto.

---

## About Desktop · `LC About Desktop` `78:17`

Página: `05 About Desktop 1440` — padrão Lacoste (ABOUT + âncoras + quote + editoriais + pilares + tecido).

**S3 O criador** `103:17` — split 2 colunas: foto manifesto (720×780, `FILL`) | texto “Leonardo Chiasso, o criador”.

**S8 O tecido** `79:40` — mídia `tecido-canhamo-roupa` (cânhamo → roupa) + Canvas / Cambraia.
Assets: `leo-chiasso/assets/tecido-canhamo-roupa.gif` (loop) · poster no Figma (canvas não anima GIF).

## About Mobile · `LC About Mobile`

Página: `06 About Mobile 390`.

---

## PLP Novidades Feminino

| Página | Frame |
|---|---|
| `08 PLP Feminino Desktop 1440` | `LC PLP Feminino Desktop` `87:18` |
| `09 PLP Feminino Mobile 390` | `LC PLP Feminino Mobile` `87:378` |

- Breadcrumb · título **Novidades Feminino** + count `1`
- Barra filtros / ordenar
- Grid 3 col (desktop) / 2 col (mobile): 1 card real + placeholders “Em breve”
- Produto: Calça pantalona rasgo · R$ 4.000,00 · thumb `plp-calca-thumb`

Ref: https://www.armani.com.br/giorgio-armani/masculino/novidades

---

## PDP Calça pantalona rasgo

| Página | Frame |
|---|---|
| `10 PDP Calça Desktop 1440` | `LC PDP Calça Desktop` `88:18` |
| `11 PDP Calça Mobile 390` | `LC PDP Calça Mobile` `89:18` |

- Galeria `pdp-calca-01…06`
- Buy box: preço · Off-white · ÚNICO · **ADICIONAR À SACOLA**
- Descrição · Detalhes · Frete + devoluções
- Tecido: Cambraia 100% cânhamo · Seasonless

Refs: [PDP polo](https://www.armani.com.br/camisa-polo-de-viscose-stretch-giorgio-armani-3gsf51-sjp4z-uc99/p) · [PDP clutch](https://www.armani.com.br/bolsa-clutch-la-pima-giorgio-armani-gw001000-af28761-u8049/p)

---

## Sacola / Carrinho

| Página | Frame |
|---|---|
| `12 Sacola Desktop 1440` | `LC Sacola Desktop` `91:44` — drawer 420px + scrim |
| `13 Sacola Mobile 390` | `LC Sacola Mobile` `91:18` — painel full-screen |

- Header **SACOLA (1)** · linha Calça pantalona rasgo · qty · Remover
- Subtotal R$ 4.000,00 · **FINALIZAR COMPRA** · CONTINUAR COMPRANDO
- Thumb `cart-calca-thumb`

---

## Logo Leão · página `14 Logo Leão`

Símbolo auxiliar (leão coroado bordado) — PNG transparente, textura preservada.

| Componente | Node | Uso |
|---|---|---|
| `Logo/Lion Black` | `97:18` | white / ash |
| `Logo/Lion Silver` | `97:20` | void |

Assets: `leo-chiasso/assets/logo-leao-black.png` · `logo-leao-silver.png`  
Quadros: Components · Antes/Depois · Previews (white / ash / void).

---

## Slots de mídia

- `hero-runway` · `photo-feminina` / `photo-masculina`
- `about-hero-manifesto`
- `plp-calca-thumb` · `pdp-calca-01…06` · `cart-calca-thumb`
- `line-hempcouture` / `line-artcouture` / `runway-loop`
- `craft-tag-detail` · `ig-01…06`
- `logo-leao-black` · `logo-leao-silver`
- `tecido-canhamo-roupa` (GIF cânhamo → roupa)

## Referências

- Landing: https://www.armani.com.br/experience/giorgio-armani  
- About: https://corporate.lacoste.com/about/  
- PLP/PDP/Sacola: Armani e-commerce
