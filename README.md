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
| `FTP_SERVER` | **FTP IP** (IP numérico) em Websites → Dashboard → **FTP Accounts**. **Não** use `ftp.leonardochiasso.com` — esse subdomínio não existe no DNS. |
| `FTP_USERNAME` | Username na mesma tela FTP Accounts |
| `FTP_PASSWORD` | Senha da conta FTP |
| `FTP_REMOTE_DIR` | Pasta de upload (ex.: `/public_html` ou `/domains/leonardochiasso.com/public_html`) |

Antes do deploy, ative **SFTP/SSH** em hPanel → Websites → Dashboard → **Remote access** (porta **65002**).

O workflow usa `environment: FTP_SERVER` e envia via **SFTP** (não FTP na porta 21).

Disparo manual: **Actions** → **Deploy frontend to Hostinger** → **Run workflow**.

### Manual

1. `npm run build -- --configuration=production`
2. Copie `public/.htaccess` para `dist/leo-chiasso/browser/.htaccess` (SPA rewrite)
3. Envie o conteúdo de `dist/leo-chiasso/browser/` para `public_html`
4. Ative SSL no domínio

O `.htaccess` garante deep links (`/joias`, `/colecao/...`, etc.).

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

Vídeos de desfile/arte/joias entram via **Git LFS** (`*.mp4` / `*.mov`).

Exceção (só máquina local / Hostinger, fora do Git por tamanho ~1,9 GB):

- `src/assets/media/alta-costura/organic-dreams-desfile.MOV`

Mantenha esse arquivo no deploy Hostinger junto com o build.

## Licença / uso

Código e assets da marca Leonardo Chiasso — uso interno / privado do projeto. Não redistribuir sem autorização.
