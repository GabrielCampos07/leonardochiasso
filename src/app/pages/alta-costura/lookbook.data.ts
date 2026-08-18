import { COLLECTION_SLUGS, CollectionSlug } from '../../core/routes';

const LB = 'assets/media/lookbook';

export interface LookbookLook {
  number: number;
  label: string;
  name: string;
  /** Cover image for the grid */
  cover: string;
  images: string[];
  /** Optional shop product */
  productSlug?: string;
}

export interface LookbookCollection {
  /** Matches alta-costura desfile slug */
  slug: string;
  collectionSlug: CollectionSlug;
  title: string;
  looks: LookbookLook[];
}

/** Studio product looks only — never desfile / runway stills. */
export const LOOKBOOKS: LookbookCollection[] = [
  {
    slug: 'organic-dreams',
    collectionSlug: COLLECTION_SLUGS.organicDreams,
    title: 'Organic Dreams',
    looks: [
      {
        number: 1,
        label: '01',
        name: 'Vestido Lg Assimétrico',
        cover: `${LB}/organic-dreams/03-vestido-assimetrico/01.png`,
        images: [
          `${LB}/organic-dreams/03-vestido-assimetrico/01.png`,
          `${LB}/organic-dreams/03-vestido-assimetrico/02.png`,
          `${LB}/organic-dreams/03-vestido-assimetrico/03.png`,
          `${LB}/organic-dreams/03-vestido-assimetrico/04.png`,
          `${LB}/organic-dreams/03-vestido-assimetrico/05.png`,
          `${LB}/organic-dreams/03-vestido-assimetrico/06.png`,
        ],
        productSlug: 'vestido-assimetrico-rasgo',
      },
      {
        number: 2,
        label: '02',
        name: 'Vestido Lg Bateau',
        cover: `${LB}/organic-dreams/02-vestido-longo-bateau/01.png`,
        images: [
          `${LB}/organic-dreams/02-vestido-longo-bateau/01.png`,
          `${LB}/organic-dreams/02-vestido-longo-bateau/02.png`,
          `${LB}/organic-dreams/02-vestido-longo-bateau/03.png`,
          `${LB}/organic-dreams/02-vestido-longo-bateau/04.png`,
          `${LB}/organic-dreams/02-vestido-longo-bateau/05.png`,
        ],
        productSlug: 'vestido-longo-bateau',
      },
      {
        number: 3,
        label: '03',
        name: 'Vestido Geo',
        cover: `${LB}/organic-dreams/12-vestido-geo/01.png`,
        images: [
          `${LB}/organic-dreams/12-vestido-geo/01.png`,
          `${LB}/organic-dreams/12-vestido-geo/02.png`,
          `${LB}/organic-dreams/12-vestido-geo/03.png`,
          `${LB}/organic-dreams/12-vestido-geo/04.png`,
          `${LB}/organic-dreams/12-vestido-geo/05.png`,
          `${LB}/organic-dreams/12-vestido-geo/06.png`,
          `${LB}/organic-dreams/12-vestido-geo/07.png`,
        ],
        productSlug: 'vestido-geo',
      },
      {
        number: 4,
        label: '04',
        name: 'Trench Coat',
        cover: `${LB}/organic-dreams/13-trench-coat/01.png`,
        images: [
          `${LB}/organic-dreams/13-trench-coat/01.png`,
          `${LB}/organic-dreams/13-trench-coat/02.png`,
          `${LB}/organic-dreams/13-trench-coat/03.png`,
          `${LB}/organic-dreams/13-trench-coat/04.png`,
        ],
        productSlug: 'trench-coat',
      },
      {
        number: 5,
        label: '05',
        name: 'Mini Blazer Degrau',
        cover: 'assets/media/pdp-mini-blazer-basque-01.png',
        images: [
          'assets/media/pdp-mini-blazer-basque-01.png',
          'assets/media/pdp-mini-blazer-basque-02.png',
          'assets/media/pdp-mini-blazer-basque-03.png',
        ],
        productSlug: 'mini-blazer-basque',
      },
      {
        number: 6,
        label: '06',
        name: 'Colete Trench',
        cover: `${LB}/organic-dreams/06-colete-trench/01.png`,
        images: [
          `${LB}/organic-dreams/06-colete-trench/01.png`,
          `${LB}/organic-dreams/06-colete-trench/02.png`,
          `${LB}/organic-dreams/06-colete-trench/03.png`,
          `${LB}/organic-dreams/06-colete-trench/04.png`,
        ],
        productSlug: 'colete-trench',
      },
      {
        number: 7,
        label: '07',
        name: 'Maxi Blazer',
        cover: `${LB}/organic-dreams/14-maxi-blazer/01.png`,
        images: [
          `${LB}/organic-dreams/14-maxi-blazer/01.png`,
          `${LB}/organic-dreams/14-maxi-blazer/02.png`,
          `${LB}/organic-dreams/14-maxi-blazer/03.png`,
          `${LB}/organic-dreams/14-maxi-blazer/04.png`,
          `${LB}/organic-dreams/14-maxi-blazer/05.png`,
          `${LB}/organic-dreams/14-maxi-blazer/06.png`,
        ],
        productSlug: 'maxi-blazer',
      },
      {
        number: 8,
        label: '08',
        name: 'Pantalona Rasgo',
        cover: `${LB}/organic-dreams/11-calca-pantalona-rasgo/01.png`,
        images: [
          `${LB}/organic-dreams/11-calca-pantalona-rasgo/01.png`,
          `${LB}/organic-dreams/11-calca-pantalona-rasgo/02.png`,
          `${LB}/organic-dreams/11-calca-pantalona-rasgo/03.png`,
          `${LB}/organic-dreams/11-calca-pantalona-rasgo/04.png`,
          `${LB}/organic-dreams/11-calca-pantalona-rasgo/05.png`,
          `${LB}/organic-dreams/11-calca-pantalona-rasgo/06.png`,
        ],
        productSlug: 'calca-pantalona-rasgo',
      },
      {
        number: 9,
        label: '09',
        name: 'Pantalona Degrau',
        cover: `${LB}/organic-dreams/07-pantalona-degrau/01.png`,
        images: [
          `${LB}/organic-dreams/07-pantalona-degrau/01.png`,
          `${LB}/organic-dreams/07-pantalona-degrau/02.png`,
          `${LB}/organic-dreams/07-pantalona-degrau/03.png`,
          `${LB}/organic-dreams/07-pantalona-degrau/04.png`,
          `${LB}/organic-dreams/07-pantalona-degrau/05.png`,
        ],
        productSlug: 'calca-pantalona-degrau',
      },
      {
        number: 10,
        label: '10',
        name: 'Jaqueta plumaria degradê',
        cover: `${LB}/organic-dreams/10-jaqueta-sfilaciatta-degrade/01.png`,
        images: [
          `${LB}/organic-dreams/10-jaqueta-sfilaciatta-degrade/01.png`,
          `${LB}/organic-dreams/10-jaqueta-sfilaciatta-degrade/02.png`,
          `${LB}/organic-dreams/10-jaqueta-sfilaciatta-degrade/03.png`,
        ],
        productSlug: 'organic-jaqueta-sfilaciatta-degrade',
      },
      {
        number: 11,
        label: '11',
        name: 'Shorts Degrau',
        cover: `${LB}/organic-dreams/08-shorts-degrau/01.png`,
        images: [
          `${LB}/organic-dreams/08-shorts-degrau/01.png`,
          `${LB}/organic-dreams/08-shorts-degrau/02.png`,
          `${LB}/organic-dreams/08-shorts-degrau/03.png`,
        ],
        productSlug: 'shorts-degrau',
      },
      {
        number: 12,
        label: '12',
        name: 'Shorts Saia pala',
        cover: 'assets/media/pdp-shorts-pala-01.png',
        images: [
          'assets/media/pdp-shorts-pala-01.png',
          'assets/media/pdp-shorts-pala-02.png',
          'assets/media/pdp-shorts-pala-03.png',
        ],
        productSlug: 'shorts-pala',
      },
      {
        number: 13,
        label: '13',
        name: 'Vestido Lg Mosaic Têxtil',
        cover: `${LB}/organic-dreams/04-vestido-mosaico/01.png`,
        images: [
          `${LB}/organic-dreams/04-vestido-mosaico/01.png`,
          `${LB}/organic-dreams/04-vestido-mosaico/02.png`,
          `${LB}/organic-dreams/04-vestido-mosaico/03.png`,
          `${LB}/organic-dreams/04-vestido-mosaico/04.png`,
        ],
        productSlug: 'vestido-longo-mosaico-textil',
      },
      {
        number: 14,
        label: '14',
        name: 'Jaqueta Mosaico Têxtil',
        cover: `${LB}/organic-dreams/05-jaqueta-mosaico/01.png`,
        images: [
          `${LB}/organic-dreams/05-jaqueta-mosaico/01.png`,
          `${LB}/organic-dreams/05-jaqueta-mosaico/02.png`,
          `${LB}/organic-dreams/05-jaqueta-mosaico/03.png`,
          `${LB}/organic-dreams/05-jaqueta-mosaico/04.png`,
          `${LB}/organic-dreams/05-jaqueta-mosaico/05.png`,
        ],
        productSlug: 'jaqueta-mosaico-textil',
      },
      {
        number: 15,
        label: '15',
        name: 'Camisa Mosaico Têxtil',
        cover: `${LB}/organic-dreams/01-camisa-mosaico-pantalona/01.png`,
        images: [
          `${LB}/organic-dreams/01-camisa-mosaico-pantalona/01.png`,
          `${LB}/organic-dreams/01-camisa-mosaico-pantalona/02.png`,
          `${LB}/organic-dreams/01-camisa-mosaico-pantalona/03.png`,
        ],
        productSlug: 'camisa-mosaico-textil-calca-pantalona',
      },
      {
        number: 16,
        label: '16',
        name: 'Top mosaico têxtil',
        cover: `${LB}/organic-dreams/15-top-mosaico-textil/01.png`,
        images: [
          `${LB}/organic-dreams/15-top-mosaico-textil/01.png`,
          `${LB}/organic-dreams/15-top-mosaico-textil/02.png`,
          `${LB}/organic-dreams/15-top-mosaico-textil/03.png`,
        ],
        productSlug: 'top-mosaico-textil',
      },
      {
        number: 17,
        label: '17',
        name: 'Jaqueta jeans / camiseta / calça slean',
        cover: 'assets/media/pdp-jaqueta-jeans-camiseta-calca-slean-01.png',
        images: ['assets/media/pdp-jaqueta-jeans-camiseta-calca-slean-01.png'],
        productSlug: 'jaqueta-jeans-camiseta-calca-slean',
      },
    ],
  },
  {
    slug: 'niponic-dreams',
    collectionSlug: COLLECTION_SLUGS.niponicDreams,
    title: 'Niponic Dreams',
    looks: [
      {
        number: 1,
        label: '01',
        name: 'Jaqueta rebordada / shorts',
        cover: `${LB}/niponic-dreams/01-look-obi-organza/01.png`,
        images: [
          `${LB}/niponic-dreams/01-look-obi-organza/01.png`,
          `${LB}/niponic-dreams/01-look-obi-organza/02.png`,
          `${LB}/niponic-dreams/01-look-obi-organza/03.png`,
        ],
        productSlug: 'look-obi-organza',
      },
      {
        number: 2,
        label: '02',
        name: 'Trench / calça organza',
        cover: `${LB}/niponic-dreams/02-look-2-trench-obi/01.png`,
        images: [
          `${LB}/niponic-dreams/02-look-2-trench-obi/01.png`,
          `${LB}/niponic-dreams/02-look-2-trench-obi/02.png`,
          `${LB}/niponic-dreams/02-look-2-trench-obi/03.png`,
        ],
        productSlug: 'look-2-trench-obi',
      },
      {
        number: 3,
        label: '03',
        name: 'Vestido / pantalona / lenço',
        cover: `${LB}/niponic-dreams/07-tunica-cetim-botanica/01.png`,
        images: [
          `${LB}/niponic-dreams/07-tunica-cetim-botanica/01.png`,
          `${LB}/niponic-dreams/07-tunica-cetim-botanica/02.png`,
        ],
        productSlug: 'tunica-cetim-botanica-pantalona',
      },
      {
        number: 4,
        label: '04',
        name: 'Túnica / pantalona organza',
        cover: `${LB}/niponic-dreams/05-look-5-tunica-geo/01.png`,
        images: [
          `${LB}/niponic-dreams/05-look-5-tunica-geo/01.png`,
          `${LB}/niponic-dreams/05-look-5-tunica-geo/02.png`,
          `${LB}/niponic-dreams/05-look-5-tunica-geo/03.png`,
        ],
        productSlug: 'look-5-tunica-geo',
      },
      {
        number: 5,
        label: '05',
        name: 'Túnica organza / bermuda paetês',
        cover: `${LB}/niponic-dreams/17-tunica-bermuda-origami-hotgrey/01.png`,
        images: [
          `${LB}/niponic-dreams/17-tunica-bermuda-origami-hotgrey/01.png`,
          `${LB}/niponic-dreams/17-tunica-bermuda-origami-hotgrey/02.png`,
          `${LB}/niponic-dreams/17-tunica-bermuda-origami-hotgrey/03.png`,
        ],
        productSlug: 'tunica-bermuda-origami-hotgrey',
      },
      {
        number: 6,
        label: '06',
        name: 'Corset pétalas / calça cetim',
        cover: `${LB}/niponic-dreams/08-corset-petalas/01.png`,
        images: [
          `${LB}/niponic-dreams/08-corset-petalas/01.png`,
          `${LB}/niponic-dreams/08-corset-petalas/02.png`,
          `${LB}/niponic-dreams/08-corset-petalas/03.png`,
        ],
        productSlug: 'corset-petalas-pantalona-origami',
      },
      {
        number: 7,
        label: '07',
        name: 'Blusa laço / calça cetim',
        cover: `${LB}/niponic-dreams/10-blusa-laco-pantalona/01.png`,
        images: [
          `${LB}/niponic-dreams/10-blusa-laco-pantalona/01.png`,
          `${LB}/niponic-dreams/10-blusa-laco-pantalona/02.png`,
        ],
        productSlug: 'blusa-laco-pantalona-origami',
      },
      {
        number: 9,
        label: '09',
        name: 'Vestido Lg estampa digital',
        cover: `${LB}/niponic-dreams/12-vestido-mousseline-grafica/01.png`,
        images: [
          `${LB}/niponic-dreams/12-vestido-mousseline-grafica/01.png`,
          `${LB}/niponic-dreams/12-vestido-mousseline-grafica/02.png`,
        ],
        productSlug: 'vestido-longo-mousseline-grafica',
      },
      {
        number: 10,
        label: '10',
        name: 'Vestido longo radial',
        cover: `${LB}/niponic-dreams/09-vestido-longo-radial/01.png`,
        images: [
          `${LB}/niponic-dreams/09-vestido-longo-radial/01.png`,
          `${LB}/niponic-dreams/09-vestido-longo-radial/02.png`,
          `${LB}/niponic-dreams/09-vestido-longo-radial/03.png`,
        ],
        productSlug: 'vestido-longo-radial',
      },
      {
        number: 11,
        label: '11',
        name: 'Vestido Kimono cavalino',
        cover: `${LB}/niponic-dreams/13-vestido-kimono-cavalino/01.png`,
        images: [
          `${LB}/niponic-dreams/13-vestido-kimono-cavalino/01.png`,
          `${LB}/niponic-dreams/13-vestido-kimono-cavalino/02.png`,
          `${LB}/niponic-dreams/13-vestido-kimono-cavalino/03.png`,
        ],
        productSlug: 'vestido-longo-kimono-cavalino',
      },
      {
        number: 12,
        label: '12',
        name: 'Vestido Lg ideogramas',
        cover: `${LB}/niponic-dreams/11-vestido-ideogramas/01.png`,
        images: [
          `${LB}/niponic-dreams/11-vestido-ideogramas/01.png`,
          `${LB}/niponic-dreams/11-vestido-ideogramas/02.png`,
          `${LB}/niponic-dreams/11-vestido-ideogramas/03.png`,
        ],
        productSlug: 'vestido-longo-ideogramas',
      },
      {
        number: 13,
        label: '13',
        name: 'Vestido Lg borboletas',
        cover: `${LB}/niponic-dreams/19-vestido-georgette-borboletas/01.png`,
        images: [
          `${LB}/niponic-dreams/19-vestido-georgette-borboletas/01.png`,
          `${LB}/niponic-dreams/19-vestido-georgette-borboletas/02.png`,
        ],
        productSlug: 'vestido-longo-georgette-borboletas',
      },
      {
        number: 14,
        label: '14',
        name: 'Vestido Lg ondas e nós',
        cover: `${LB}/niponic-dreams/14-vestido-canvas-organza-origami/01.png`,
        images: [
          `${LB}/niponic-dreams/14-vestido-canvas-organza-origami/01.png`,
          `${LB}/niponic-dreams/14-vestido-canvas-organza-origami/02.png`,
        ],
        productSlug: 'vestido-longo-canvas-organza-origami',
      },
      {
        number: 15,
        label: '15',
        name: 'Vestido Explosion',
        cover: `${LB}/niponic-dreams/16-vestido-explosion-origamis/01.png`,
        images: [
          `${LB}/niponic-dreams/16-vestido-explosion-origamis/01.png`,
          `${LB}/niponic-dreams/16-vestido-explosion-origamis/02.png`,
          `${LB}/niponic-dreams/16-vestido-explosion-origamis/03.png`,
        ],
        productSlug: 'vestido-longo-explosion-origamis',
      },
      {
        number: 16,
        label: '16',
        name: 'Vestido paetês + capa',
        cover: `${LB}/niponic-dreams/15-vestido-capa-origami/01.png`,
        images: [
          `${LB}/niponic-dreams/15-vestido-capa-origami/01.png`,
          `${LB}/niponic-dreams/15-vestido-capa-origami/02.png`,
          `${LB}/niponic-dreams/15-vestido-capa-origami/03.png`,
        ],
        productSlug: 'vestido-capa-origami',
      },
      {
        number: 17,
        label: '17',
        name: 'Camiseta polo / bermuda',
        cover: `${LB}/niponic-dreams/04-look-4-polo-bermuda/01.png`,
        images: [
          `${LB}/niponic-dreams/04-look-4-polo-bermuda/01.png`,
          `${LB}/niponic-dreams/04-look-4-polo-bermuda/02.png`,
          `${LB}/niponic-dreams/04-look-4-polo-bermuda/03.png`,
        ],
        productSlug: 'look-4-polo-bermuda',
      },
      {
        number: 18,
        label: '18',
        name: 'Blazer branco / bermuda',
        cover: `${LB}/niponic-dreams/03-look-3-blazer-bermuda/01.png`,
        images: [
          `${LB}/niponic-dreams/03-look-3-blazer-bermuda/01.png`,
          `${LB}/niponic-dreams/03-look-3-blazer-bermuda/02.png`,
          `${LB}/niponic-dreams/03-look-3-blazer-bermuda/03.png`,
        ],
        productSlug: 'look-3-blazer-bermuda',
      },
      {
        number: 19,
        label: '19',
        name: 'Terno off-white',
        cover: `${LB}/niponic-dreams/06-look-8-terno-canvas/01.png`,
        images: [
          `${LB}/niponic-dreams/06-look-8-terno-canvas/01.png`,
        ],
        productSlug: 'look-8-terno-canvas',
      }
    ],
  },
  {
    slug: 'brazilian-dreams',
    collectionSlug: COLLECTION_SLUGS.brazilianDreams,
    title: 'Brazilian Dreams',
    looks: [
      {
        number: 1,
        label: '01',
        name: 'Colete / short / echarpe degradê',
        cover: `${LB}/brazilian-dreams/01-colete-bermuda-saia-echarpe/01.png`,
        images: [
          `${LB}/brazilian-dreams/01-colete-bermuda-saia-echarpe/01.png`,
          `${LB}/brazilian-dreams/01-colete-bermuda-saia-echarpe/02.png`,
        ],
        productSlug: 'colete-bermuda-saia-echarpe',
      },
      {
        number: 2,
        label: '02',
        name: 'Colete / pantalona / echarpe degradê',
        cover: `${LB}/brazilian-dreams/02-colete-patchwork-pantalona-echarpe/01.png`,
        images: [
          `${LB}/brazilian-dreams/02-colete-patchwork-pantalona-echarpe/01.png`,
          `${LB}/brazilian-dreams/02-colete-patchwork-pantalona-echarpe/02.png`,
        ],
        productSlug: 'colete-patchwork-pantalona-echarpe',
      },
      {
        number: 3,
        label: '03',
        name: 'Corset cestaria / saia estampada',
        cover: `${LB}/brazilian-dreams/03-corset-cestaria-saia-pump/01.png`,
        images: [
          `${LB}/brazilian-dreams/03-corset-cestaria-saia-pump/01.png`,
          `${LB}/brazilian-dreams/03-corset-cestaria-saia-pump/02.png`,
          `${LB}/brazilian-dreams/03-corset-cestaria-saia-pump/03.png`,
        ],
        productSlug: 'corset-cestaria-saia-pump',
      },
      {
        number: 4,
        label: '04',
        name: 'Camisa organza / bermuda IB',
        cover: `${LB}/brazilian-dreams/05-camisa-bermuda-grevileas/01.png`,
        images: [
          `${LB}/brazilian-dreams/05-camisa-bermuda-grevileas/01.png`,
          `${LB}/brazilian-dreams/05-camisa-bermuda-grevileas/02.png`,
          `${LB}/brazilian-dreams/05-camisa-bermuda-grevileas/03.png`,
        ],
        productSlug: 'camisa-bermuda-grevileas',
      },
      {
        number: 5,
        label: '05',
        name: 'Macacão estampado cetim',
        cover: `${LB}/brazilian-dreams/04-macacao-moulage-cetim-grevileas/01.png`,
        images: [
          `${LB}/brazilian-dreams/04-macacao-moulage-cetim-grevileas/01.png`,
          `${LB}/brazilian-dreams/04-macacao-moulage-cetim-grevileas/02.png`,
          `${LB}/brazilian-dreams/04-macacao-moulage-cetim-grevileas/03.png`,
        ],
        productSlug: 'macacao-moulage-cetim-grevileas',
      },
      {
        number: 6,
        label: '06',
        name: 'Blazer / bermuda bordado filé',
        cover: `${LB}/brazilian-dreams/06-maxi-blazer-bermuda-file/01.png`,
        images: [
          `${LB}/brazilian-dreams/06-maxi-blazer-bermuda-file/01.png`,
          `${LB}/brazilian-dreams/06-maxi-blazer-bermuda-file/02.png`,
        ],
        productSlug: 'maxi-blazer-bermuda-file',
      },
      {
        number: 7,
        label: '07',
        name: 'Jaqueta filé / shorts saia',
        cover: `${LB}/brazilian-dreams/07-jaqueta-file-shorts-canvas/01.png`,
        images: [
          `${LB}/brazilian-dreams/07-jaqueta-file-shorts-canvas/01.png`,
          `${LB}/brazilian-dreams/07-jaqueta-file-shorts-canvas/02.png`,
          `${LB}/brazilian-dreams/07-jaqueta-file-shorts-canvas/03.png`,
        ],
        productSlug: 'jaqueta-file-shorts-canvas',
      },
      {
        number: 8,
        label: '08',
        name: 'Vestido tubo filé',
        cover: `${LB}/brazilian-dreams/08-vestido-tubular-file/01.png`,
        images: [
          `${LB}/brazilian-dreams/08-vestido-tubular-file/01.png`,
          `${LB}/brazilian-dreams/08-vestido-tubular-file/02.png`,
        ],
        productSlug: 'vestido-tubular-file',
      },
      {
        number: 9,
        label: '09',
        name: 'Top pint Kaiapó / bermuda',
        cover: `${LB}/brazilian-dreams/09-top-kaiapo-bermuda/01.png`,
        images: [
          `${LB}/brazilian-dreams/09-top-kaiapo-bermuda/01.png`,
          `${LB}/brazilian-dreams/09-top-kaiapo-bermuda/02.png`,
        ],
        productSlug: 'top-kaiapo-bermuda',
      },
      {
        number: 10,
        label: '10',
        name: 'Macaquinho Kaiapó',
        cover: `${LB}/brazilian-dreams/10-macaquinho-kaiapo/01.png`,
        images: [
          `${LB}/brazilian-dreams/10-macaquinho-kaiapo/01.png`,
          `${LB}/brazilian-dreams/10-macaquinho-kaiapo/02.png`,
        ],
        productSlug: 'macaquinho-kaiapo',
      },
      {
        number: 11,
        label: '11',
        name: 'Vestido tubo Kaiapó',
        cover: `${LB}/brazilian-dreams/11-vestido-tubular-kaiapo/01.png`,
        images: [
          `${LB}/brazilian-dreams/11-vestido-tubular-kaiapo/01.png`,
        ],
        productSlug: 'vestido-tubular-kaiapo',
      },
      {
        number: 12,
        label: '12',
        name: 'Top plumário preto / calça',
        cover: `${LB}/brazilian-dreams/12-top-sfilaciatta-calca-slean/01.png`,
        images: [
          `${LB}/brazilian-dreams/12-top-sfilaciatta-calca-slean/01.png`,
          `${LB}/brazilian-dreams/12-top-sfilaciatta-calca-slean/02.png`,
        ],
        productSlug: 'top-sfilaciatta-calca-slean',
      },
      {
        number: 13,
        label: '13',
        name: 'Blazer / saia plumaria',
        cover: `${LB}/brazilian-dreams/13-mini-blazer-saia-sfilaciatta/01.png`,
        images: [
          `${LB}/brazilian-dreams/13-mini-blazer-saia-sfilaciatta/01.png`,
          `${LB}/brazilian-dreams/13-mini-blazer-saia-sfilaciatta/02.png`,
          `${LB}/brazilian-dreams/13-mini-blazer-saia-sfilaciatta/03.png`,
        ],
        productSlug: 'mini-blazer-saia-sfilaciatta',
      },
      {
        number: 14,
        label: '14',
        name: 'Jaqueta plumaria acqua',
        cover: `${LB}/brazilian-dreams/14-jaqueta-sfilaciatta-pantalona-acqua/01.png`,
        images: [
          `${LB}/brazilian-dreams/14-jaqueta-sfilaciatta-pantalona-acqua/01.png`,
          `${LB}/brazilian-dreams/14-jaqueta-sfilaciatta-pantalona-acqua/02.png`,
          `${LB}/brazilian-dreams/14-jaqueta-sfilaciatta-pantalona-acqua/03.png`,
          `${LB}/brazilian-dreams/14-jaqueta-sfilaciatta-pantalona-acqua/04.png`,
        ],
        productSlug: 'jaqueta-sfilaciatta-pantalona-acqua',
      },
      {
        number: 15,
        label: '15',
        name: 'Jaqueta plumaria degradê',
        cover: `${LB}/brazilian-dreams/15-jaqueta-sfilaciatta-degrade/01.png`,
        images: [
          `${LB}/brazilian-dreams/15-jaqueta-sfilaciatta-degrade/01.png`,
          `${LB}/brazilian-dreams/15-jaqueta-sfilaciatta-degrade/02.png`,
          `${LB}/brazilian-dreams/15-jaqueta-sfilaciatta-degrade/03.png`,
        ],
        productSlug: 'jaqueta-sfilaciatta-degrade',
      },
      {
        number: 16,
        label: '16',
        name: 'Vestido nude / preto plumaria',
        cover: `${LB}/brazilian-dreams/16-vestido-sfilaciatta-plumaria/01.png`,
        images: [
          `${LB}/brazilian-dreams/16-vestido-sfilaciatta-plumaria/01.png`,
          `${LB}/brazilian-dreams/16-vestido-sfilaciatta-plumaria/02.png`,
        ],
        productSlug: 'vestido-sfilaciatta-plumaria',
      },
      {
        number: 17,
        label: '17',
        name: 'Terno Sand / polo',
        cover: `${LB}/brazilian-dreams/17-terno-doppiopetto-canhamo/01.png`,
        images: [
          `${LB}/brazilian-dreams/17-terno-doppiopetto-canhamo/01.png`,
        ],
        productSlug: 'terno-doppiopetto-canhamo',
      }
    ],
  },
];

export function getLookbook(slug: string): LookbookCollection | undefined {
  return LOOKBOOKS.find((b) => b.slug === slug);
}

export function hasLookbook(slug: string): boolean {
  const book = getLookbook(slug);
  return !!book && book.looks.length > 0;
}
