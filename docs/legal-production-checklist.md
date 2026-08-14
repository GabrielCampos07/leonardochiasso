# Checklist legal de produção — Leonardo Chiasso / HempCouture

> **AVISO — ISTO NÃO É PARECER JURÍDICO.**
> Este documento é um checklist operacional de engenharia e brand ops, escrito para organizar o trabalho antes do primeiro pedido real. Não substitui advogado(a) e contador(a). Referências a leis, decretos e resoluções são indicativas e podem ter mudado. Todo item marcado **Pendente legal humano** exige validação profissional antes de ir ao ar. Não copie textos legais deste arquivo direto para o site.

**Escopo:** boutique de autor, poucas dezenas de SKUs, venda direta B2C no Brasil, catálogo operado pelo atelier.
**Público:** engenharia + brand ops + jurídico/contabilidade externos.
**Relacionados:** [Backend & Security Plan](./backend-security-plan.md), [Arquitetura de navegação](./navigation-architecture.md).

---

## Legenda

| Coluna | Valores |
|--------|---------|
| **Exigência** | `Obrigatório` (lei/decreto aplicável) · `Recomendado` (boa prática, reduz risco) |
| **Status** | `Feito no código` · `Pendente código` · `Pendente legal humano` · `Pendente código + legal` (precisa de texto validado **e** implementação) |
| **Dono** | `Eng` · `Ops` (atelier/brand) · `Jurídico` · `Contábil` |

Um item só vira "verde" quando o texto foi validado **e** está renderizado no site.

---

## 0. Diagnóstico do código (cross-check feito hoje)

| Achado | Onde | Impacto legal |
|--------|------|---------------|
| Links legais do footer — **corrigido** (`legalPath` + rota `/legal/:page`) | `nav.config.ts`, `app.routes.ts`, `pages/legal/legal.ts` | Páginas modelo no ar; texto ainda **Pendente legal humano**. |
| ~~`legalPath()` sem rota~~ | — | Resolvido após Agent 5 / G1. |
| Nenhum CNPJ, razão social, endereço físico ou telefone no site | footer só tem `© {{ year }} Leonardo Chiasso Labels` | Descumpre Decreto 7.962/2013, art. 2º (identificação em destaque). Bloqueador. |
| Único canal de contato é `mailto:atelier@leonardochiasso.com` | `src/app/core/nav.config.ts` (`FOOTER_LINKS.atendimento`) | Aceitável como atendimento eletrônico, mas sem prazo de resposta declarado nem registro de protocolo. |
| Copy de frete/devolução — **corrigida no código** (separar arrependimento 7d × troca 14d); revalidar com jurídico | `products.ts` + `seed.ts` | Ver §9.4. Ainda falta página `/legal/trocas-devolucoes`. |
| Preço sem frete/prazo calculáveis antes do checkout | PDP `src/app/pages/pdp/pdp.html:74` ("Frete + devoluções") | Frete e prazo precisam ser informados **antes** da finalização; hoje não há cálculo por CEP. |
| Newsletter grava e-mail sem consentimento explícito, sem finalidade, sem link de privacidade e sem backend (`done = true` local) | `src/app/shared/components/newsletter/newsletter.ts` | Quando ligar no backend: base legal e registro de consentimento obrigatórios (LGPD). Hoje é inócuo — **não ligue antes de resolver**. |
| Armazenamento local: `lc-cart` e `lc-wishlist` (localStorage) | `src/app/core/cart.service.ts:5`, `src/app/core/wishlist.service.ts:4` | Estritamente necessários → não exigem consentimento, mas **exigem divulgação** na política de cookies/armazenamento. |
| Nenhum banner de cookies, nenhum analytics/pixel encontrado no código | — | Bom: hoje não há o que consentir. Só criar CMP quando entrar GA4/Meta Pixel. Ver §4. |
| `LinkedIn` aponta para `https://www.linkedin.com/` (placeholder) | `src/app/core/nav.config.ts` (`FOOTER_LINKS.redes`) | Link quebrado ≠ risco legal, mas some no polimento de go-live. |
| Auth cliente + Stripe Checkout scaffold implementados; keys Stripe ainda vazias | `api/src/auth`, `api/src/checkout` | Com Stripe ligado, escopo §5–§6 torna-se obrigatório. Preencher `STRIPE_*` só em staging/test até políticas estarem validadas. |

