/** Jewelry editorial — Coleção Gioielli. */

import { withCdnUrls } from './media-url';
import { COLLECTION_SLUGS, CollectionSlug } from './routes';

const MEDIA = 'assets/media/joias';

export const JOIAS_INTRO_VIDEO = withCdnUrls(`${MEDIA}/joias-intro.mp4`);
export const JOIAS_INTRO_POSTER = withCdnUrls(`${MEDIA}/joias-intro-poster.jpeg`);

export interface JoiaPiece {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number | null;
  priceLabel: string;
  /** Primary still (first gallery image if omitted). */
  image?: string;
  /** Extra stills of the same piece (flatlay, detalhes, look). */
  images?: string[];
  medium?: string;
  videoSrc?: string;
  /** Collection this joia is featured under (PLP cross-sell). */
  collectionSlug?: CollectionSlug;
}

export const JOIAS_PIECES: JoiaPiece[] = withCdnUrls([
  {
    id: 'colar-dentes-perola-barroca',
    slug: 'colar-dentes-perola-barroca',
    title: 'Colar Dentes',
    description:
      'Colar de formato dentes em pérola barroca — peça feita sob medida.',
    price: null,
    priceLabel: 'Sob medida',
    image: `${MEDIA}/colar-dentes-perola-barroca.jpeg`,
    medium: 'Pérola barroca · sob medida',
    videoSrc: `${MEDIA}/colar-dentes-perola-barroca.mp4`,
    collectionSlug: COLLECTION_SLUGS.organicDreams,
  },
  {
    id: 'brinco-tassel-sage',
    slug: 'brinco-tassel-sage',
    title: 'Brinco Tassel Sage',
    description:
      'Brinco longo em gota com fileiras de miçangas e franja em tom sage — presença leve e vertical.',
    price: null,
    priceLabel: 'Sob consulta',
    image: `${MEDIA}/brinco-tassel-sage-campanha.png`,
    images: [
      `${MEDIA}/brinco-tassel-sage-campanha.png`,
      `${MEDIA}/brinco-tassel-sage-look.png`,
    ],
    medium: 'Miçangas · tassel · sage',
  },
  {
    id: 'brinco-cascata-tassel',
    slug: 'brinco-cascata-tassel',
    title: 'Brinco Cascata Tassel',
    description:
      'Brinco articulado em arco com colunas de tassels empilhados — silhueta em cascata, acabamento metalizado.',
    price: null,
    priceLabel: 'Sob consulta',
    image: `${MEDIA}/brinco-cascata-tassel-look.png`,
    images: [`${MEDIA}/brinco-cascata-tassel-look.png`],
    medium: 'Tassel · metal · preto',
  },
  {
    id: 'brinco-micangas-tassel',
    slug: 'brinco-micangas-tassel',
    title: 'Brinco Miçangas Tassel',
    description:
      'Brinco longo com múltiplos fios de miçangas facetadas e tassels — look e still da mesma peça.',
    price: null,
    priceLabel: 'Sob consulta',
    image: `${MEDIA}/brinco-micangas-tassel-look.png`,
    images: [
      `${MEDIA}/brinco-micangas-tassel-look.png`,
      `${MEDIA}/brinco-micangas-tassel-flat.png`,
    ],
    medium: 'Miçangas · tassel · preto',
  },
  {
    id: 'brinco-pave-tassel',
    slug: 'brinco-pave-tassel',
    title: 'Brinco Pavê Tassel',
    description:
      'Brinco em fio de contas pretas com esfera pavê de cristais e tassel longo — contraste entre brilho e franja.',
    price: null,
    priceLabel: 'Sob consulta',
    image: `${MEDIA}/brinco-pave-tassel-flat.png`,
    images: [`${MEDIA}/brinco-pave-tassel-flat.png`],
    medium: 'Contas · pavê · tassel',
  },
  {
    id: 'brinco-perolas-tassel',
    slug: 'brinco-perolas-tassel',
    title: 'Brinco Pérolas Tassel',
    description:
      'Brinco com tassel superior e fios de miçangas terminados em pérolas pretas — volume e queda alongada.',
    price: null,
    priceLabel: 'Sob consulta',
    image: `${MEDIA}/brinco-perolas-tassel-look.png`,
    images: [`${MEDIA}/brinco-perolas-tassel-look.png`],
    medium: 'Pérola · miçangas · tassel',
  },
]);

export function joiaGallery(piece: JoiaPiece): string[] {
  if (piece.images?.length) return piece.images;
  return piece.image ? [piece.image] : [];
}
