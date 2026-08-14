# Agent 4 — Legal checklist (brief)

**Entrega:** [`docs/legal-production-checklist.md`](../legal-production-checklist.md)
**Escopo:** checklist acionável de conformidade para produção de e-commerce brasileiro, dimensionado para boutique de autor (Leonardo Chiasso / HempCouture) — não boilerplate corporativo.
**Aviso:** o documento abre com disclaimer explícito de que não é parecer jurídico. Itens que dependem de advogado(a)/contador(a) estão marcados como `Pendente legal humano`.

---

## O que foi produzido

12 seções, todas em tabela com colunas de **Exigência** (`Obrigatório` / `Recomendado`), **Status** (`Feito no código` / `Pendente código` / `Pendente legal humano` / `Pendente código + legal`) e **Dono** (`Eng` / `Ops` / `Jurídico` / `Contábil`).

| § | Tema | Itens |
|---|------|-------|
| 0 | Diagnóstico do código (cross-check real) | 11 achados |
| 1 | Empresa e identificação (CNPJ, IE/IM, domínio, INPI) | 8 |
| 2 | CDC + Decreto 7.962/2013 (arrependimento, preço/frete/prazo, atendimento) | 15 |
| 3 | LGPD (bases legais, canal do titular, retenção, subprocessadores) | 14 |
| 4 | Páginas legais e cookies | 11 |
| 5 | Fiscal (NF-e, regime, DIFAL, NCM) | 10 |
| 6 | Pagamentos Stripe BR (contrato, chargeback, estorno) | 13 |
| 7 | Conteúdo obrigatório no site | 8 |
| 8 | Ops/infra com consequência legal (HTTPS, backups, DPA) | 9 |
| 9 | Snippets concretos de código | 5 |
| 10 | Runbooks (titular, arrependimento, chargeback, incidente) | 4 |
| 11–12 | Sequenciamento por fase + portão de go-live | 4 fases, 10 gates |

---

## Cross-check do código (o que motivou os itens)

| Achado | Arquivo |
|--------|---------|
| Links legais são stubs `route: null` → renderizam `href="#"` com `preventDefault` | `src/app/core/nav.config.ts` (`FOOTER_LINKS.legal`), `src/app/shared/components/footer/footer.ts` |
| `PATH.legal` e `legalPath()` existem, mas nenhuma rota `/legal/*` registrada | `src/app/core/routes.ts:74` vs `src/app/app.routes.ts` |
| Copy `"Devoluções em até 14 dias para peças sem uso"` duplicada em 16 lugares | `src/app/core/products.ts` (8×) + `api/prisma/seed.ts` (8×) |
| Nenhum CNPJ, razão social, endereço ou telefone — footer só tem `© Leonardo Chiasso Labels` | `footer.ts` |
| Contato único: `mailto:atelier@leonardochiasso.com`, sem prazo de resposta declarado | `nav.config.ts` |
| Newsletter grava e-mail sem opt-in, finalidade ou link de privacidade (`done = true` local) | `src/app/shared/components/newsletter/newsletter.ts` |
| Armazenamento local `lc-cart` / `lc-wishlist` não divulgado em nenhuma política | `cart.service.ts:5`, `wishlist.service.ts:4` |
| Zero analytics/pixel → zero cookie não essencial hoje | busca global |
| Auth/pedidos/pagamentos ausentes (Fases 2–3) | `docs/backend-security-plan.md` §7 |

---

## Decisões editoriais (por que não é boilerplate)

1. **Marcado o que *não* se aplica.** Decreto 11.034/2022 (SAC telefônico 24h) alcança setores regulados por agência federal — varejo de moda não entra. Registrado explicitamente como `Não aplicável` para ninguém "cumprir" por medo.
2. **Banner de cookies foi condicionado, não prescrito.** Como não existe analytics no código, CMP hoje seria teatro. O item define o *gatilho*: o CMP entra no mesmo PR que adicionar GA4/Meta Pixel/chat de terceiro.
3. **Separação arrependimento × troca.** O maior risco concreto de cláusula abusiva no código atual: os 14 dias "para peças sem uso" colados ao direito legal de 7 dias, que não admite essa condição. Sugestão de copy nova, com nota de que política longa não deve viver em 8 registros de produto + seed.
4. **Frete no estorno.** CDC art. 49 exige devolução de valores pagos "a qualquer título" — o frete pago entra, e o frete de retorno é custo da loja. Item específico porque é onde boutique costuma errar.
5. **Cânhamo tratado como risco real, não como detalhe.** `Cannabis sativa` aparece literalmente nos `details` de todos os 8 produtos. Três itens dedicados: documentação de origem/importação, parecer jurídico sobre a comunicação, e verificação de restrição de categoria na conta Stripe antes de escalar campanha.
6. **Etiquetagem têxtil incluída** (composição, país de origem, CNPJ, conservação) — obrigação fiscalizável de marca de roupa que checklist de e-commerce genérico ignora, e a copy do site precisa bater com a etiqueta física.
7. **Encarregado/DPO calibrado ao porte.** Regime simplificado de agente de pequeno porte (Resolução CD/ANPD nº 2/2022): canal do titular é obrigatório, indicação formal pode ser dispensada — em vez de recomendar contratar DPO externo por reflexo.
8. **Sequenciamento em 4 fases** amarrado às fases do backend plan, com o argumento central: a Fase A (vitrine) é barata e remove os bloqueadores visíveis hoje; o escopo obrigatório triplica no dia em que o Stripe entra.

---

## Itens que só destravam com humano

CNPJ/IE/IM e CNAE · titularidade do domínio · registro INPI · textos de privacidade/termos/trocas · enquadramento como agente de pequeno porte · política de retenção · DPAs e transferência internacional · regime tributário e DIFAL · NCM do cânhamo · conta e contrato Stripe · parecer sobre comunicação da linha HempCouture.

---

## Próximo PR sugerido (Fase A, só código)

1. `src/app/core/company.ts` — fonte única de razão social, CNPJ, endereço, contato (mesmo padrão de `routes.ts`).
2. Registrar `/legal/*` em `app.routes.ts` com `loadChildren`; ampliar a união de tipos de `legalPath()` para 5 páginas.
3. Trocar os `route: null` de `FOOTER_LINKS.legal` por `legalPath(...)`; adicionar bloco de identificação no footer.
4. Corrigir a copy de devolução nos **dois** arquivos (`products.ts` e `seed.ts`) — separando arrependimento de troca.
5. Linkar a seção "Frete + devoluções" da PDP para as páginas legais.

Nada disso depende de backend, auth ou pagamento.
