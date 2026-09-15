# Production cutover — Admin inline + API + CDN

## Situação atual (Hetzner)

- **Site:** `https://leonardochiasso.com` (Hostinger). CSP `upgrade-insecure-requests` — **não** pode chamar API em `http://`.
- **Servidor API:** `188.245.217.205` (SSH 22 aberto; **80 / 443 / 3000 fechados** da internet).
- **Banco:** Neon (`DATABASE_URL` no `.env`).
- **Frontend prod:** `apiBaseUrl = https://api.leonardochiasso.com`.

HTTP em `http://188.245.217.205:3000` **não funciona** com o site em HTTPS.

## No Hetzner (SSH) — deixar a API pública com HTTPS

### 1. DNS (obrigatório para o certificado)

No registrador do domínio, registro **A**:

```text
api.leonardochiasso.com  →  188.245.217.205
```

Espere o DNS propagar (`dig +short api.leonardochiasso.com` deve mostrar o IP).

### 2. Firewall (console.hetzner.com)

No servidor → **Firewalls** → inbound IPv4:

| Porta | Protocolo |
|-------|-----------|
| 22 | TCP (SSH) |
| 80 | TCP (Let's Encrypt + redirect) |
| 443 | TCP (HTTPS) |

Não precisa expor 3000. Se usar `ufw` no Ubuntu:

```bash
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

### 3. `.env` no servidor (`api/.env`)

Modelo completo: **`api/.env.production.example`**

```bash
cd /root/api   # ou onde está o projeto
cp .env.production.example .env
nano .env      # Neon, R2, SESSION_SECRET, ADMIN_PASSWORD
```

Campos principais: `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV=production`, `CORS_ORIGINS`, `SESSION_SECRET`, `ADMIN_*`, `CDN_BASE_URL`, `STORAGE_*`.

**Neon + Prisma** — use o host **pooler** (`-pooler` no hostname) na API e o host **direct** (sem `-pooler`) em `DIRECT_URL` (migrations). Parâmetros obrigatórios no pooler:

```text
?sslmode=require&pgbouncer=true&connect_timeout=15&pool_timeout=30
```

Não use `channel_binding=require`. Para corrigir um `.env` existente no servidor:

```bash
cd api && python3 scripts/patch-neon-env.py
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Subir API + Caddy

No servidor, na pasta `api/`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl -sS https://api.leonardochiasso.com/api/health
```

Esperado: `{"ok":true,...}`.

### 5. Deploy automático (GitHub Actions)

Workflow: [`.github/workflows/deploy-api-hetzner.yml`](../.github/workflows/deploy-api-hetzner.yml).

**No servidor (uma vez):**

```bash
git clone git@github.com:GabrielCampos07/leonardochiasso.git /opt/leo-chiasso
# Deploy key read-only no GitHub (Settings → Deploy keys) com a pubkey do servidor
```

**No GitHub (Environment `HETZNER_API`):** `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `DEPLOY_PATH` (`/opt/leo-chiasso`).

Push em `main` que altere `api/**` → SSH no Hetzner → `git pull` → `docker compose up -d --build` → health check.

Ver README secção **Deploy API (Hetzner)** para chaves SSH (Actions vs deploy key).

Seed (uma vez, se o Neon ainda estiver vazio) — na sua máquina com o mesmo `DATABASE_URL`:

```bash
cd api && npm run prisma:seed
```

## Hostinger — publicar o Angular

```bash
npm run build
```

Enviar o conteúdo de `dist/leo-chiasso/browser` para o public_html. **Build prod não inclui fotos/vídeos** — só SVGs de UI; mídia vem do CDN (R2).

### CDN — imagens e vídeos

```bash
cd api
npm run migrate:assets        # upload imagens + vídeos locais + atualiza Neon
npm run migrate:content-urls  # só reescreve URLs no Neon (sem upload)
```

Vídeos: key `video/{caminho}` no R2, depois `migrate:content-urls`.

Convenção de keys:

| Tipo | Key no bucket | Exemplo URL |
|------|---------------|-------------|
| Imagem | `pdp/{path}.webp` (+ thumb/card/zoom) | `…/pdp/plp-calca-thumb.webp` |
| Vídeo | `video/{path}` (original) | `…/video/joias/joias-intro.mp4` |

## Admin

1. `https://leonardochiasso.com/admin`
2. Login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. Editar o site; PATCH vai para `https://api.leonardochiasso.com`

## Rollback

Set `demoMode: true` e `apiBaseUrl: ''` em hotfix se a API cair.
