import { MediaRole, PrismaClient, ProductStatus } from '@prisma/client';

/**
 * Seed from current Angular `src/app/core/products.ts`.
 * Prices in products.ts are whole BRL (e.g. 4000 → R$ 4.000,00) → store as centavos.
 * Media URLs stay as SPA-relative asset paths until S3/CDN (Phase 2).
 */

const prisma = new PrismaClient();

const PUBLIC_ASSET_BASE = (process.env.PUBLIC_ASSET_BASE ?? '').replace(/\/$/, '');

function assetUrl(path: string): string {
  if (!PUBLIC_ASSET_BASE) return path;
  return `${PUBLIC_ASSET_BASE}/${path.replace(/^\//, '')}`;
}

const COLLECTIONS = [
  {
    slug: 'organic-dreams',
    name: 'Organic Dreams',
    description: 'Peças seasonless em cânhamo — linha HempCouture.',
    sortOrder: 1,
  },
  {
    slug: 'niponic-dreams',
    name: 'Niponic Dreams',
    description: 'Coleção em desenvolvimento.',
    sortOrder: 2,
  },
  {
    slug: 'brazilian-dreams',
    name: 'Brazilian Dreams',
    description: 'Coleção em desenvolvimento.',
    sortOrder: 3,
  },
] as const;

