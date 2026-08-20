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

O workflow envia para `./` (raiz do login FTP = pasta do site). **Não** use `public_html` no secret — isso gerava `//assets/...` e o Action tentava apagar pastas antigas.

`assets/brand` e `assets/media` no servidor **não** são apagados no deploy.

O workflow usa `environment: FTP_SERVER` e envia via **FTP porta 21** (conta FTP do hPanel).

Disparo manual: **Actions** → **Deploy frontend to Hostinger** → **Run workflow**.

### Manual

1. `npm run build -- --configuration=production`
2. Copie `public/.htaccess` para `dist/leo-chiasso/browser/.htaccess` (SPA rewrite)
3. Envie o conteúdo de `dist/leo-chiasso/browser/` para `public_html`
4. Ative SSL no domínio

O `.htaccess` garante deep links (`/joias`, `/colecao/...`, etc.).

**Build prod (~8 MB):** fotos e vídeos **não** entram no bundle — só SVGs de UI. Mídia vem do CDN (R2) via API.

Exceção Hostinger (fora do Git, ~2 GB): `assets/media/alta-costura/organic-dreams-desfile.MOV`. O deploy **não apaga** arquivos remotos (`deleteRemoteFiles: false`) — deixe esse MOV no `public_html`. Se faltar, envie **uma vez** pelo File Manager / SFTP.

### CDN (R2)

```bash
cd api
npm run migrate:assets        # upload imagens + vídeos locais + Neon
npm run migrate:content-urls    # só reescreve URLs no Neon (sem upload)
```

Se joias/arte/lookbooks estiverem vazios na API, rode antes `npm run prisma:seed`.

**Outros vídeos no R2** (não o MOV de 2 GB): key `video/{caminho}`, depois `npm run migrate:content-urls`.

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

Exceção (só Hostinger / máquina local, fora do Git ~2 GB):

- `src/assets/media/alta-costura/organic-dreams-desfile.MOV` → `public_html/assets/media/alta-costura/organic-dreams-desfile.MOV`

Não sobe no CI. Não vai para o R2. Não apague essa pasta no File Manager.

## Licença / uso

Código e assets da marca Leonardo Chiasso — uso interno / privado do projeto. Não redistribuir sem autorização.
