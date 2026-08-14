/** Italian collection lines — page branding (not nav labels). */

import { GenderSlug } from './routes';

export const BRAND_LINES = {
  gioielli: {
    eyebrow: 'Leonardo Chiasso',
    title: 'Gioielli',
    lede: 'Peças feitas sob medida — joalheria exclusiva, matéria e presença.',
  },
  artCouture: {
    eyebrow: 'Leonardo Chiasso',
    title: 'ArtCouture',
    lede: 'Alta costura e peças sob medida diretamente para você.',
  },
  uomo: {
    eyebrow: 'Leonardo Chiasso',
    title: 'Uomo',
    lede: 'Peças masculinas das coleções.',
  },
  donna: {
    eyebrow: 'Leonardo Chiasso',
    title: 'Donna',
    lede: 'Peças femininas das coleções.',
  },
  arte: {
    eyebrow: 'Leonardo Chiasso',
    title: 'Arte',
    lede: 'Mosaicos e obras — presença quieta entre moda e pintura.',
  },
  casa: {
    eyebrow: 'Leonardo Chiasso',
    title: 'Casa',
    lede: 'Em breve.',
  },
} as const;

export function brandLineForGender(g: GenderSlug | null | undefined) {
  if (g === 'masculino') return BRAND_LINES.uomo;
  if (g === 'feminino') return BRAND_LINES.donna;
  return null;
}

/** Short mark beside the logo in the header (contextual). */
export function headerBrandMark(opts: {
  url: string;
  navActive: string;
  mega: string | null;
}): string | null {
  const path = opts.url.split('?')[0] ?? opts.url;
  const q = opts.url.includes('?') ? opts.url.slice(opts.url.indexOf('?')) : '';

  if (path.startsWith('/joias') || opts.navActive === 'joias' || opts.mega === 'joia') {
    return 'GIOIELLI';
  }
  if (
    path.startsWith('/alta-costura') ||
    path.startsWith('/desfiles') ||
    path.startsWith('/lookbook')
  ) {
    return 'ARTCOUTURE';
  }
  if (path.startsWith('/arte') || opts.navActive === 'arte' || opts.mega === 'arte') {
    return 'ARTE';
  }
  if (
    opts.navActive === 'masculino' ||
    opts.mega === 'masculino' ||
    path.startsWith('/masculino') ||
    q.includes('categoria=masculino')
  ) {
    return 'UOMO';
  }
  if (
    opts.navActive === 'feminino' ||
    opts.mega === 'feminino' ||
    path.startsWith('/feminino') ||
    q.includes('categoria=feminino')
  ) {
    return 'DONNA';
  }
  if (opts.mega === 'casa') {
    return 'CASA';
  }
  return null;
}

/** Contact mailboxes (create on Hostinger / Google Workspace + MX). */
export const CONTACT_EMAILS = {
  geral: {
    label: 'Contatos em geral',
    email: 'Contact@leonardochiasso.com',
  },
  artCouture: {
    label: 'Alta costura',
    email: 'ArtCouture@leonardochiasso.com',
  },
  uomo: {
    label: 'Masculino',
    email: 'Uomo@leonardochiasso.com',
  },
  donna: {
    label: 'Feminino',
    email: 'Donna@leonardochiasso.com',
  },
  arte: {
    label: 'Artes',
    email: 'Arte@leonardochiasso.com',
  },
} as const;

export const CONTACT_EMAIL_LIST = Object.values(CONTACT_EMAILS);