type SeedProduct = {
  slug: string;
  name: string;
  priceReais: number;
  color: string;
  size: string;
  fabric: string;
  season: string;
  description: string;
  details: string[];
  shipping: string;
  thumb: string;
  gallery: string[];
  collectionSlug: string;
  categorySlug: 'feminino' | 'masculino';
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: 'calca-pantalona-rasgo',
    name: 'Pantalona Rasgo',
    priceReais: 4000,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Calça pantalona em cambraia de cânhamo com rasgo estrutural. Silhueta ampla, queda arquitetônica e presença quieta — peça única da linha HempCouture.',
    details: [
      'Cambraia 185 g/m² · 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · made to feel, not to rush',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-calca-thumb.png',
    gallery: [
      'assets/media/pdp-calca-01.png',
      'assets/media/pdp-calca-02.png',
      'assets/media/pdp-calca-03.png',
      'assets/media/pdp-calca-04.png',
      'assets/media/pdp-calca-05.png',
      'assets/media/pdp-calca-06.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-bateau',
    name: 'Vestido Lg Bateau',
    priceReais: 6800,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Vestido longo bateau em canvas de cânhamo. Decote arquitetônico, costas abertas com detalhe etéreo e silhueta column — peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Vestido longo Bateau',
      'Canvas 380 g/m² · 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-bateau-thumb.png',
    gallery: [
      'assets/media/pdp-bateau-01.png',
      'assets/media/pdp-bateau-02.png',
      'assets/media/pdp-bateau-03.png',
      'assets/media/pdp-bateau-04.png',
      'assets/media/pdp-bateau-05.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-assimetrico-rasgo',
    name: 'Vestido Lg Assimétrico',
    priceReais: 7200,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Vestido assimétrico em canvas de cânhamo com rasgo estrutural. Silhueta escultural, costas abertas e detalhe etéreo — peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Vestido Assimétrico rasgo',
      'Canvas 380 g/m² · 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-assimetrico-thumb.png',
    gallery: [
      'assets/media/pdp-assimetrico-01.png',
      'assets/media/pdp-assimetrico-02.png',
      'assets/media/pdp-assimetrico-03.png',
      'assets/media/pdp-assimetrico-04.png',
      'assets/media/pdp-assimetrico-05.png',
      'assets/media/pdp-assimetrico-06.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-mosaico-textil',
    name: 'Vestido Lg Mosaic Têxtil',
    priceReais: 9800,
    color: 'Mosaico',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda e reciclada do atelier',
    season: 'Seasonless',
    description:
      'Vestido longo tomara-que-caia em mosaico têxtil — fragmentos de organza de seda e peças recicladas do atelier, sobrepostos em silhueta column. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Vestido longo em Mosaico Têxtil',
      'Organza 100% seda e reciclada do atelier',
      'Cor Mosaico · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-mosaico-thumb.png',
    gallery: [
      'assets/media/pdp-mosaico-01.png',
      'assets/media/pdp-mosaico-02.png',
      'assets/media/pdp-mosaico-03.png',
      'assets/media/pdp-mosaico-04.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'jaqueta-mosaico-textil',
    name: 'Jaqueta Mosaico Têxtil',
    priceReais: 7200,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda — patches em organza recicladas do atelier',
    season: 'Seasonless',
    description:
      'Jaqueta em mosaico têxtil — técnica autoral com patches de organza de seda e recicladas do atelier, sobrepostos em volume etéreo. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Jaqueta em mosaico têxtil (técnica autoral)',
      'Organza 100% seda — patches em organza recicladas do atelier',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-jaqueta-mosaico-thumb.png',
    gallery: [
      'assets/media/pdp-jaqueta-mosaico-01.png',
      'assets/media/pdp-jaqueta-mosaico-02.png',
      'assets/media/pdp-jaqueta-mosaico-03.png',
      'assets/media/pdp-jaqueta-mosaico-04.png',
      'assets/media/pdp-jaqueta-mosaico-05.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'top-mosaico-textil',
    name: 'Top Mosaico Têxtil',
    priceReais: 5800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda — patches de organzas recicladas do atelier',
    season: 'Seasonless',
    description:
      'Top em mosaico têxtil — técnica autoral com organza 100% seda e patches de organzas recicladas do atelier, sobrepostos em volume etéreo. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Top em Mosaico têxtil (técnica autoral)',
      'Organza 100% seda — patches de organzas recicladas do atelier',
      'Cor única · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-top-mosaico-textil-thumb.png',
    gallery: [
      'assets/media/pdp-top-mosaico-textil-01.png',
      'assets/media/pdp-top-mosaico-textil-02.png',
      'assets/media/pdp-top-mosaico-textil-03.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'camisa-mosaico-textil-calca-pantalona',
    name: 'Camisa Mosaico Têxtil',
    priceReais: 11200,
    color: 'Única · Black / Off-white',
    size: 'ÚNICO',
    fabric:
      'Camisa: organza 100% seda reciclada do atelier · Calça: cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Camisa em mosaico têxtil em organza 100% seda reciclada do atelier, com calça pantalona em cambraia 100% cânhamo. Cor do mosaico única; calça em Black ou Off-white. Look Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Camisa mosaico têxtil + calça pantalona',
      'Camisa em mosaico têxtil · organza 100% seda reciclada do atelier',
      'Calça pantalona · cambraia 100% cânhamo',
      'Cores mosaico: única',
      'Calça: Black / Off-white',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-camisa-mosaico-pantalona-thumb.png',
    gallery: [
      'assets/media/pdp-camisa-mosaico-pantalona-01.png',
      'assets/media/pdp-camisa-mosaico-pantalona-02.png',
      'assets/media/pdp-camisa-mosaico-pantalona-03.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'shorts-degrau',
    name: 'Shorts Degrau',
    priceReais: 2800,
    color: 'Off-white / Black',
    size: 'ÚNICO',
    fabric: 'Cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Shorts degrau em cambraia de cânhamo — cintura arquitetônica em degrau, perna ampla e presença quieta. Disponível em Off-white ou Black. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Shorts degrau',
      'Cambraia 100% cânhamo industrial (Cannabis sativa)',
      'Cores Off-white ou Black · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · made to feel, not to rush',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-shorts-degrau-thumb.png',
    gallery: [
      'assets/media/pdp-shorts-degrau-01.png',
      'assets/media/pdp-shorts-degrau-02.png',
      'assets/media/pdp-shorts-degrau-03.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'organic-vestido-sfilaciatta-plumaria',
    name: 'Vestido sfilaciatta plumaria',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Organza e georgette 100% seda',
    season: 'Seasonless',
    description:
      'Vestido nude/black em organza e georgette 100% seda, sfilaciatta (técnica autoral do atelier) com efeito plumaria indígena brasileiro. Cores sob encomenda — ArtCouture. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Vestido sfilaciatta plumaria · ArtCouture',
      'Vestido · organza e georgette 100% seda',
      'Sfilaciatta (técnica autoral) · efeito plumaria indígena brasileiro',
      'Cores: sob encomenda',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-organic-vestido-sfilaciatta-plumaria-thumb.png',
    gallery: [
      'assets/media/pdp-organic-vestido-sfilaciatta-plumaria-01.png',
      'assets/media/pdp-organic-vestido-sfilaciatta-plumaria-02.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-geo',
    name: 'Vestido Geo',
    priceReais: 6800,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Vestido Geo em canvas 100% cânhamo — silhueta midi arquitetônica, decote bateau, costas abertas com recorte triangular e acabamento etéreo. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Vestido Geo',
      'Canvas 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-geo-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-geo-01.png',
      'assets/media/pdp-vestido-geo-02.png',
      'assets/media/pdp-vestido-geo-03.png',
      'assets/media/pdp-vestido-geo-04.png',
      'assets/media/pdp-vestido-geo-05.png',
      'assets/media/pdp-vestido-geo-06.png',
      'assets/media/pdp-vestido-geo-07.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'trench-coat',
    name: 'Trench Coat',
    priceReais: 7800,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Trench coat em canvas 100% cânhamo — gola estruturada, abas de peito, mangas com cinta e silhueta alongada. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Trench Coat',
      'Canvas 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-trench-coat-thumb.png',
    gallery: [
      'assets/media/pdp-trench-coat-01.png',
      'assets/media/pdp-trench-coat-02.png',
      'assets/media/pdp-trench-coat-03.png',
      'assets/media/pdp-trench-coat-04.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'mini-blazer-basque',
    name: 'Mini Blazer Basque',
    priceReais: 6800,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Mini blazer basque em canvas 100% cânhamo — cintura marcada, barra basque em degrau e construção estruturada. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Mini Blazer Basque',
      'Canvas 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-mini-blazer-basque-thumb.png',
    gallery: [
      'assets/media/pdp-mini-blazer-basque-01.png',
      'assets/media/pdp-mini-blazer-basque-02.png',
      'assets/media/pdp-mini-blazer-basque-03.png',
      'assets/media/pdp-mini-blazer-basque-04.png',
      'assets/media/pdp-mini-blazer-basque-05.png',
      'assets/media/pdp-mini-blazer-basque-06.png',
      'assets/media/pdp-mini-blazer-basque-07.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'maxi-blazer',
    name: 'Máxi Blazer',
    priceReais: 6200,
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Máxi blazer em cambraia 100% cânhamo — silhueta alongada, gola assimétrica e bolsos embutidos. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Máxi Blazer',
      'Cambraia 100% cânhamo industrial (Cannabis sativa)',
      'Cor Off-white · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-maxi-blazer-thumb.png',
    gallery: [
      'assets/media/pdp-maxi-blazer-01.png',
      'assets/media/pdp-maxi-blazer-02.png',
      'assets/media/pdp-maxi-blazer-03.png',
      'assets/media/pdp-maxi-blazer-04.png',
      'assets/media/pdp-maxi-blazer-05.png',
      'assets/media/pdp-maxi-blazer-06.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'calca-pantalona-degrau',
    name: 'Pantalona Degrau',
    priceReais: 4000,
    color: 'Off-white / Black',
    size: 'ÚNICO',
    fabric: 'Cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Calça pantalona degrau em cambraia de cânhamo — cintura arquitetônica em degrau, silhueta ampla e queda quieta. Disponível em Off-white ou Black. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Calça pantalona degrau',
      'Cambraia 100% cânhamo industrial (Cannabis sativa)',
      'Cores Off-white ou Black · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · made to feel, not to rush',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-pantalona-degrau-thumb.png',
    gallery: [
      'assets/media/pdp-pantalona-degrau-01.png',
      'assets/media/pdp-pantalona-degrau-02.png',
      'assets/media/pdp-pantalona-degrau-03.png',
      'assets/media/pdp-pantalona-degrau-04.png',
      'assets/media/pdp-pantalona-degrau-05.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'colete-trench',
    name: 'Colete Trench',
    priceReais: 5200,
    color: 'Off-white / Sand / Black',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Colete trench em canvas de cânhamo — silhueta arquitetônica, gola estruturada e abas assimétricas. Disponível em Off-white, Sand ou Black. Peça Organic Dreams.',
    details: [
      'Organic Dreams · Ref.: Colete Trench',
      'Canvas 100% cânhamo industrial (Cannabis sativa)',
      'Cores Off-white, Sand ou Black · tamanho ÚNICO',
      'Seasonless — fora do calendário de moda',
      'Acabamento artesanal · luxury through nature',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-colete-trench-thumb.png',
    gallery: [
      'assets/media/pdp-colete-trench-01.png',
      'assets/media/pdp-colete-trench-02.png',
      'assets/media/pdp-colete-trench-03.png',
      'assets/media/pdp-colete-trench-04.png',
      'assets/media/pdp-colete-trench-05.png',
      'assets/media/pdp-colete-trench-06.png',
      'assets/media/pdp-colete-trench-07.png',
      'assets/media/pdp-colete-trench-08.png',
    ],
    collectionSlug: 'organic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'look-obi-organza',
    name: 'Jaqueta rebordada / shorts',
    priceReais: 14800,
    color: 'Off-white / Black',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda · Canvas 100% cânhamo · Obi 100% seda',
    season: 'Seasonless',
    description:
      'Look Niponic Dreams: top em organza com rebordado em fitas de seda (100% seda), shorts/saia pala em canvas 100% cânhamo e faixa Obi em 100% seda. Cores do look Off-white ou Black; Obi em vermelho, offwhite, black ou sand.',
    details: [
      'Niponic Dreams · Ref.: Obi organza',
      'Top em organza com rebordado em fitas de seda · 100% seda',
      'Shorts/saia pala canvas · 100% cânhamo',
      'Faixa Obi · 100% seda',
      'Cores do look: Off-white / Black',
      'Cores Obi: vermelho / offwhite / black / sand',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-look-obi-organza-thumb.png',
    gallery: [
      'assets/media/pdp-look-obi-organza-01.png',
      'assets/media/pdp-look-obi-organza-02.png',
      'assets/media/pdp-look-obi-organza-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'look-2-trench-obi',
    name: 'Trench / calça organza',
    priceReais: 14800,
    color: 'Off-white / Black / Sand',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo · Organza 100% seda · Obi 100% seda',
    season: 'Seasonless',
    description:
      'Look 2 Niponic Dreams: trench em canvas 100% cânhamo, calça pantalona em organza 100% seda e faixa Obi vermelho em 100% seda. Cores do look Off-white, Black ou Sand; Obi em vermelho, black, offwhite ou sand.',
    details: [
      'Niponic Dreams · Ref.: trench Obi',
      'Trench em canvas · 100% cânhamo',
      'Calça pantalona em organza · 100% seda',
      'Faixa Obi · 100% seda',
      'Cores do look: Off-white / Black / Sand',
      'Cores Obi: vermelho / black / offwhite / sand',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-look-2-trench-obi-thumb.png',
    gallery: [
      'assets/media/pdp-look-2-trench-obi-01.png',
      'assets/media/pdp-look-2-trench-obi-02.png',
      'assets/media/pdp-look-2-trench-obi-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'look-3-blazer-bermuda',
    name: 'Blazer branco / bermuda',
    priceReais: 12800,
    color: 'Off-white / Sand / Black · Bermuda única',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo · Voil de linho impressão botânica',
    season: 'Seasonless',
    description:
      'Look 3 Niponic Dreams: blazer em canvas 100% cânhamo com abotoamento de pressão metalizado e bermuda em voil de linho com impressão botânica Grevileas séries. Blazer em Off-white, Sand ou Black; bermuda cor única.',
    details: [
      'Niponic Dreams · Ref.: blazer bermuda',
      'Blazer em canvas · 100% cânhamo · abotoamento pressão metalizado',
      'Bermuda em voil de linho · impressão botânica Grevileas séries',
      'Blazer cores: Off-white / Sand / Black',
      'Bermuda: cor única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-look-3-blazer-bermuda-thumb.png',
    gallery: [
      'assets/media/pdp-look-3-blazer-bermuda-01.png',
      'assets/media/pdp-look-3-blazer-bermuda-02.png',
      'assets/media/pdp-look-3-blazer-bermuda-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'masculino',
  },
  {
    slug: 'look-4-polo-bermuda',
    name: 'Camiseta polo / bermuda',
    priceReais: 6800,
    color: 'Off-white / Black · Bermuda única',
    size: 'ÚNICO',
    fabric: 'Camiseta polo · Voil de linho impressão botânica',
    season: 'Seasonless',
    description:
      'Look 4 Niponic Dreams: camiseta polo logo manga curta e bermuda em voil de linho com impressão botânica Grevileas séries. Polo em Off-white ou Black; bermuda cor única.',
    details: [
      'Niponic Dreams · Ref.: polo bermuda',
      'Camiseta polo logo · manga curta',
      'Bermuda em voil de linho · impressão botânica Grevileas séries',
      'Cor camiseta: Off-white / Black',
      'Bermuda: cor única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-look-4-polo-bermuda-thumb.png',
    gallery: [
      'assets/media/pdp-look-4-polo-bermuda-01.png',
      'assets/media/pdp-look-4-polo-bermuda-02.png',
      'assets/media/pdp-look-4-polo-bermuda-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'masculino',
  },
  {
    slug: 'look-5-tunica-geo',
    name: 'Túnica / pantalona organza',
    priceReais: 14800,
    color: 'Off-white / Black / Sand · Lenço único',
    size: 'ÚNICO',
    fabric:
      'Canvas 100% cânhamo · Cambraia 100% cânhamo · Cetim 100% seda',
    season: 'Seasonless',
    description:
      'Look 5 Niponic Dreams: vestido túnica geo em canvas 100% cânhamo, calça pantalona em cambraia 100% cânhamo e lenço em cetim com impressão botânica fundo invertido 100% seda. Vestido Off-white, Black ou Sand; pantalona Off-white ou Black; lenço cor única.',
    details: [
      'Niponic Dreams · Ref.: túnica geo',
      'Vestido túnica geo · canvas 100% cânhamo',
      'Calça pantalona · cambraia 100% cânhamo',
      'Lenço em cetim · impressão botânica fundo invertido · 100% seda',
      'Cores vestido: Off-white / Black / Sand',
      'Cores pantalona: Off-white / Black',
      'Lenço: cor única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-look-5-tunica-geo-thumb.png',
    gallery: [
      'assets/media/pdp-look-5-tunica-geo-01.png',
      'assets/media/pdp-look-5-tunica-geo-02.png',
      'assets/media/pdp-look-5-tunica-geo-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'look-8-terno-canvas',
    name: 'Terno Sand / camiseta polo',
    priceReais: 9800,
    color: 'Off-white / Black / Sand',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Look 8 Niponic Dreams: terno em canvas 100% cânhamo — blazer doppiopetto com abotoamento invisível (botões de pressão forrados de seda) e calça slean. Disponível em Off-white, Black ou Sand.',
    details: [
      'Niponic Dreams · Ref.: terno canvas',
      'Terno em canvas · 100% cânhamo',
      'Blazer doppiopetto · abotoamento invisível com botões de pressão forrados de seda',
      'Calça slean',
      'Cores: Off-white / Black / Sand',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-look-8-terno-canvas-thumb.png',
    gallery: ['assets/media/pdp-look-8-terno-canvas-01.png'],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'masculino',
  },
  {
    slug: 'tunica-cetim-botanica-pantalona',
    name: 'Vestido / pantalona / lenço',
    priceReais: 14800,
    color: 'Única · Off-white / Hotgrey / Black',
    size: 'ÚNICO',
    fabric: 'Cetim 100% seda · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Look Niponic Dreams: túnica em cetim com impressão botânica e organza 100% seda, com calça pantalona em organza 100% seda. Túnica cor única; pantalona Off-white, Hotgrey ou Black.',
    details: [
      'Niponic Dreams · Ref.: Túnica cetim botânica + pantalona',
      'Túnica em cetim com impressão botânica e organza · 100% seda',
      'Calça pantalona em organza · 100% seda',
      'Cor túnica: única',
      'Cor pantalona: Off-white / Hotgrey / Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-tunica-cetim-botanica-thumb.png',
    gallery: [
      'assets/media/pdp-tunica-cetim-botanica-01.png',
      'assets/media/pdp-tunica-cetim-botanica-02.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'corset-petalas-pantalona-origami',
    name: 'Corset pétalas / calça cetim',
    priceReais: 14800,
    color: 'Black / Sand / Off-white',
    size: 'ÚNICO',
    fabric: 'Organza e lurex · Cetim 100% seda',
    season: 'Seasonless',
    description:
      'Look Niponic Dreams: corset pétalas em organza e lurex com calça pantalona origami em cetim 100% seda. Corset Black, Sand ou Off-white; calça Black ou Off-white.',
    details: [
      'Niponic Dreams · Ref.: Corset pétalas + pantalona origami',
      'Corset pétalas · organza e lurex',
      'Calça pantalona origami · cetim 100% seda',
      'Cores corset: Black / Sand / Off-white',
      'Cores calça: Black / Off-white',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-corset-petalas-pantalona-thumb.png',
    gallery: [
      'assets/media/pdp-corset-petalas-pantalona-01.png',
      'assets/media/pdp-corset-petalas-pantalona-02.png',
      'assets/media/pdp-corset-petalas-pantalona-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-radial',
    name: 'Vestido longo radial',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Organza e gazar 100% seda',
    season: 'Seasonless',
    description:
      'Vestido longo Radial em organza e gazar 100% seda — linha ArtCouture. Cores sob encomenda.',
    details: [
      'ArtCouture · Ref.: Vestido longo Radial',
      'Organza e gazar · 100% seda',
      'Cores sob encomenda',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-longo-radial-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-longo-radial-01.png',
      'assets/media/pdp-vestido-longo-radial-02.png',
      'assets/media/pdp-vestido-longo-radial-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'blusa-laco-pantalona-origami',
    name: 'Blusa laço / calça cetim',
    priceReais: 12800,
    color: 'Única · Black / Off-white',
    size: 'ÚNICO',
    fabric: 'Georgette 100% seda · Cetim 100% seda',
    season: 'Seasonless',
    description:
      'Look Niponic Dreams: blusa de laço em estampa digital gráfica em Georgette 100% seda e calça pantalona origami em cetim 100% seda. Blusa cor única; calça Black ou Off-white.',
    details: [
      'Niponic Dreams · Ref.: Blusa de laço + pantalona origami',
      'Blusa de laço · estampa digital gráfica · Georgette 100% seda',
      'Calça pantalona origami · cetim 100% seda',
      'Cores blusa: única',
      'Cores calça: Black / Off-white',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-blusa-laco-pantalona-thumb.png',
    gallery: [
      'assets/media/pdp-blusa-laco-pantalona-01.png',
      'assets/media/pdp-blusa-laco-pantalona-02.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-ideogramas',
    name: 'Vestido Lg ideogramas',
    priceReais: 16800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda',
    season: 'Seasonless',
    description:
      'Vestido longo com ideogramas japoneses em organza 100% seda. Cor única. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido longo com ideogramas japoneses',
      'Organza · 100% seda',
      'Cores: única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-ideogramas-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-ideogramas-01.png',
      'assets/media/pdp-vestido-ideogramas-02.png',
      'assets/media/pdp-vestido-ideogramas-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-mousseline-grafica',
    name: 'Vestido Lg estampa digital',
    priceReais: 16800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Mousseline 100% seda',
    season: 'Seasonless',
    description:
      'Vestido longo em mousseline com estampa digital gráfica, 100% seda. Cor única. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido longo em mousseline estampa digital gráfica 100% seda',
      'Mousseline · 100% seda · estampa digital gráfica',
      'Cores: única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-mousseline-grafica-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-mousseline-grafica-01.png',
      'assets/media/pdp-vestido-mousseline-grafica-02.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-kimono-cavalino',
    name: 'Vestido Kimono cavalino',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Acabamento artesanal',
    season: 'Seasonless',
    description:
      'Vestido longo assimétrico estilo kimono com gola cavalino e mangas abertas. Cores sob encomenda. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido longo assimétrico estilo kimono com gola cavalino e mangas abertas',
      'Silhueta assimétrica · mangas abertas · gola cavalino',
      'Cores sob encomenda',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-kimono-cavalino-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-kimono-cavalino-01.png',
      'assets/media/pdp-vestido-kimono-cavalino-02.png',
      'assets/media/pdp-vestido-kimono-cavalino-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-canvas-organza-origami',
    name: 'Vestido Lg ondas e nós',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Vestido longo em canvas 100% cânhamo com aplicações de ondulações de tiras de organza 100% seda e nós de origami. Cores sob encomenda. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido longo em canvas 100% cânhamo e aplicações de ondulações de tiras de organza 100% seda com nós de Origamis',
      'Canvas · 100% cânhamo',
      'Aplicações · tiras de organza 100% seda · nós de origami',
      'Cores sob encomenda',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-canvas-organza-origami-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-canvas-organza-origami-01.png',
      'assets/media/pdp-vestido-canvas-organza-origami-02.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'colete-bermuda-saia-echarpe',
    name: 'Colete / short / echarpe degradê',
    priceReais: 14800,
    color: 'Black / Off-white',
    size: 'ÚNICO',
    fabric: 'Cambraia 100% cânhamo · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Colete e bermuda/saia pregueada em cambraia 100% cânhamo com echarpe tramada em organza 100% seda. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: Colete e bermuda/saia pregueada + echarpe',
      'Colete e bermuda/saia pregueada · cambraia 100% cânhamo',
      'Echarpe tramada · organza 100% seda',
      'Cores: Black / Off-white',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-colete-bermuda-saia-echarpe-thumb.png',
    gallery: [
      'assets/media/pdp-colete-bermuda-saia-echarpe-01.png',
      'assets/media/pdp-colete-bermuda-saia-echarpe-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'colete-patchwork-pantalona-echarpe',
    name: 'Colete / pantalona / echarpe degradê',
    priceReais: 14800,
    color: 'Off-white / Sand / Black',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo reciclado · Cambraia 100% cânhamo · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Colete patchwork em canvas 100% cânhamo reciclado do atelier, calça pantalona pregueada em cambraia 100% cânhamo e echarpe tramada degradê em organza 100% seda. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: colete patchwork + pantalona + echarpe',
      'Colete patchwork · canvas 100% cânhamo reciclado do atelier',
      'Calça pantalona pregueada · cambraia 100% cânhamo',
      'Echarpe tramada degradê · organza 100% seda',
      'Cores colete: Off-white / Sand / Black',
      'Cores calça: Off-white / Black',
      'Cores echarpe: Off-white / Black / Degradê',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-colete-patchwork-pantalona-echarpe-thumb.png',
    gallery: [
      'assets/media/pdp-colete-patchwork-pantalona-echarpe-01.png',
      'assets/media/pdp-colete-patchwork-pantalona-echarpe-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'corset-cestaria-saia-pump',
    name: 'Corset cestaria / saia estampada',
    priceReais: 14800,
    color: 'Oldgold / Black / Off-white · Saia única',
    size: 'ÚNICO',
    fabric: 'Seda 100% · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Corset tramado cestaria oldgold em 100% seda e saia pump em organza 100% seda com impressão botânica Grevileas series. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: corset cestaria + saia pump',
      'Corset tramado cestaria · 100% seda',
      'Saia pump · organza 100% seda · impressão botânica Grevileas series',
      'Cores corset: Oldgold / Black / Off-white',
      'Cor saia: única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-corset-cestaria-saia-pump-thumb.png',
    gallery: [
      'assets/media/pdp-corset-cestaria-saia-pump-01.png',
      'assets/media/pdp-corset-cestaria-saia-pump-02.png',
      'assets/media/pdp-corset-cestaria-saia-pump-03.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'macacao-moulage-cetim-grevileas',
    name: 'Macacão estampado cetim',
    priceReais: 14800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Cetim 100% seda',
    season: 'Seasonless',
    description:
      'Macacão moulage em cetim 100% seda com impressão botânica Grevileas séries. Cor única. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: macacão moulage grevileas',
      'Macacão moulage · cetim 100% seda',
      'Impressão botânica Grevileas séries',
      'Cor macacão: única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-macacao-moulage-cetim-grevileas-thumb.png',
    gallery: [
      'assets/media/pdp-macacao-moulage-cetim-grevileas-01.png',
      'assets/media/pdp-macacao-moulage-cetim-grevileas-02.png',
      'assets/media/pdp-macacao-moulage-cetim-grevileas-03.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'camisa-bermuda-grevileas',
    name: 'Camisa organza / bermuda IB',
    priceReais: 14800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda · Cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Camisa de organza 100% seda e bermuda de cambraia 100% cânhamo, ambas com impressão botânica Grevileas séries. Cor única. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: camisa + bermuda grevileas',
      'Camisa · organza 100% seda · impressão botânica Grevileas séries',
      'Bermuda · cambraia 100% cânhamo · impressão botânica Grevileas séries',
      'Cor: única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-camisa-bermuda-grevileas-thumb.png',
    gallery: [
      'assets/media/pdp-camisa-bermuda-grevileas-01.png',
      'assets/media/pdp-camisa-bermuda-grevileas-02.png',
      'assets/media/pdp-camisa-bermuda-grevileas-03.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'masculino',
  },
  {
    slug: 'maxi-blazer-bermuda-file',
    name: 'Blazer / bermuda bordado filé',
    priceReais: 14800,
    color: 'Off-white / Sand / Black',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo · Cambraia de linho · Bordado filé de algodão · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Maxi blazer off-white em canvas 100% cânhamo com botões de pressão metálicos e bermuda de cambraia de linho dublada com bordado filé de algodão e organza 100% seda. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: maxi blazer + bermuda filé',
      'Maxi blazer · canvas 100% cânhamo · botões de pressão metálicos',
      'Bermuda · cambraia de linho dublada · bordado filé de algodão · organza 100% seda',
      'Cores blazer: Off-white / Sand / Black',
      'Cores bermuda: Off-white / Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-maxi-blazer-bermuda-file-thumb.png',
    gallery: [
      'assets/media/pdp-maxi-blazer-bermuda-file-01.png',
      'assets/media/pdp-maxi-blazer-bermuda-file-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'jaqueta-file-shorts-canvas',
    name: 'Jaqueta filé / shorts saia',
    priceReais: 14800,
    color: 'Off-white / Sand / Black',
    size: 'ÚNICO',
    fabric: 'Bordado filé de algodão · Organza 100% seda · Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Jaqueta off-white em bordado filé de algodão dublada com organza 100% seda e detalhes em canvas 100% cânhamo, com shorts em canvas 100% cânhamo. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: jaqueta filé + shorts canvas',
      'Jaqueta · bordado filé de algodão dublado com organza 100% seda · detalhes em canvas 100% cânhamo',
      'Shorts · canvas 100% cânhamo',
      'Cores jaqueta: Off-white / Black',
      'Cores short: Off-white / Sand / Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-jaqueta-file-shorts-canvas-thumb.png',
    gallery: [
      'assets/media/pdp-jaqueta-file-shorts-canvas-01.png',
      'assets/media/pdp-jaqueta-file-shorts-canvas-02.png',
      'assets/media/pdp-jaqueta-file-shorts-canvas-03.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-tubular-file',
    name: 'Vestido tubo filé',
    priceReais: 14800,
    color: 'Off-white / Black',
    size: 'ÚNICO',
    fabric: 'Bordado filé de algodão · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Vestido tubular off-white frente-única em bordado filé de algodão dublado com organza 100% seda. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: vestido tubular filé',
      'Vestido tubular frente-única · bordado filé de algodão dublado com organza 100% seda',
      'Cores: Off-white / Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-tubular-file-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-tubular-file-01.png',
      'assets/media/pdp-vestido-tubular-file-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'top-kaiapo-bermuda',
    name: 'Top pint Kaiapó / bermuda',
    priceReais: 14800,
    color: 'Nude-Black / Off-white-Black',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda · Cambraia 100% cânhamo',
    season: 'Seasonless',
    description:
      'Top nude com debruns desfiados, dublado em organza 100% seda com técnica autoral termocolante em efeito de pintura corporal indígena (inspiração grafismo tribo Kaiapó), e bermuda black em cambraia 100% cânhamo. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: top Kaiapó + bermuda',
      'Top · debruns desfiados · dublado em organza 100% seda · técnica autoral termocolante · grafismo Kaiapó',
      'Bermuda · cambraia 100% cânhamo',
      'Cores top: Nude-Black / Off-white-Black',
      'Cores shorts: Off-white / Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-top-kaiapo-bermuda-thumb.png',
    gallery: [
      'assets/media/pdp-top-kaiapo-bermuda-01.png',
      'assets/media/pdp-top-kaiapo-bermuda-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'macaquinho-kaiapo',
    name: 'Macaquinho Kaiapó',
    priceReais: 14800,
    color: 'Nude-Black / Off-white-Black',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda',
    season: 'Seasonless',
    description:
      'Macaquinho nude todo dublado em organza 100% seda, com grafismo indígena brasileiro termocolante (técnica autoral com efeito de pintura corporal tribo Kaiapó). Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: macaquinho Kaiapó',
      'Macaquinho · dublado em organza 100% seda',
      'Grafismo indígena brasileiro termocolante · técnica autoral · efeito pintura corporal Kaiapó',
      'Cores: Nude-Black / Off-white-Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-macaquinho-kaiapo-thumb.png',
    gallery: [
      'assets/media/pdp-macaquinho-kaiapo-01.png',
      'assets/media/pdp-macaquinho-kaiapo-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-tubular-kaiapo',
    name: 'Vestido tubo Kaiapó',
    priceReais: 14800,
    color: 'Nude-Black / Off-white-Black',
    size: 'ÚNICO',
    fabric: 'Organza dublada 100% seda',
    season: 'Seasonless',
    description:
      'Vestido tubular nude em organza dublada com efeito gráfico indígena brasileiro termocolante (técnica autoral inspirada na pintura corporal da tribo Kaiapó). Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: vestido tubular Kaiapó',
      'Vestido tubular · organza dublada',
      'Efeito gráfico indígena brasileiro termocolante · técnica autoral · inspiração pintura corporal Kaiapó',
      'Cores: Nude-Black / Off-white-Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-tubular-kaiapo-thumb.png',
    gallery: ['assets/media/pdp-vestido-tubular-kaiapo-01.png'],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'top-sfilaciatta-calca-slean',
    name: 'Top plumário preto / calça',
    priceReais: 14800,
    color: 'Off-white / Black / Sand / Acqua',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda · Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Top frente-única black em organza 100% seda com sfilaciatta (técnica autoral do atelier, efeito plumário) e calça slean black em canvas 100% cânhamo. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: top sfilaciatta + calça slean',
      'Top frente-única · organza 100% seda · sfilaciatta (técnica autoral · efeito plumário)',
      'Calça slean · canvas 100% cânhamo',
      'Cores top: Off-white / Black / Sand / Acqua',
      'Cores calça: Off-white / Black / Sand',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-top-sfilaciatta-calca-slean-thumb.png',
    gallery: [
      'assets/media/pdp-top-sfilaciatta-calca-slean-01.png',
      'assets/media/pdp-top-sfilaciatta-calca-slean-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'mini-blazer-saia-sfilaciatta',
    name: 'Blazer / saia plumaria',
    priceReais: 14800,
    color: 'Off-white / Black / Sand / Degradê',
    size: 'ÚNICO',
    fabric: 'Canvas 100% cânhamo · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Mini blazer degrau off-white em canvas 100% cânhamo e saia degradê em organza sfilaciatta (técnica autoral do atelier, efeito plumário). Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: mini blazer + saia sfilaciatta',
      'Mini blazer degrau · canvas 100% cânhamo',
      'Saia degradê · organza sfilaciatta (técnica autoral · efeito plumário)',
      'Cores blazer: Off-white / Black / Sand',
      'Cores saia: Black / Off-white / Degradê',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-mini-blazer-saia-sfilaciatta-thumb.png',
    gallery: [
      'assets/media/pdp-mini-blazer-saia-sfilaciatta-01.png',
      'assets/media/pdp-mini-blazer-saia-sfilaciatta-02.png',
      'assets/media/pdp-mini-blazer-saia-sfilaciatta-03.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'jaqueta-sfilaciatta-pantalona-acqua',
    name: 'Jaqueta plumaria acqua',
    priceReais: 14800,
    color: 'Acqua / Lilac / Off-white / Black / Degradê',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda · Micropaetes',
    season: 'Seasonless',
    description:
      'Jaqueta acqua em organza 100% seda sfilaciatta (técnica autoral do atelier) e calça pantalona acqua dublada com micropaetes e organza 100% seda. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: jaqueta sfilaciatta + pantalona',
      'Jaqueta · organza 100% seda · sfilaciatta (técnica autoral)',
      'Calça pantalona · dublada micropaetes e organza 100% seda',
      'Cores jaqueta: Acqua / Lilac / Off-white / Black / Degradê',
      'Cores calça: Acqua / Black / Lilac',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-jaqueta-sfilaciatta-pantalona-acqua-thumb.png',
    gallery: [
      'assets/media/pdp-jaqueta-sfilaciatta-pantalona-acqua-01.png',
      'assets/media/pdp-jaqueta-sfilaciatta-pantalona-acqua-02.png',
      'assets/media/pdp-jaqueta-sfilaciatta-pantalona-acqua-03.png',
      'assets/media/pdp-jaqueta-sfilaciatta-pantalona-acqua-04.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'jaqueta-sfilaciatta-degrade',
    name: 'Jaqueta plumaria degradê',
    priceReais: 14800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda',
    season: 'Seasonless',
    description:
      'Jaqueta em organza 100% seda em degradê com sfilaciatta (técnica autoral do atelier) e manga 3/4. Cor única. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: jaqueta sfilaciatta degradê',
      'Jaqueta · organza 100% seda · degradê · sfilaciatta (técnica autoral)',
      'Manga 3/4',
      'Cores jaqueta: Única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-jaqueta-sfilaciatta-degrade-thumb.png',
    gallery: [
      'assets/media/pdp-jaqueta-sfilaciatta-degrade-01.png',
      'assets/media/pdp-jaqueta-sfilaciatta-degrade-02.png',
      'assets/media/pdp-jaqueta-sfilaciatta-degrade-03.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-sfilaciatta-plumaria',
    name: 'Vestido nude / preto plumaria',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Organza e georgette 100% seda',
    season: 'Seasonless',
    description:
      'Vestido nude/black em organza e georgette 100% seda, sfilaciatta (técnica autoral do atelier) com efeito plumaria indígena brasileiro. Cores sob encomenda — coleção ArtCouture. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: vestido sfilaciatta plumaria · ArtCouture',
      'Vestido · organza e georgette 100% seda',
      'Sfilaciatta (técnica autoral) · efeito plumaria indígena brasileiro',
      'Cores: sob encomenda',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-sfilaciatta-plumaria-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-sfilaciatta-plumaria-01.png',
      'assets/media/pdp-vestido-sfilaciatta-plumaria-02.png',
    ],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'terno-doppiopetto-canhamo',
    name: 'Terno Sand / polo',
    priceReais: 14800,
    color: 'Black / Off-white / Sand',
    size: 'ÚNICO',
    fabric: 'Cânhamo 100%',
    season: 'Seasonless',
    description:
      'Terno doppiopetto: blazer curto com calça larga em cânhamo. Peça Brazilian Dreams.',
    details: [
      'Brazilian Dreams · Ref.: terno doppiopetto cânhamo',
      'Blazer curto doppiopetto · cânhamo',
      'Calça larga · cânhamo',
      'Cores blazer: Black / Off-white / Sand',
      'Cores calça larga: Off-white / Black',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-terno-doppiopetto-canhamo-thumb.png',
    gallery: ['assets/media/pdp-terno-doppiopetto-canhamo-01.png'],
    collectionSlug: 'brazilian-dreams',
    categorySlug: 'masculino',
  },
  {
    slug: 'vestido-capa-origami',
    name: 'Vestido paetês + capa',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Seda pura micropaetes · Organza 100% seda',
    season: 'Seasonless',
    description:
      'Vestido tubular de seda pura micropaetes offwhite/sand com alças ultra finas e capa longa com aplicações de origamis em organza 100% seda. Sob encomenda. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido com capa origami',
      'Vestido tubular · seda pura micropaetes · alças ultra finas',
      'Capa longa · aplicações de origamis · organza 100% seda',
      'Cores vestido: Off-white / Black / Acqua / Lilac',
      'Cores capa: Off-white / Black / Acqua / Lilac',
      'Sob encomenda · Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-capa-origami-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-capa-origami-01.png',
      'assets/media/pdp-vestido-capa-origami-02.png',
      'assets/media/pdp-vestido-capa-origami-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-explosion-origamis',
    name: 'Vestido Explosion',
    priceReais: 16800,
    color: 'Sob encomenda',
    size: 'ÚNICO',
    fabric: 'Organza e gazar 100% seda',
    season: 'Seasonless',
    description:
      'Vestido longo Explosion Origamis em organza e gazar 100% seda. Cores sob encomenda. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido longo Explosion Origamis em organza e gazar 100% seda',
      'Organza e gazar · 100% seda',
      'Cores: sob encomenda',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-explosion-origamis-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-explosion-origamis-01.png',
      'assets/media/pdp-vestido-explosion-origamis-02.png',
      'assets/media/pdp-vestido-explosion-origamis-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'tunica-bermuda-origami-hotgrey',
    name: 'Túnica organza / bermuda paetês',
    priceReais: 14800,
    color: 'Hotgrey / Black / Off-white / Lilac',
    size: 'ÚNICO',
    fabric: 'Organza 100% seda · Micropaetes',
    season: 'Seasonless',
    description:
      'Túnica origami hotgrey em organza 100% seda e bermuda prega origami hotgrey em micropaetes e organza. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Túnica origami + bermuda prega origami',
      'Túnica origami · organza 100% seda',
      'Bermuda prega origami · micropaetes e organza',
      'Cores túnica: Hotgrey / Black / Off-white / Lilac',
      'Cores bermuda: Hotgrey / Black / Off-white / Lilac',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-tunica-bermuda-origami-hotgrey-thumb.png',
    gallery: [
      'assets/media/pdp-tunica-bermuda-origami-hotgrey-01.png',
      'assets/media/pdp-tunica-bermuda-origami-hotgrey-02.png',
      'assets/media/pdp-tunica-bermuda-origami-hotgrey-03.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'tunica-oriental-calca-slean',
    name: 'Túnica oriental + calça slean',
    priceReais: 14800,
    color: 'Única · Sand / Black / Off-white',
    size: 'ÚNICO',
    fabric: 'Cetim e organza 100% seda · Canvas 100% cânhamo',
    season: 'Seasonless',
    description:
      'Túnica oriental em cetim e acabamentos em organza 100% seda com impressão botânica e calça slean sand em canvas 100% cânhamo. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Túnica oriental + calça slean',
      'Túnica oriental · cetim e organza 100% seda · impressão botânica',
      'Calça slean · canvas 100% cânhamo',
      'Cores túnica: Única',
      'Cores calça: Sand / Black / Off-white',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-tunica-oriental-calca-slean-thumb.png',
    gallery: [
      'assets/media/pdp-tunica-oriental-calca-slean-01.png',
      'assets/media/pdp-tunica-oriental-calca-slean-02.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
  {
    slug: 'vestido-longo-georgette-borboletas',
    name: 'Vestido Lg borboletas',
    priceReais: 16800,
    color: 'Única',
    size: 'ÚNICO',
    fabric: 'Georgette 100% seda',
    season: 'Seasonless',
    description:
      'Vestido longo em Georgette 100% seda com estampa digital de borboletas. Cor única. Peça Niponic Dreams.',
    details: [
      'Niponic Dreams · Ref.: Vestido longo de Georgette 100% seda estampa digital borboletas',
      'Georgette · 100% seda · estampa digital borboletas',
      'Cores: única',
      'Tamanho ÚNICO · Seasonless',
      'Acabamento artesanal · peças exclusivas para ocasiões especiais',
    ],
    shipping:
      'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.',
    thumb: 'assets/media/plp-vestido-georgette-borboletas-thumb.png',
    gallery: [
      'assets/media/pdp-vestido-georgette-borboletas-01.png',
      'assets/media/pdp-vestido-georgette-borboletas-02.png',
    ],
    collectionSlug: 'niponic-dreams',
    categorySlug: 'feminino',
  },
];

async function seedMediaForProduct(
  productId: string,
  thumb: string,
  gallery: string[],
  productName: string,
): Promise<void> {
  const thumbAsset = await prisma.mediaAsset.create({
    data: {
      storageKey: thumb,
      cdnUrl: assetUrl(thumb),
      mime: thumb.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
      altPt: productName,
      role: MediaRole.thumb,
    },
  });

  await prisma.productMedia.create({
    data: {
      productId,
      mediaAssetId: thumbAsset.id,
      sortOrder: 0,
      isPrimary: true,
    },
  });

  let order = 1;
  for (const path of gallery) {
    const asset = await prisma.mediaAsset.create({
      data: {
        storageKey: path,
        cdnUrl: assetUrl(path),
        mime: path.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        altPt: productName,
        role: MediaRole.gallery,
      },
    });
    await prisma.productMedia.create({
      data: {
        productId,
        mediaAssetId: asset.id,
        sortOrder: order++,
        isPrimary: false,
      },
    });
  }
}

async function main() {
  // Wipe catalog tables for idempotent re-seed (Phase 1 only).
  // Orders reference products — clear payment/order rows first.
  await prisma.paymentEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.productCollection.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();

  const feminino = await prisma.category.create({
    data: { slug: 'feminino', name: 'Feminino' },
  });
  const masculino = await prisma.category.create({
    data: { slug: 'masculino', name: 'Masculino' },
  });
  const categoryBySlug = {
    feminino: feminino.id,
    masculino: masculino.id,
  } as const;

  const collectionBySlug = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const row = await prisma.collection.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        publishedAt: new Date(),
      },
    });
    collectionBySlug.set(c.slug, row.id);
  }

  let sort = 0;
  for (const p of PRODUCTS) {
    const collectionId = collectionBySlug.get(p.collectionSlug);
    if (!collectionId) {
      throw new Error(`Missing collection ${p.collectionSlug}`);
    }
    const categoryId = categoryBySlug[p.categorySlug];

    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        details: p.details,
        shippingCopy: p.shipping,
        priceCents: p.priceReais * 100,
        currency: 'BRL',
        color: p.color,
        size: p.size,
        fabric: p.fabric,
        season: p.season,
        status: ProductStatus.published,
        stockQty: 1,
        categoryId,
        collections: {
          create: {
            collectionId,
            sortOrder: sort++,
          },
        },
      },
    });

    await seedMediaForProduct(product.id, p.thumb, p.gallery, p.name);
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${COLLECTIONS.length} collections, 2 categories, ${PRODUCTS.length} products.`,
  );

  await seedAdminUser();
  const { enrichCatalogFromFrontend, seedContentDocuments } = await import(
    '../scripts/seed-content-enrichment'
  );
  await enrichCatalogFromFrontend(prisma);
  await seedContentDocuments(prisma);
}

async function seedAdminUser(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@leonardochiasso.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'atelier2026';
  const argon2 = await import('argon2');
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash: await argon2.hash(password),
        role: 'owner',
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded admin user ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
