# Leonardo Chiasso

Storefront da marca **Leonardo Chiasso Labels** — luxo sustentável em hemp & silk, com linhas **Donna**, **Uomo**, **ArtCouture**, **Gioielli**, **Arte** e **Casa**.

Repositório privado do site (Angular) + API de catálogo (Nest/Prisma). Deploy típico em Hostinger (SPA estática) enquanto o backend evolui.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Storefront | Angular 20 (standalone components) |
| Estilos | SCSS + design tokens (`void` / `white` / `ash`) |
| API | NestJS + Prisma + Postgres (`api/`) |
| Pagamentos | Stripe Checkout (scaffold na API) |
| Admin | Área local `/admin` (produtos + joias em `localStorage`) |

Design reference: [Figma — leo-chiasso](https://www.figma.com/design/L85Svx7vIfwR6Y7SPz3Ch5).  
Design system: [`00-design-system.md`](./00-design-system.md).

## Coleções e seções

- **Organic / Niponic / Brazilian Dreams** — lookbooks, desfiles e RTW
- **ArtCouture** — alta costura / sob medida (`/alta-costura`)
- **Gioielli** — joias (`/joias` + admin `/admin/joias`)
- **Arte** — galeria editorial (`/arte`)
- **Donna / Uomo** — hubs feminino / masculino (home `?categoria=` + `#colecoes`)

## Desenvolvimento

### Storefront

```bash
npm install
npm start          # http://localhost:4200
npm run build      # saída em dist/leo-chiasso/browser
```

Sem a API, o catálogo usa o fallback local em `src/app/core/products.ts`.

### API + Postgres (`api/`)

```bash
cd api
cp .env.example .env
docker compose up -d          # Postgres (porta 5433)
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev             # http://localhost:3000
```

Na raiz do monorepo:

```bash
npm run api:up
npm run api:dev
```

Documentação dos endpoints: [`api/README.md`](./api/README.md).

### Admin (ateliê)

**Guia para quem edita o site (linguagem simples):** [`docs/guia-area-do-atelie.md`](./docs/guia-area-do-atelie.md)

Em produção: acesse **https://leonardochiasso.com/admin** com e-mail e senha de ateliê.  
Painel para produtos e coleções; no site use a barra **Modo edição** para textos e fotos (joias e arte: editar nas páginas `/joias` e `/arte`).

Desenvolvimento local:

1. Defina senha em `src/environments/environment*.ts` (`adminPassword`)
2. Acesse `/admin`
3. **Produtos** — moda RTW  
4. **Joias** — coleção Gioielli  

Alterações do admin ficam no navegador (`localStorage`) até existir backend de CMS.

## Deploy Hostinger (front)

### Automático (GitHub Actions)

Push na branch `main` dispara [`.github/workflows/deploy-hostinger.yml`](./.github/workflows/deploy-hostinger.yml).

Secrets no **Environment `FTP_SERVER`** (Settings → Environments → **FTP_SERVER** → Environment secrets):

| Secret | Onde achar no hPanel |
|--------|----------------------|
| `FTP_SERVER` | IP numérico do FTP (ex. `45.152.46.216`). **Não** use `ftp.leonardochiasso.com` (resolve para o site, porta 21 dá timeout). Sem `ftp://`. |
| `FTP_USERNAME` | Conta do **domínio** (ex. `u463440555.Gabriel`), não só `u463440555` |
| `FTP_PASSWORD` | Senha **dessa** conta |

Essa conta já entra em `domains/leonardochiasso.com/public_html`. O workflow envia para **`./`**.

O workflow usa `environment: FTP_SERVER` e envia via **FTP porta 21** (conta FTP do hPanel).


Disparo manual: **Actions** → **Deploy frontend to Hostinger** → **Run workflow**.

### Manual

1. `npm run build -- --configuration=production`
2. Copie `public/.htaccess` para `dist/leo-chiasso/browser/.htaccess` (SPA rewrite)
3. Envie o conteúdo de `dist/leo-chiasso/browser/` para `public_html`
4. Ative SSL no domínio

O `.htaccess` garante deep links (`/joias`, `/colecao/...`, etc.).

**Build prod (~8 MB):** fotos e vídeos **não** entram no bundle — só SVGs de UI. Mídia vem do CDN (R2) via API.

### CDN (R2)

```bash
cd api
npm run migrate:assets        # upload imagens + vídeos locais + Neon
npm run migrate:content-urls    # só reescreve URLs no Neon (sem upload)
```

Se joias/arte/lookbooks estiverem vazios na API, rode antes `npm run prisma:seed`.

Vídeos no R2: key `video/{caminho}`, depois `npm run migrate:content-urls`.

## Deploy API (Hetzner)

### Automático (GitHub Actions)

Push na `main` com mudanças em `api/**` dispara [`.github/workflows/deploy-api-hetzner.yml`](./.github/workflows/deploy-api-hetzner.yml).

Disparo manual: **Actions** → **Deploy API to Hetzner** → **Run workflow**.

#### Setup único no servidor (Hetzner)

```bash
# Chave de deploy (GitHub → Settings → Deploy keys → read-only)
ssh-keygen -t ed25519 -C "hetzner-leo-chiasso" -f ~/.ssh/leo-chiasso-deploy -N ""
cat ~/.ssh/leo-chiasso-deploy.pub   # adicionar no GitHub

ssh root@188.245.217.205
git clone git@github.com:GabrielCampos07/leonardochiasso.git /opt/leo-chiasso
cd /opt/leo-chiasso/api
cp .env.production.example .env && nano .env
docker compose -f docker-compose.prod.yml up -d --build
```

Detalhes de DNS, firewall e `.env`: [`docs/cutover-production.md`](./docs/cutover-production.md).

#### Secrets no GitHub

Environment **`HETZNER_API`** (Settings → Environments → **HETZNER_API** → Environment secrets):

| Secret | Valor |
|--------|--------|
| `SSH_HOST` | IP do Hetzner (ex. `188.245.217.205`) |
| `SSH_USER` | `root` (ou usuário com Docker) |
| `SSH_PRIVATE_KEY` | chave **privada** usada pelo Actions para SSH (par da chave em `authorized_keys` no servidor) |
| `DEPLOY_PATH` | `/opt/leo-chiasso` (pasta do clone) |
| `API_HEALTH_URL` | opcional — default `https://api.leonardochiasso.com/api/health` |

**Importante:** a chave em `SSH_PRIVATE_KEY` (GitHub) é a que o **Actions** usa para entrar no servidor. A chave de **deploy key** (no servidor, para `git pull`) é outra — read-only no repositório.

No Hetzner, autorize a chave pública do Actions:

```bash
echo "CHAVE_PUBLICA_DO_ACTIONS" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Manual

```bash
ssh root@188.245.217.205
cd /opt/leo-chiasso && git pull origin main
cd api && docker compose -f docker-compose.prod.yml up -d --build
curl -sS https://api.leonardochiasso.com/api/health
```

## Estrutura (visão rápida)

```
src/app/
  core/           # products, joias, rotas, nav, catalog, admin overlays
  pages/          # landing, plp, pdp, joias, arte, alta-costura, admin, checkout…
  shared/         # header, footer, cards, chrome
  layout/         # shell
api/              # Nest + Prisma + Stripe scaffold
public/           # .htaccess e estáticos copiados no build
docs/             # checklists e backlog
```

## Contatos da marca (site)

Configurados no footer / atendimento:

- `Contact@leonardochiasso.com`
- `ArtCouture@leonardochiasso.com`
- `Uomo@leonardochiasso.com`
- `Donna@leonardochiasso.com`
- `Arte@leonardochiasso.com`

(As caixas de e-mail precisam ser criadas no provedor DNS/hospedagem.)

## Docs úteis

- [`docs/legal-production-checklist.md`](./docs/legal-production-checklist.md)
- [`docs/feature-gap-backlog.md`](./docs/feature-gap-backlog.md)
- [`api/README.md`](./api/README.md)

## Assets de mídia grandes

Vídeos de desfile/arte/joias entram via **Git LFS** (`*.mp4` / `*.mov`) ou ficam só no **CDN (R2)**.

Masters locais (fora do Git):

- `src/assets/media/alta-costura/organic-dreams-desfile.MOV` (HEVC master)
- `src/assets/media/alta-costura/organic-dreams-desfile.mp4` (H.264 para o site → R2 `video/alta-costura/…`)

## Licença / uso

Código e assets da marca Leonardo Chiasso — uso interno / privado do projeto. Não redistribuir sem autorização.
