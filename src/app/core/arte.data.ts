/** Editorial art gallery — separate from fashion catalog. */

export interface ArtPiece {
  id: string;
  slug: string;
  title: string;
  /** Placeholder until official copy */
  description: string;
  /** null → show “Sob consulta” */
  price: number | null;
  priceLabel: string;
  /** Still image */
  image?: string;
  /** Extra stills of the same work (detail, crop). */
  images?: string[];
  medium?: string;
  videoSrc?: string;
  videoCaption?: string;
}

const MEDIA = 'assets/media/arts';

/** Page hero — full-bleed intro film (like Joias). */
export const ART_INTRO_VIDEO = `${MEDIA}/arte-intro.mp4`;
export const ART_INTRO_POSTER = `${MEDIA}/arte-intro-poster.jpeg`;

/** Full-bleed presentation (image and/or video highlight). */
export interface ArtPresentation {
  alt: string;
  image?: string;
  videoSrc?: string;
  /** Optional label under / over video destaque */
  title?: string;
  caption?: string;
  objectPosition?: string;
}

export type ArtSeriesId = 'textile' | 'paper';

export interface ArtSeries {
  id: ArtSeriesId;
  title: string;
  subtitle: string;
  body: string;
  /** Series heroes / destaques (not products) */
  presentations?: ArtPresentation[];
  pieces: ArtPiece[];
}

const TEXTILE_PIECES: ArtPiece[] = [
  {
    id: 'monalisa',
    slug: 'monalisa',
    title: 'Gioconda',
    description:
      'Mona Lisa reinventada em mosaico têxtil — módulo, repetição e matéria em escala de ateliê.',
    price: null,
    priceLabel: 'Preço sob consulta',
    image: `${MEDIA}/monalisa-mosaic.jpeg`,
    medium: 'Mosaico Têxtil',
    videoSrc: `${MEDIA}/monalisa-art.mov`,
  },
  {
    id: 'jesus',
    slug: 'jesus',
    title: 'Christo',
    description:
      'Jesus em mosaico têxtil — patches de organza, luz e presença quieta em escala de ateliê.',
    price: null,
    priceLabel: 'Preço sob consulta',
    image: `${MEDIA}/christo-mosaic.png`,
    images: [`${MEDIA}/christo-mosaic.png`, `${MEDIA}/christo-mosaic-olho.png`],
    medium: 'Mosaico Têxtil',
  },
];

const PAPER_PIECES: ArtPiece[] = [
  {
    id: 'marilyn',
    slug: 'marilyn',
    title: 'Marilyn',
    description:
      'Ícone reinventado em Mosaic Paper — superfície tátil, escala de 100 × 130 cm e presença de ateliê.',
    price: null,
    priceLabel: 'Preço sob consulta',
    image: `${MEDIA}/marilyn-mosaic-cropped.jpeg`,
    medium: 'Mosaic Paper · 100 × 130 cm',
  },
  {
    id: 'neymar',
    slug: 'neymar',
    title: 'Neymar II',
    description: '',
    price: null,
    priceLabel: 'Preço sob consulta',
    image: `${MEDIA}/neymar-mosaic.jpeg`,
    medium: 'Mosaic Paper',
    videoSrc: `${MEDIA}/neymar-art.mov`,
  },
  {
    id: 'elton',
    slug: 'elton',
    title: 'Elton',
    description: '',
    price: null,
    priceLabel: 'Preço sob consulta',
    image: `${MEDIA}/elton-mosaic.jpeg`,
    medium: 'Mosaic Paper',
  },
  {
    id: 'naomi',
    slug: 'naomi',
    title: 'Naomi',
    description: '',
    price: null,
    priceLabel: 'Preço sob consulta',
    image: `${MEDIA}/naomi-mosaic.jpeg`,
    medium: 'Mosaic Paper',
  },
];

/**
 * Two series on /arte:
 * 1. Mosaico Têxtil — presentation + product(s)
 * 2. Mosaic Paper — presentations + products
 */
export const ART_SERIES: ArtSeries[] = [
  {
    id: 'textile',
    title: 'Mosaico Têxtil',
    subtitle: 'Entre vestuário e pintura',
    body:
      'Aqui a arte conversa com a alta costura: a mesma lógica de construção — módulo, repetição, matéria — que veste o corpo também reinventam a Mona Lisa, Jesus e Leonardo. Uma ponte entre o renascimento e o agora, onde o brilho do tecido e a geometria do mosaico transformam memória em objeto contemporâneo.',
    presentations: [],
    pieces: TEXTILE_PIECES,
  },
  {
    id: 'paper',
    title: 'Mosaic Paper',
    subtitle: 'Retratos em escala',
    body:
      'Retratos construídos fragmento a fragmento — papel, luz e silêncio. Ícones da cultura pop e do imaginário clássico ganham presença arquitetônica: escala de sala, textura de ateliê, presença quieta. Cada obra é uma superfície viva, onde o olhar se aproxima e o tempo desacelera.',
    presentations: [
      {
        image: `${MEDIA}/portfolio-leonardo.jpeg`,
        alt: 'Leonardo Chiasso com as obras Elton e Marilyn em Mosaic Paper',
        objectPosition: 'center 28%',
      },
      {
        image: `${MEDIA}/st-petersburg-florida.jpeg`,
        videoSrc: `${MEDIA}/st-petersburg-florida.mov`,
        alt: 'St. Petersburg, Florida — Mosaic Paper em residência',
        title: 'St. Petersburg, Florida',
        caption: 'A arte em casa — Mosaic Paper em escala de residência.',
      },
    ],
    pieces: PAPER_PIECES,
  },
];

/** Flat list for detail routes / lookups. */
export const ART_PIECES: ArtPiece[] = ART_SERIES.flatMap((s) => s.pieces);

export function getArtPieceBySlug(slug: string): ArtPiece | undefined {
  return ART_PIECES.find((p) => p.slug === slug || p.id === slug);
}
