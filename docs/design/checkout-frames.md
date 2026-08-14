# Checkout — frames de design (Leonardo Chiasso)

> Spec visual para os 3 passos. Figma MCP não estava conectado no momento da implementação; este documento é a fonte de layout para recriar no Figma (`fileKey` do projeto LC quando disponível).

**Tokens:** void `#0E0C0E`, ash cinza texto secundário, white fundo, inputs underline (sem card), display uppercase letter-spacing amplo, body leve.

**Layout desktop (1440):** coluna esquerda form (~560px) + coluna direita resumo da sacola (~360px). Stepper no topo: `1 Dados — 2 Endereço — 3 Pagamento` com passo ativo em void e demais em ash.

---

## Frame 1 · Dados (`Checkout / 01 Dados`)

- Breadcrumb: Home / Checkout
- Título: `CHECKOUT`
- Stepper: **1 Dados** ativo
- Campos (underline): Nome, E-mail, CPF, Telefone
- CTA: `CONTINUAR` (void fill)
- Lateral: lista itens + subtotal

## Frame 2 · Endereço (`Checkout / 02 Endereço`)

- Stepper: **2 Endereço** ativo
- Radio: `Usar endereço cadastrado` | `Novo endereço`
- Se cadastrado: lista de cards mínimos (rua, cidade/UF) + default marcado
- Se novo: CEP, Rua, Número, Complemento, Bairro, Cidade, UF
- CTA: `CONTINUAR` / link `Voltar`
- Lateral: resumo sacola

## Frame 3 · Pagamento (`Checkout / 03 Pagamento`)

- Stepper: **3 Pagamento** ativo
- Bloco revisão: dados + endereço + itens + total
- CTA principal: `PAGAR COM CARTÃO` (void)
- Caption: `Pagamento seguro via Stripe. Você será redirecionado.`
- Sem campos de cartão na loja

## Mobile

Stack único: stepper → form → resumo colapsável → CTA sticky bottom.
