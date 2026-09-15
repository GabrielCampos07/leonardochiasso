import { withCdnUrls } from '../../core/media-url';
import { COLLECTION_SLUGS, CollectionSlug } from '../../core/routes';

const MEDIA = 'assets/media/alta-costura';

export interface AltaDesfileShow {
  slug: string;
  collectionSlug: CollectionSlug;
  title: string;
  subtitle: string;
  /** Season years shown next to the films hub title (button-sized type). */
  season?: string;
  /** Listing + detail hero — same image. */
  poster: string;
  /** CSS object-position for wide hero crop (e.g. runway stills). */
  posterPosition?: string;
  /** Home films hub when `?categoria=masculino`. */
  posterMasculino?: string;
  posterMasculinoPosition?: string;
  lead: string;
  details: string[];
  photos: { src: string; alt: string }[];
  /** Optional clip inserted mid-gallery. */
  midVideoSrc?: string;
  midVideoCaption?: string;
  /** Insert mid video after this photo index (0-based). */
  midVideoAfterIndex?: number;
  videoSrc?: string;
  videoCaption?: string;
  /** Empty editorial — show “Em breve” instead of gallery/video. */
  comingSoon?: boolean;
}

export const ALTA_DESFILES: AltaDesfileShow[] = withCdnUrls([
{
    slug: 'brazilian-dreams',
    collectionSlug: COLLECTION_SLUGS.brazilianDreams,
    title: 'Brazilian Dreams',
    season: '2026 2027',
    subtitle: 'Desfile',
    poster: `${MEDIA}/brazilian-dreams-destaque.png`,
    /** Portrait runway still — brand + model/catwalk in the lower frame. */
    posterPosition: 'center 62%',
    posterMasculino: `${MEDIA}/brazilian-dreams-destaque-masculino.png`,
    posterMasculinoPosition: 'center 36%',
    lead: 'Brazilian Dreams — cânhamo, seda e técnicas autorais do atelier.',
    details: [
      'Coleção Brazilian Dreams',
      'Cânhamo, organza e seda',
      'Sfilaciatta · filé · grafismo Kaiapó · ArtCouture',
      'Registro completo em vídeo abaixo',
    ],
    photos: [
      {
        src: `${MEDIA}/brazilian-dreams-destaque.png`,
        alt: 'Brazilian Dreams — desfile destaque',
      },
      {
        src: `${MEDIA}/brazilian-campaign-novo-luxo.png`,
        alt: 'Brazilian Dreams — o novo luxo veste corpo e alma',
      },
      {
        src: `${MEDIA}/brazilian-campaign-hemp-silk.png`,
        alt: 'Brazilian Dreams — hemp & silk',
      },
      {
        src: `${MEDIA}/brazilian-campaign-kaiapo.png`,
        alt: 'Brazilian Dreams — grafismo Kaiapó',
      },
      {
        src: `${MEDIA}/brazilian-dreams-hero.png`,
        alt: 'Brazilian Dreams — ArtCouture vestido sfilaciatta',
      },
      {
        src: 'assets/media/lookbook/brazilian-dreams/01-colete-bermuda-saia-echarpe/01.png',
        alt: 'Brazilian Dreams — Look 01',
      },
      {
        src: 'assets/media/lookbook/brazilian-dreams/03-corset-cestaria-saia-pump/01.png',
        alt: 'Brazilian Dreams — Look 03',
      },
      {
        src: 'assets/media/lookbook/brazilian-dreams/16-vestido-sfilaciatta-plumaria/01.png',
        alt: 'Brazilian Dreams — Look 16 ArtCouture',
      },
      {
        src: 'assets/media/lookbook/brazilian-dreams/17-terno-doppiopetto-canhamo/01.png',
        alt: 'Brazilian Dreams — Look 17',
      },
    ],
    videoSrc: `${MEDIA}/brazilian-dreams-desfile.mp4`,
    videoCaption: 'Brazilian Dreams — desfile completo',
  },
  {
    slug: 'niponic-dreams',
    collectionSlug: COLLECTION_SLUGS.niponicDreams,
    title: 'Niponic Dreams',
    season: '2025 2026',
    subtitle: 'Desfile',
    poster: `${MEDIA}/niponic-hero-black.png`,
    posterMasculino: `${MEDIA}/niponic-dreams-destaque-masculino.png`,
    posterMasculinoPosition: '42% 38%',
    lead: 'Niponic Dreams — ocasiões especiais, origami e contraste preto e branco no desfile.',
    details: [
      'Coleção Niponic Dreams',
      'Referências japonesas contemporâneas',
      'Look Obi organza e peças de passagem',
      'O vídeo abaixo integra o desfile',
    ],
    photos: [
      {
        src: `${MEDIA}/niponic-hero-black.png`,
        alt: 'Niponic Dreams — preto de costas',
      },
      {
        src: `${MEDIA}/niponic-origami-beanie.png`,
        alt: 'Niponic Dreams — beanie origami',
      },
      {
        src: `${MEDIA}/niponic-look1-front.png`,
        alt: 'Niponic Dreams — Look 1 frente',
      },
      {
        src: `${MEDIA}/niponic-look1-walk.png`,
        alt: 'Niponic Dreams — Look 1 caminhada',
      },
      {
        src: `${MEDIA}/niponic-look1-back.png`,
        alt: 'Niponic Dreams — Look 1 costas',
      },
      {
        src: `${MEDIA}/niponic-desfile-01.png`,
        alt: 'Niponic Dreams — passagem',
      },
    ],
    videoSrc: `${MEDIA}/niponic-dreams-desfile.mp4`,
    videoCaption: 'Niponic Dreams — desfile',
  },
  {
    slug: 'organic-dreams',
    collectionSlug: COLLECTION_SLUGS.organicDreams,
    title: 'Organic Dreams',
    season: '2024 2025',
    subtitle: 'Desfile',
    poster: `${MEDIA}/organic-hero.png`,
    posterMasculino: `${MEDIA}/organic-dreams-destaque-masculino.png`,
    posterMasculinoPosition: 'center 32%',
    lead: 'Organic Dreams em movimento — o novo luxo em 100% hemp no ritmo do desfile.',
    details: [
      'Linha Organic Dreams',
      'Peças em cânhamo industrial',
      'Seasonless · luxury through nature',
      'Registro completo em vídeo abaixo',
    ],
    photos: [
      {
        src: `${MEDIA}/organic-hero.png`,
        alt: 'Organic Dreams — duo em escala no runway',
      },
      {
        src: `${MEDIA}/organic-desfile-02.png`,
        alt: 'Organic Dreams — duo branco no catwalk',
      },
      {
        src: `${MEDIA}/organic-desfile-03.png`,
        alt: 'Organic Dreams — blazer e costas abertas',
      },
      {
        src: `${MEDIA}/organic-desfile-04.png`,
        alt: 'Organic Dreams — textura e trench',
      },
      {
        src: `${MEDIA}/organic-desfile-05.png`,
        alt: 'Organic Dreams — vestido branco longo',
      },
      {
        src: `${MEDIA}/organic-desfile-06.png`,
        alt: 'Organic Dreams — finale',
      },
      {
        src: `${MEDIA}/organic-desfile-07.png`,
        alt: 'Organic Dreams — materiais e marca',
      },
      {
        src: `${MEDIA}/organic-desfile-08.png`,
        alt: 'Organic Dreams — trench e cachecol',
      },
      {
        src: `${MEDIA}/organic-desfile-09.png`,
        alt: 'Organic Dreams — looks pretos no runway',
      },
    ],
    midVideoSrc: `${MEDIA}/organic-dreams-desfile-solo.mp4`,
    midVideoCaption: 'Organic Dreams — solo',
    midVideoAfterIndex: 3,
    videoSrc: `${MEDIA}/organic-dreams-desfile.mp4`,
    videoCaption: 'Organic Dreams — desfile completo',
  },
]);

export function getAltaDesfile(slug: string): AltaDesfileShow | undefined {
  return ALTA_DESFILES.find((d) => d.slug === slug);
}