**Leitura estratégica:** enquanto não houver checkout transacionando, o conjunto obrigatório é pequeno e barato (identificação da empresa + privacidade + termos + cookies + correção da copy de devolução). No dia em que o Stripe entrar, o escopo obrigatório triplica. Fazer §1–§4 agora custa pouco; fazer depois, sob pressão de campanha, custa caro.

---

## 1. Empresa e identificação

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 1.1 | CNPJ ativo, CNAE compatível (ex.: 4781-4/00 varejo de vestuário; 1412-6/01 confecção se produz) | Obrigatório | Pendente legal humano | Contábil | CNAE errado gera problema fiscal e de emissão de NF-e. |
| 1.2 | Razão social vs nome fantasia definidos — o footer diz "Leonardo Chiasso Labels", que precisa bater com o cartão CNPJ | Obrigatório | Pendente código + legal | Ops + Eng | Exibir razão social completa; "HempCouture" e "Leonardo Chiasso" como marcas. |
| 1.3 | Inscrição estadual (obrigatória para quem comercializa mercadoria/emite NF-e) | Obrigatório | Pendente legal humano | Contábil | Sem IE não há NF-e de venda. |
| 1.4 | Inscrição municipal (se houver serviço, ex.: sob medida/ajuste cobrado) | Recomendado | Pendente legal humano | Contábil | Só se prestar serviço tributável por ISS. |
| 1.5 | Domínio `leonardochiasso.com` (e `.com.br`, se houver) registrado no CNPJ da empresa, não em CPF pessoal | Obrigatório | Pendente legal humano | Ops | `.com.br` exige CNPJ no registro.br. Titularidade errada = risco de perda do domínio. |
| 1.6 | E-mail corporativo no domínio próprio (`atelier@leonardochiasso.com` ✔) | Recomendado | Feito no código | — | Já é o contato do footer. |
| 1.7 | Marca registrada no INPI (classe 25 — vestuário; avaliar 14 para jóia) para "Leonardo Chiasso" e "HempCouture" | Recomendado | Pendente legal humano | Jurídico | Não bloqueia venda; bloqueia defesa da marca. `HempCouture` é usado como linha em toda a copy de produto. |
| 1.8 | Cadastro no [consumidor.gov.br](https://www.consumidor.gov.br) | Recomendado | Pendente legal humano | Ops | Gratuito, reduz escalada para Procon. |

---

## 2. CDC e Lei do E-commerce (Decreto 7.962/2013)

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 2.1 | Nome empresarial, CNPJ, endereço físico e endereço eletrônico **em destaque e fácil visualização** | Obrigatório | Pendente código + legal | Eng + Ops | Decreto 7.962/2013, art. 2º. Footer + página legal. Ver snippet §9.3. |
| 2.2 | Direito de arrependimento: **7 dias corridos** do recebimento, sem justificativa, sem condição de "sem uso" | Obrigatório | Pendente código + legal | Eng + Jurídico | CDC art. 49. Copy atual dos 8 produtos mistura isso com troca. Ver §9.4. |
| 2.3 | Estorno integral no arrependimento — inclui o frete pago pelo cliente, monetariamente atualizado | Obrigatório | Pendente código + legal | Jurídico + Eng | CDC art. 49, parágrafo único. Frete de retorno é custo do fornecedor. |
| 2.4 | Meios de exercer o arrependimento pelo mesmo canal da compra (não exigir telefone se a compra foi online) | Obrigatório | Pendente código | Eng | Decreto 7.962/2013, art. 5º. Formulário ou e-mail dedicado basta na escala boutique. |
| 2.5 | Preço total claro, com discriminação de frete e demais despesas **antes** da finalização | Obrigatório | Pendente código | Eng | Hoje só "Frete calculado no checkout" — precisa de cálculo por CEP na PDP ou no carrinho. |
| 2.6 | Prazo de entrega informado antes da compra (produção + envio; peças `made to order` precisam de prazo explícito) | Obrigatório | Pendente código + legal | Eng + Ops | Copy atual é `Seasonless`/`peça única` sem prazo. Peça artesanal com prazo longo precisa ser declarada. |
| 2.7 | Diferença de preço por meio de pagamento (Pix vs cartão parcelado) informada, se existir | Obrigatório se houver | Pendente código | Eng | Lei 13.455/2017. |
| 2.8 | Confirmação imediata do recebimento do pedido e da aceitação da oferta (e-mail transacional) | Obrigatório | Pendente código | Eng | Decreto 7.962/2013, art. 4º. Entra na Fase 3 junto do webhook. |
| 2.9 | Atendimento eletrônico com **resposta em até 5 dias** às demandas do consumidor | Obrigatório | Pendente código + legal | Ops + Eng | Decreto 7.962/2013, art. 4º, VII. Declarar o prazo no site; hoje é só um `mailto` sem promessa. |
| 2.10 | Sumário do contrato acessível antes da contratação | Obrigatório | Pendente código + legal | Eng + Jurídico | Resumo de preço, frete, prazo, arrependimento e trocas na tela de checkout. |
| 2.11 | SAC telefônico 24h nos termos do Decreto 11.034/2022 | **Não aplicável** | — | — | Aquele decreto alcança setores regulados por agência federal. Varejo de moda não entra. Registrar aqui para ninguém "cumprir" por medo. |
| 2.12 | Canal de atendimento humano com horário declarado (e-mail + WhatsApp do atelier) | Recomendado | Pendente código | Ops | Proporcional à escala; substitui SAC formal. |
| 2.13 | Etiquetagem têxtil: composição, país de origem, CNPJ do fabricante/importador, cuidados de conservação, tamanho | Obrigatório | Pendente legal humano | Ops | Conmetro/Inmetro (RTQ de produtos têxteis). É a etiqueta física da peça, não o site — mas é fiscalizável e a copy do site deve bater com ela. |
| 2.14 | Claims de sustentabilidade verificáveis (evitar greenwashing) | Obrigatório | Pendente legal humano | Ops + Jurídico | CDC art. 37 + CONAR. A copy usa `100% cânhamo industrial`, `Seasonless`, `made to feel, not to rush` — precisa de lastro documental (certificado do fornecedor de tecido). |
| 2.15 | Documentação de origem/importação do tecido de cânhamo (invoice, DI, NCM, laudo do fornecedor) | Obrigatório | Pendente legal humano | Contábil + Jurídico | `Cannabis sativa` aparece literalmente nos `details` de todos os produtos. Fibra industrial é têxtil, mas o tema é sensível no Brasil: pedir parecer específico e arquivar a documentação **antes** de escalar comunicação. |

---

## 3. LGPD (Lei 13.709/2018)

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 3.1 | Mapa de dados (o que coleta, para quê, onde fica, por quanto tempo) | Obrigatório | Pendente legal humano | Eng + Jurídico | Hoje: nada além de `localStorage` local. Fase 3 adiciona nome, e-mail, telefone, endereço, CPF (para NF-e). Fazer o mapa **antes** de coletar. |
| 3.2 | Base legal por finalidade documentada | Obrigatório | Pendente legal humano | Jurídico | Sugestão a validar: pedido/entrega = execução de contrato (art. 7º, V); NF-e e guarda fiscal = obrigação legal (art. 7º, II); newsletter = consentimento (art. 7º, I); antifraude = legítimo interesse (art. 7º, IX). |
| 3.3 | Política de Privacidade publicada em `/legal/privacidade` | Obrigatório | Pendente código + legal | Eng + Jurídico | Link já existe no footer como stub. |
| 3.4 | Canal do titular (art. 18) com prazo de resposta declarado | Obrigatório | Pendente código + legal | Ops + Eng | E-mail dedicado (ex.: `privacidade@leonardochiasso.com`) + runbook §10.1. |
| 3.5 | Encarregado (DPO) — pequeno porte pode ter regime simplificado (Resolução CD/ANPD nº 2/2022), mas **canal de comunicação é obrigatório** | Obrigatório (canal) / Recomendado (indicação formal) | Pendente legal humano | Jurídico | Não contratar DPO externo por reflexo. Confirmar enquadramento como agente de pequeno porte. |
| 3.6 | Consentimento de marketing separado da compra, com opt-in ativo, registro de data/IP e opt-out em todo e-mail | Obrigatório | Pendente código + legal | Eng + Jurídico | Newsletter atual não tem checkbox nem link de privacidade. Modelo do backend já prevê `lgpd_consent_at` / `marketing_consent_at`. Ver §9.5. |
| 3.7 | Política de retenção com prazos concretos | Obrigatório | Pendente legal humano | Jurídico + Eng | A validar: pedidos/fiscal ~5 anos (prescrição/guarda fiscal); newsletter até revogação; logs de acesso 6 meses (Marco Civil, art. 15); carrinho abandonado curto. |
| 3.8 | Lista de operadores/subprocessadores publicada e mantida | Obrigatório | Pendente código + legal | Eng + Jurídico | Previsto: Stripe (pagamento), hospedagem/VPS, Postgres gerenciado, storage S3-compatível + CDN, provedor de e-mail transacional, e-mail corporativo. Ver §8.4. |
| 3.9 | DPA / cláusulas de tratamento assinadas com cada operador | Obrigatório | Pendente legal humano | Jurídico | Stripe DPA e equivalentes de hospedagem normalmente são aceite eletrônico — **guardar evidência**. |
| 3.10 | Transferência internacional endereçada (maioria dos fornecedores é fora do Brasil) | Obrigatório | Pendente legal humano | Jurídico | LGPD arts. 33–35; a ANPD aprovou cláusulas-padrão contratuais (Resolução CD/ANPD nº 19/2024) com prazo de adequação de contratos. Verificar situação atual com jurídico. |
| 3.11 | Plano de resposta a incidente com prazo de comunicação à ANPD e aos titulares | Obrigatório | Pendente legal humano | Eng + Jurídico | Resolução CD/ANPD nº 15/2024 fixa prazo curto (dias úteis) para comunicar. Ter o runbook antes do incidente. |
| 3.12 | Minimização: não pedir CPF/telefone antes de existir necessidade fiscal ou logística | Obrigatório | Pendente código | Eng | Decidir no design do checkout, não depois. |
| 3.13 | Log de acesso de admin a PII de cliente | Recomendado | Pendente código | Eng | `audit_logs` já está no modelo do backend plan. |
| 3.14 | Sem PII em logs de aplicação e em ferramentas de erro | Obrigatório | Pendente código | Eng | Vale para o webhook do Stripe e e-mails transacionais. |

---

## 4. Páginas legais e cookies

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 4.1 | Rota `/legal/:page` registrada e lazy | Obrigatório | Pendente código | Eng | `PATH.legal` e `legalPath()` já existem; falta o bloco em `app.routes.ts`. Ver §8.2. |
| 4.2 | `/legal/termos` — Termos de Uso e Condições de Compra | Obrigatório | Pendente código + legal | Eng + Jurídico | Um documento só: uso do site + condições de venda. Não precisa de dois. |
| 4.3 | `/legal/privacidade` — Política de Privacidade | Obrigatório | Pendente código + legal | Eng + Jurídico | Ver §3.3. |
| 4.4 | `/legal/cookies` — Política de Cookies e Armazenamento Local | Obrigatório | Pendente código + legal | Eng + Jurídico | Deve listar `lc-cart` e `lc-wishlist` explicitamente (localStorage, estritamente necessários, sem expiração automática). |
| 4.5 | `/legal/trocas-devolucoes` — Política de Troca e Devolução | Obrigatório | Pendente código + legal | Eng + Jurídico | Separar em três blocos: arrependimento (7 dias, legal), troca por conveniência (política da casa, hoje 14 dias), defeito (CDC art. 26 — 30/90 dias). |
| 4.6 | `/legal/entrega` — Frete e Prazos | Recomendado | Pendente código + legal | Eng + Ops | Inclui prazo de produção de peça artesanal. |
| 4.7 | Ampliar a união de tipos de `legalPath()` para as páginas novas | Obrigatório (consistência) | Pendente código | Eng | Hoje: `'privacidade' \| 'termos' \| 'cookies'`. |
| 4.8 | Trocar os stubs `route: null` do footer por `legalPath(...)` | Obrigatório | Pendente código | Eng | `FOOTER_LINKS.legal` — o `TODO PR4` é este. |
| 4.9 | Banner/CMP de consentimento de cookies | **Só quando houver cookie não essencial** | Pendente código (condicional) | Eng | Hoje não há analytics nem pixel no código. Banner agora seria teatro. Gatilho: no PR que adicionar GA4 / Meta Pixel / chat de terceiro, o CMP entra no **mesmo** PR, com bloqueio antes do consentimento. |
| 4.10 | Data de "última atualização" + versionamento em cada página legal | Recomendado | Pendente código | Eng | Facilita provar qual versão o cliente aceitou. |
| 4.11 | Registro de aceite dos termos no checkout (versão + timestamp) | Recomendado | Pendente código | Eng | Fase 3. |

---

## 5. Fiscal

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 5.1 | Regime tributário definido (provável Simples Nacional; anexo depende de comércio vs indústria) | Obrigatório | Pendente legal humano | Contábil | Peça própria produzida no atelier pode cair em anexo diferente de revenda. |
| 5.2 | Emissão de **NF-e (modelo 55)** em toda venda com entrega ao consumidor | Obrigatório | Pendente código + legal | Contábil + Eng | E-commerce com transporte = NF-e, não NFC-e. |
| 5.3 | NFC-e (modelo 65) apenas se houver venda presencial no atelier | Obrigatório se houver | Pendente legal humano | Contábil | Não confundir com o fluxo online. |
| 5.4 | Certificado digital A1 e ambiente de emissão (ERP ou API de nota) | Obrigatório | Pendente legal humano | Contábil | Definir antes da Fase 3; emissão manual até dar volume é aceitável na escala boutique. |
| 5.5 | Coleta de CPF/CNPJ do comprador para a nota | Obrigatório | Pendente código | Eng | Coletar **no checkout**, com finalidade declarada (§3.12). |
| 5.6 | NCM correto por peça de vestuário de cânhamo | Obrigatório | Pendente legal humano | Contábil | Impacta imposto e importação do tecido (§2.15). |
| 5.7 | DIFAL / ICMS em venda interestadual a consumidor final não contribuinte | Obrigatório | Pendente legal humano | Contábil | EC 87/2015 + LC 190/2022; há entendimento consolidado de que empresas do Simples Nacional não recolhem DIFAL como remetentes. **Confirmar com o contador** antes de precificar frete nacional. |
| 5.8 | Nota + documento de transporte acompanhando a peça (Correios/transportadora) | Obrigatório | Pendente legal humano | Ops | Nunca despachar sem documento fiscal. |
| 5.9 | Guarda de documentos fiscais e XMLs pelo prazo legal | Obrigatório | Pendente código + legal | Contábil + Eng | Se o XML for guardado em storage próprio, tratar como asset privado com URL assinada (já previsto no backend plan). |
| 5.10 | Emissão fiscal disparada só após confirmação de pagamento pelo webhook | Recomendado | Pendente código | Eng | Evita nota de pedido que não pagou. |

---

## 6. Pagamentos (Stripe BR)

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 6.1 | Conta Stripe no CNPJ da empresa, dados bancários da PJ, aceite do contrato (Stripe Services Agreement + termos Brasil) | Obrigatório | Pendente legal humano | Ops + Jurídico | Conta em CPF do sócio para faturamento de PJ é problema fiscal e contratual. |
| 6.2 | Verificar restrições de categoria do Stripe para produtos associados a *cannabis/hemp* | Obrigatório | Pendente legal humano | Ops + Jurídico | Vestuário de fibra de cânhamo é distinto de produto CBD, mas a copy diz `Cannabis sativa`. Alinhar com o Stripe antes de escalar, para não tomar suspensão de conta no meio de campanha. |
| 6.3 | Stripe DPA aceito + lista de subprocessadores do Stripe referenciada na política | Obrigatório | Pendente legal humano | Jurídico | Cruza com §3.8/3.9. |
| 6.4 | Checkout hospedado (Stripe Checkout) para manter escopo PCI mínimo (SAQ A) | Recomendado (fortemente) | Pendente código | Eng | Já é a recomendação do backend plan §4. Não montar campos de cartão próprios. |
| 6.5 | Zero dado de cartão (PAN/CVV) em banco, log ou ferramenta de suporte | Obrigatório | Pendente código | Eng | Guardar só brand/last4/status/valor. |
| 6.6 | Webhook com verificação de assinatura + idempotência por `psp_event_id` | Obrigatório | Pendente código | Eng | Pagamento confirmado por webhook, nunca por redirect de browser. |
| 6.7 | Preço e estoque validados no servidor no momento da sessão de checkout | Obrigatório | Pendente código | Eng | Nunca confiar no preço do cliente. |
| 6.8 | Fluxo de estorno: arrependimento (integral, com frete) vs troca (política da casa) vs cancelamento por indisponibilidade | Obrigatório | Pendente código + legal | Eng + Jurídico | Estorno pela API do Stripe, espelhado em `orders`/`payment_events`. |
| 6.9 | Comunicação imediata à administradora do cartão para estorno no arrependimento | Obrigatório | Pendente código | Eng | Decreto 7.962/2013, art. 5º, §4º — na prática, refund via Stripe no mesmo dia útil. |
| 6.10 | Runbook de chargeback (prazo, evidências, quem responde) | Recomendado | Pendente legal humano | Ops | Ver §10.3. Peça de ticket alto (R$ 4.000) = chargeback dói. |
| 6.11 | Antifraude proporcional (Stripe Radar) com base legal de legítimo interesse declarada | Recomendado | Pendente código + legal | Eng + Jurídico | Ticket alto e volume baixo: revisão manual de pedido atípico é aceitável. |
| 6.12 | Pix e boleto: prazo de expiração e política de cancelamento automático declarados | Recomendado | Pendente código | Eng | Se habilitar esses métodos. |
| 6.13 | Chaves secretas fora do frontend (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` só no servidor) | Obrigatório | Pendente código | Eng | Backend plan §9 já define a superfície de env. |

---

## 7. Conteúdo obrigatório no site

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 7.1 | Razão social + CNPJ visíveis no footer de todas as páginas | Obrigatório | Pendente código + legal | Eng + Ops | Footer é global (fora do `router-outlet`, em `LcShell`) → resolve o site inteiro de uma vez. |
| 7.2 | Endereço físico completo (CEP incluído) | Obrigatório | Pendente código + legal | Eng + Ops | Se o atelier for endereço residencial, decidir com jurídico o que exibir — mas endereço físico é exigido. |
| 7.3 | Endereço eletrônico de atendimento (`atelier@leonardochiasso.com` ✔) | Obrigatório | Feito no código | — | Já no footer. |
| 7.4 | Bloco de links legais no footer funcional (Privacidade · Termos · Cookies · Trocas) | Obrigatório | Pendente código | Eng | Substituir os `route: null`. |
| 7.5 | Frete, prazo e política de devolução acessíveis da PDP | Obrigatório | Pendente código | Eng | A seção "Frete + devoluções" da PDP deve linkar `/legal/trocas-devolucoes` e `/legal/entrega`. |
| 7.6 | Preço em BRL, à vista, sem valor oculto | Obrigatório | Feito no código | — | `priceLabel` derivado de centavos; `R$ 4.000,00` exibido. |
| 7.7 | Telefone/WhatsApp de atendimento | Recomendado | Pendente código | Ops | Aumenta conversão em ticket alto. |
| 7.8 | Selo/aviso de conexão segura e checkout externo (Stripe) | Recomendado | Pendente código | Eng | Fase 3. |

---

## 8. Ops, infra e segurança

Sem duplicar o [Backend & Security Plan](./backend-security-plan.md) §5 — aqui só o que tem consequência legal direta.

| # | Item | Exigência | Status | Dono | Nota |
|---|------|-----------|--------|------|------|
| 8.1 | HTTPS/TLS em storefront, API e webhooks + HSTS | Obrigatório | Pendente código | Eng | Segurança de dado pessoal é dever legal (LGPD art. 46), não só boa prática. |
| 8.2 | Backup automatizado do Postgres + **teste de restauração** documentado | Obrigatório | Pendente código | Eng | Perder pedidos e notas é problema fiscal e de consumidor. Teste de restore vale mais que o backup. |
| 8.3 | Guarda de registros de acesso à aplicação por 6 meses | Obrigatório | Pendente código | Eng | Marco Civil, art. 15. Sem PII em claro além do necessário. |
| 8.4 | Lista de subprocessadores mantida como arquivo versionado, refletida na política | Obrigatório | Pendente código + legal | Eng + Jurídico | Sugestão: `docs/subprocessadores.md` como fonte da verdade, política referencia. Atualizar no mesmo PR que adiciona um fornecedor. |
| 8.5 | DPA arquivado por fornecedor (evidência de aceite, data, versão) | Obrigatório | Pendente legal humano | Jurídico | Um diretório compartilhado, não caixa de e-mail. |
| 8.6 | Segredos só em env/secret manager; nada de `.env` comitado | Obrigatório | Pendente código | Eng | Vazamento de chave Stripe = incidente comunicável. |
| 8.7 | Ambiente de staging com chaves de teste apenas, sem PII de produção | Obrigatório | Pendente código | Eng | Copiar dump de produção para staging é incidente LGPD esperando acontecer. |
| 8.8 | Processo de exclusão/anonimização de dados que sobrevive ao backup | Obrigatório | Pendente código | Eng | Pedido de exclusão do titular vs retenção fiscal: anonimizar o que não é obrigatório guardar. |
| 8.9 | Rate limit e CAPTCHA proporcional em newsletter e checkout | Recomendado | Pendente código | Eng | Evita spam de e-mail alheio na base — que é tratamento indevido. |

---

## 9. Snippets concretos (o que o PR de código deve conter)

### 9.1 Rota legal (`src/app/app.routes.ts`)

```ts
{
  path: PATH.legal,
  loadChildren: () => import('./pages/legal/legal.routes').then((m) => m.legalRoutes),
},
```

### 9.2 Ampliar `legalPath()` (`src/app/core/routes.ts`)

```ts
export type LegalPage =
  | 'privacidade'
  | 'termos'
  | 'cookies'
  | 'trocas-devolucoes'
  | 'entrega';

export function legalPath(page: LegalPage): string {
  return `/${PATH.legal}/${page}`;
}
```

### 9.3 Footer legal sem stubs (`src/app/core/nav.config.ts`)

```ts
legal: [
  { label: 'Privacidade', route: legalPath('privacidade') },
  { label: 'Termos', route: legalPath('termos') },
  { label: 'Cookies', route: legalPath('cookies') },
  { label: 'Trocas e devoluções', route: legalPath('trocas-devolucoes') },
] as NavLink[],
```

E no `footer.ts`, junto do `footer__copy`, o bloco de identificação (texto exato pendente de validação):

```html
<p class="footer__legal">
  {{ RAZAO_SOCIAL }} · CNPJ {{ CNPJ }}<br />
  {{ ENDERECO }} · <a href="mailto:atelier@leonardochiasso.com">atelier@leonardochiasso.com</a>
</p>
```

Centralizar esses valores em `src/app/core/company.ts` (uma fonte da verdade, como já é feito com `routes.ts`) para não espalhar CNPJ por templates.

### 9.4 Copy de frete/devolução — corrigir nos dois arquivos

Atual (8 produtos em `src/app/core/products.ts` **e** 8 em `api/prisma/seed.ts`):

```
Frete calculado no checkout. Devoluções em até 14 dias para peças sem uso.
```

Problema: a condição "sem uso" e o prazo de 14 dias, colados assim, podem ser lidos como restrição ao direito de arrependimento — que é de 7 dias e **não** admite essa condição. Separar os dois direitos (texto final a validar):

```
Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o
recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso
e com etiqueta. Detalhes em Trocas e devoluções.
```

O campo `shipping` do modelo aguenta esse texto, mas o ideal é `shipping` ficar só com frete/prazo e a PDP linkar a página legal — evita repetir política em 8 registros e no seed.

### 9.5 Newsletter com consentimento (`newsletter.ts`)

Antes de conectar em qualquer backend, o formulário precisa de: checkbox de opt-in não pré-marcado, finalidade declarada, link para `/legal/privacidade` e registro de `marketing_consent_at` no servidor. Enquanto for `done = true` local, não há tratamento — e é justamente a janela boa para implementar direito.

---

## 10. Runbooks mínimos

### 10.1 Pedido de titular (LGPD art. 18)

1. Chega em `privacidade@leonardochiasso.com` → registrar data/hora e protocolo.
2. Confirmar identidade sem coletar documento novo além do necessário.
3. Levantar dados nas fontes: Postgres (`customers`, `orders`), Stripe, provedor de e-mail, storage.
4. Responder dentro do prazo legal; se for exclusão, informar o que deve ser retido por obrigação fiscal e por quanto tempo.
5. Registrar desfecho — a evidência de atendimento é a defesa.

### 10.2 Arrependimento (7 dias)

1. Cliente comunica por qualquer canal (não exigir formulário específico).
2. Confirmar em 1 dia útil, enviar etiqueta de retorno **por conta da loja**.
3. Estorno integral (produto + frete pago) via Stripe assim que o retorno for postado — não esperar chegar ao atelier para iniciar.
4. Registrar em `payment_events` + `audit_logs`; cancelar/estornar a nota fiscal com o contador.

### 10.3 Chargeback

1. Alerta do Stripe → responder dentro do prazo da disputa.
2. Juntar evidências: NF-e, rastreio com entrega comprovada, IP/e-mail do pedido, aceite dos termos (versão + timestamp).
3. Se perder, registrar como perda e avaliar antifraude — sem reter dado extra de cliente por reflexo.

### 10.4 Incidente de segurança

1. Conter e preservar evidência; não apagar log.
2. Avaliar risco a titulares (que dado, quantos, foi cifrado?).
3. Comunicar ANPD e titulares no prazo da regulamentação vigente — acionar jurídico no dia 1, não na semana 2.
4. Post-mortem versionado no repositório.

---

## 11. Sequenciamento sugerido

| Fase | Entregas legais | Por que agora |
|------|-----------------|---------------|
| **A — Vitrine (imediato, sem checkout)** | 1.1–1.5 · 2.1 · 2.2 (copy) · 2.14–2.15 · 4.1–4.5 · 4.7–4.8 · 7.1–7.5 · 8.1 | Barato, remove os bloqueadores visíveis, não depende de backend. |
| **B — Junto da Fase 2 do backend (admin/CMS)** | 3.1–3.5 · 3.7–3.8 · 3.13 · 8.2–8.7 | A partir daqui existe PII de verdade no banco. |
| **C — Junto da Fase 3 (checkout/pagamentos)** | 2.3–2.10 · 5.1–5.10 · 6.1–6.13 · 3.6 · 3.11–3.12 · 4.11 · 7.8 | Escopo obrigatório explode quando dinheiro entra. |
| **D — Contínuo** | 3.9–3.10 · 4.9–4.10 · 8.4–8.5 · 8.8–8.9 · runbooks §10 | Revisar a cada fornecedor novo e a cada campanha. |

---

## 12. Portão de go-live (não vender sem isto)

- [ ] CNPJ, razão social, endereço e e-mail exibidos no footer de todas as páginas
- [ ] `/legal/privacidade`, `/legal/termos`, `/legal/cookies` e `/legal/trocas-devolucoes` no ar, com texto validado por jurídico
- [ ] Links legais do footer funcionais (nenhum `route: null` em `FOOTER_LINKS.legal`)
- [ ] Copy de devolução corrigida nos **dois** arquivos (`products.ts` e `seed.ts`), separando arrependimento de troca
- [ ] Frete e prazo informados antes da finalização
- [ ] Canal do titular LGPD ativo com prazo de resposta declarado
- [ ] NF-e emitível (certificado, IE, regime definidos)
- [ ] Stripe no CNPJ, DPA aceito, webhook com assinatura verificada e idempotente
- [ ] HTTPS + backup com restore testado
- [ ] Documentação de origem do tecido de cânhamo arquivada e parecer jurídico sobre a comunicação da linha HempCouture

---

*Revisar este checklist a cada mudança de fornecedor, novo meio de pagamento, nova coleção com claim novo, ou mudança regulatória. Reafirmando o topo: isto organiza o trabalho, não substitui advogado(a) nem contador(a).*
