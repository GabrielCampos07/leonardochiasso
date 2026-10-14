# Ambiente de staging

| Peça | Staging | Prod |
|---|---|---|
| Front | staging.leonardochiasso.com (Hostinger, workflow `deploy-hostinger-staging.yml`, env `FTP_STAGING`) | leonardochiasso.com |
| API | api-staging.leonardochiasso.com → container `api-staging` (projeto `leo-staging`) | api.leonardochiasso.com |
| Banco | branch Neon `staging` | branch principal |
| Deploy | push em `staging` | push em `main` |

## Setup único no servidor (Hetzner 188.245.217.205)

1. DNS: registro A `api-staging` → `188.245.217.205` (hPanel Hostinger).
2. Clone separado da prod:
   ```sh
   git clone <repo> /opt/leo-chiasso-staging
   cd /opt/leo-chiasso-staging && git checkout staging
   ```
3. Criar `api/.env.staging` (nunca commitar), com os mesmos nomes de `api/.env.production.example`:
   - `DATABASE_URL` (pooler do branch Neon `staging`), `DIRECT_URL` (direct do mesmo branch)
   - `CORS_ORIGINS=https://staging.leonardochiasso.com`, `STOREFRONT_URL=https://staging.leonardochiasso.com`
   - `SESSION_SECRET` (novo, diferente da prod), `SESSION_COOKIE_NAME` (ex.: `lc_session_stg`)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (de staging)
   - `PUBLIC_ASSET_BASE`, `CDN_BASE_URL`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION` (de preferência bucket R2 de staging)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (somente chaves de teste)
   - `ENABLE_DEV_LOGIN` vazio/desligado
4. Rede: o container entra na rede do compose da prod (`api_default`). Confirme com
   `docker network ls`; se o nome for outro, exporte `PROD_CADDY_NETWORK=<nome>`.
5. Subir: `cd api && docker compose -f docker-compose.staging.yml up -d --build`.
6. Caddy: o bloco `api-staging` só existe na prod depois que o Caddyfile chegar à `main`.
   Como o arquivo é bind-mount, recarregue a prod uma vez:
   `cd /opt/leo-chiasso/api && docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile`.

## Segurança do Caddyfile antes do DNS

Sem o registro A, o Caddy falha só a emissão do certificado de `api-staging` e tenta de novo com backoff;
`api.leonardochiasso.com` continua servindo normalmente. Sem o container, o site de staging responde 502.
Um erro de sintaxe derrubaria tudo: valide antes com
`docker compose -f docker-compose.prod.yml exec caddy caddy validate --config /etc/caddy/Caddyfile`.

## Workflows

Os workflows estão em `docs/staging-workflows/` porque o token do agente não tem o escopo `workflow`.
Para ativar: `git mv docs/staging-workflows/*.yml .github/workflows/` (Gabriel, ou um token com escopo `workflow`).
