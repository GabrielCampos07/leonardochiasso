const MEDIA = 'assets/media/alta-costura/artcouture';

export interface ArtCoutureShot {
  src: string;
  alt: string;
}

export interface ArtCoutureWearer {
  id: string;
  name: string;
  /** Small mark beside the name — same treatment as ArtCouture next to the logo. */
  role?: string;
  /** Optional line under the name — atelier note. */
  note?: string;
  shots: ArtCoutureShot[];
}

export const ARTCOUTURE_WEARERS: ArtCoutureWearer[] = [
  {
    id: 'sandra-chiasso',
    name: 'Sandra Chiasso',
    role: 'Mãe do noivo',
    shots: [
      {
        src: `${MEDIA}/sandra-chiasso/frente.png`,
        alt: 'Sandra Chiasso de frente, vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/direita.png`,
        alt: 'Sandra Chiasso de perfil direito, vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/esquerda.png`,
        alt: 'Sandra Chiasso de perfil esquerdo, vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/costas.png`,
        alt: 'Sandra Chiasso de costas, vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/retrato.png`,
        alt: 'Sandra Chiasso, retrato no vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/cima.png`,
        alt: 'Sandra Chiasso, vista de cima no vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/corredor.png`,
        alt: 'Sandra Chiasso no corredor, vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/recepcao.png`,
        alt: 'Sandra Chiasso na recepção, vestido ArtCouture vermelho',
      },
      {
        src: `${MEDIA}/sandra-chiasso/detalhe.png`,
        alt: 'Detalhe do vestido vermelho ArtCouture com colar de pérolas',
      },
    ],
  },
  {
    id: 'sandra-machado-leis',
    name: 'Sandra Machado Leis',
    role: 'Bodas de ouro',
    shots: [
      {
        src: `${MEDIA}/sandra-machado-leis/frente.png`,
        alt: 'Sandra Machado Leis de frente, vestido ArtCouture dourado nas bodas de ouro',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/perfil.png`,
        alt: 'Sandra Machado Leis de perfil, vestido ArtCouture dourado',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/costas.png`,
        alt: 'Sandra Machado Leis de costas, vestido ArtCouture dourado',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/prova.png`,
        alt: 'Prova do vestido ArtCouture dourado de Sandra Machado Leis',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/prova-espelho.png`,
        alt: 'Prova do vestido ArtCouture no espelho, Sandra Machado Leis',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/atelier.png`,
        alt: 'Sandra Machado Leis no atelier com o vestido ArtCouture dourado',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/danca.png`,
        alt: 'Sandra Machado Leis dançando nas bodas de ouro, vestido ArtCouture',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/familia.png`,
        alt: 'Sandra Machado Leis com a família nas bodas de ouro, vestido ArtCouture',
      },
      {
        src: `${MEDIA}/sandra-machado-leis/ombro.png`,
        alt: 'Sandra Machado Leis, vestido ArtCouture ombré coral de um ombro só',
      },
    ],
  },
  {
    id: 'sandra-costa',
    name: 'Sandra Costa',
    shots: [
      {
        src: `${MEDIA}/sandra-costa/frente.png`,
        alt: 'Sandra Costa de frente, vestido ArtCouture creme de tule',
      },
      {
        src: `${MEDIA}/sandra-costa/costas.png`,
        alt: 'Sandra Costa de costas, vestido ArtCouture creme de tule',
      },
      {
        src: `${MEDIA}/sandra-costa/tres-quartos.png`,
        alt: 'Sandra Costa em três quartos, vestido ArtCouture creme de tule',
      },
      {
        src: `${MEDIA}/sandra-costa/cortejo.png`,
        alt: 'Sandra Costa no cortejo, vestido ArtCouture creme de tule',
      },
    ],
  },
  {
    id: 'jeanete-roizaman',
    name: 'Jeanete Roizman',
    shots: [
      {
        src: `${MEDIA}/jeanete-roizaman/frente.png`,
        alt: 'Jeanete Roizaman de frente, vestido ArtCouture creme assimétrico',
      },
      {
        src: `${MEDIA}/jeanete-roizaman/tres-quartos.png`,
        alt: 'Jeanete Roizaman em três quartos, vestido ArtCouture creme',
      },
      {
        src: `${MEDIA}/jeanete-roizaman/costas.png`,
        alt: 'Jeanete Roizaman de costas, vestido ArtCouture creme',
      },
      {
        src: `${MEDIA}/jeanete-roizaman/interior.png`,
        alt: 'Jeanete Roizaman com vestido ArtCouture creme e clutch dourada',
      },
      {
        src: `${MEDIA}/jeanete-roizaman/retrato.png`,
        alt: 'Jeanete Roizaman, retrato no vestido ArtCouture de pregas',
      },
      {
        src: `${MEDIA}/jeanete-roizaman/atelier.png`,
        alt: 'Jeanete Roizaman no atelier com Leonardo Chiasso',
      },
    ],
  },
  {
    id: 'clarice-magalhães',
    name: 'Clarice Magalhães',
    shots: [
      {
        src: `${MEDIA}/maria-do-rosario/perfil.png`,
        alt: 'Maria do Rosario de perfil, vestido ArtCouture verde-menta',
      },
      {
        src: `${MEDIA}/maria-do-rosario/frente.png`,
        alt: 'Maria do Rosario de frente, vestido ArtCouture verde-menta',
      },
      {
        src: `${MEDIA}/maria-do-rosario/evento.png`,
        alt: 'Maria do Rosario com Leonardo Chiasso, vestido ArtCouture verde-menta',
      },
      {
        src: `${MEDIA}/maria-do-rosario/hall.png`,
        alt: 'Maria do Rosario no hall, vestido ArtCouture verde-menta',
      },
    ],
  },
  {
    id: 'dra-tatianne',
    name: 'Juliana e Tatiana Erhardt',
    shots: [
      {
        src: `${MEDIA}/dra-tatianne/ju-frente.png`,
        alt: 'Ju Erhardt de frente, vestido ArtCouture off-white de babados',
      },
      {
        src: `${MEDIA}/dra-tatianne/ju-tres-quartos.png`,
        alt: 'Ju Erhardt em três quartos, vestido ArtCouture off-white de babados',
      },
      {
        src: `${MEDIA}/dra-tatianne/ju-costas.png`,
        alt: 'Ju Erhardt de costas, vestido ArtCouture off-white de babados',
      },
      {
        src: `${MEDIA}/dra-tatianne/01.png`,
        alt: 'Dra. Tatianne na porta, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/02.png`,
        alt: 'Dra. Tatianne com buquê, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/03.png`,
        alt: 'Aliança na cerimônia, vestido de noiva ArtCouture da Dra. Tatianne',
      },
      {
        src: `${MEDIA}/dra-tatianne/04.png`,
        alt: 'Dra. Tatianne na festa, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/05.png`,
        alt: 'Dra. Tatianne na igreja, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/06.png`,
        alt: 'Dra. Tatianne e o noivo na igreja, vestido ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/07.png`,
        alt: 'Dra. Tatianne saindo da igreja, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/08.png`,
        alt: 'Dra. Tatianne na recepção, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/09.png`,
        alt: 'Dra. Tatianne no brinde, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/10.png`,
        alt: 'Dra. Tatianne na recepção, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/dra-tatianne/11.png`,
        alt: 'Dra. Tatianne com a família, vestido de noiva ArtCouture',
      },
    ],
  },
  {
    id: 'cristina-guardia',
    name: 'Cristina Guardia',
    shots: [
      {
        src: `${MEDIA}/cristina-guardia/evento.png`,
        alt: 'Cristina Guardia no evento, vestido ArtCouture de pétalas',
      },
      {
        src: `${MEDIA}/cristina-guardia/01.png`,
        alt: 'Cristina Guardia de frente, vestido ArtCouture de pétalas',
      },
      {
        src: `${MEDIA}/cristina-guardia/02.png`,
        alt: 'Cristina Guardia de costas, vestido ArtCouture de pétalas',
      },
      {
        src: `${MEDIA}/cristina-guardia/03.png`,
        alt: 'Cristina Guardia, retrato no vestido ArtCouture de pétalas',
      },
      {
        src: `${MEDIA}/cristina-guardia/04.png`,
        alt: 'Cristina Guardia no evento, vestido ArtCouture de pétalas',
      },
    ],
  },
  {
    id: 'isabella-marar-santoyo',
    name: 'Isabella Marar Santoyo',
    role: 'Noiva',
    note: 'Vestidos da noiva, das mães dos noivos de nossa autoria',
    shots: [
      {
        src: `${MEDIA}/isabella-marar-santoyo/01.png`,
        alt: 'Isabella Marar Santoyo no corredor, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/isabella-marar-santoyo/02.png`,
        alt: 'Isabella Marar Santoyo de frente, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/isabella-marar-santoyo/03.png`,
        alt: 'Isabella Marar Santoyo na igreja, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/isabella-marar-santoyo/04.png`,
        alt: 'Isabella Marar Santoyo de perfil, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/isabella-marar-santoyo/05.png`,
        alt: 'Isabella Marar Santoyo de costas, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/isabella-marar-santoyo/06.png`,
        alt: 'Isabella Marar Santoyo na festa, vestido de noiva ArtCouture',
      },
      {
        src: `${MEDIA}/isabella-marar-santoyo/07.png`,
        alt: 'Isabella Marar Santoyo com as mães e a morena, vestidos ArtCouture',
      },
    ],
  },
  {
    id: 'christy',
    name: 'Christy',
    role: 'Fadil Berisha Studio',
    shots: [
      {
        src: `${MEDIA}/new-york-studio/01.png`,
        alt: 'Christy — vestido ArtCouture vermelho de rosas, Fadil Berisha Studio',
      },
      {
        src: `${MEDIA}/new-york-studio/03.png`,
        alt: 'Christy — vestido ArtCouture amarelo com rosetas, Fadil Berisha Studio',
      },
      {
        src: `${MEDIA}/new-york-studio/04.png`,
        alt: 'Christy — vestido ArtCouture preto, branco e champanhe, Fadil Berisha Studio',
      },
      {
        src: `${MEDIA}/new-york-studio/05.png`,
        alt: 'Christy — vestido ArtCouture de camadas com broche, Fadil Berisha Studio',
      },
      {
        src: `${MEDIA}/new-york-studio/06.png`,
        alt: 'Christy — vestido ArtCouture champanhe de babados, Fadil Berisha Studio',
      },
      {
        src: `${MEDIA}/new-york-studio/08.png`,
        alt: 'Christy — vestido ArtCouture com colar dourado, Fadil Berisha Studio',
      },
    ],
  },
  {
    id: 'eve-julian',
    name: 'Eve Julian',
    role: 'Fadil Berisha Studio',
    shots: [
      {
        src: `${MEDIA}/new-york-studio/02.png`,
        alt: 'Eve Julian — vestido ArtCouture amarelo com fenda, Fadil Berisha Studio',
      },
      {
        src: `${MEDIA}/new-york-studio/07.png`,
        alt: 'Eve Julian — vestido ArtCouture vermelho floral, Fadil Berisha Studio',
      },
    ],
  },
];
