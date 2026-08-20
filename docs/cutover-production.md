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

Campos principais: `DATABASE_URL`, `NODE_ENV=production`, `CORS_ORIGINS`, `SESSION_SECRET`, `ADMIN_*`, `CDN_BASE_URL`, `STORAGE_*`.

### 4. Subir API + Caddy

No servidor, na pasta `api/`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl -sS https://api.leonardochiasso.com/api/health
```

Esperado: `{"ok":true,...}`.

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

**Vídeos grandes manualmente no R2** (ex.: `organic-dreams-desfile.MOV` fora do Git):

1. Cloudflare R2 → bucket → Upload
2. Key: `video/{caminho}` igual ao repo, ex. `video/alta-costura/organic-dreams-desfile.MOV`
3. URL pública: `{CDN_BASE_URL}/video/alta-costura/organic-dreams-desfile.MOV`
4. `npm run migrate:content-urls` — atualiza joias, arte, lookbooks, desfiles no Neon

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
