import { MegaKey, NavActive } from './chrome.service';
import { CONTACT_EMAILS } from './brand-lines';
import {
  ABOUT_FRAGMENTS,
  ALTA_COSTURA_PUBLIC,
  COLLECTION_SLUGS,
  CollectionSlug,
  ROUTES,
  aboutLink,
  collectionPath,
  genderRtwPath,
  legalPath,
} from './routes';
import { RtwType, rtwLabel } from './rtw';

/** Header desktop nav */
export interface HeaderNavItem {
  key: string;
  label: string;
  mega: MegaKey;
  route: string | null;
  queryParams?: Record<string, string>;
  fragment?: string;
  active: NavActive | null;
}

export const HEADER_NAV: HeaderNavItem[] = [
  {
    key: 'feminino',
    label: 'FEMININO',
    mega: 'feminino',
    route: ROUTES.home,
    queryParams: { categoria: 'feminino' },
    fragment: 'colecoes',
    active: 'feminino',
  },
  {
    key: 'masculino',
    label: 'MASCULINO',
    mega: 'masculino',
    route: ROUTES.home,
    queryParams: { categoria: 'masculino' },
    fragment: 'colecoes',
    active: 'masculino',
  },
  { key: 'joia', label: 'JÓIA', mega: null, route: ROUTES.joias, active: 'joias' },
  {
    key: 'arte',
    label: 'ARTE',
    mega: null,
    route: ROUTES.arte,
    active: 'arte',
  },
  { key: 'casa', label: 'CASA', mega: 'casa', route: null, active: null },
  {
    key: 'alta-costura',
    label: 'ALTA COSTURA',
    mega: null,
    route: ROUTES.altaCostura,
    active: null,
  },
  { key: 'about', label: 'ABOUT', mega: null, route: ROUTES.about, active: 'about' },
];

/** Collection lines — shared by mega, footer, mobile, about */
export interface CollectionNavItem {
  label: string;
  slug: CollectionSlug;
  route: string;
}

export const COLLECTION_NAV: CollectionNavItem[] = [
  {
    label: 'Organic Dreams',
    slug: COLLECTION_SLUGS.organicDreams,
    route: collectionPath(COLLECTION_SLUGS.organicDreams),
  },
  {
    label: 'Niponic Dreams',
    slug: COLLECTION_SLUGS.niponicDreams,
    route: collectionPath(COLLECTION_SLUGS.niponicDreams),
  },
  {
    label: 'Brazilian Dreams',
    slug: COLLECTION_SLUGS.brazilianDreams,
    route: collectionPath(COLLECTION_SLUGS.brazilianDreams),
  },
];

export interface NavLink {
  label: string;
  /** Router path; null = stub / coming soon */
  route: string | null;
  queryParams?: Record<string, string>;
  fragment?: string;
  external?: boolean;
}

export interface MegaColumn {
  /** Column heading; omit or empty for a solo featured link */
  title?: string;
  /** Single highlighted entry (no column title) */
  featured?: boolean;
  links: NavLink[];
}

export interface MegaMenuConfig {
  columns: MegaColumn[];
}

/** RTW links — gender hub `/feminino|masculino/:tipo` (all collections). */
function rtwLink(
  tipo: RtwType,
  opts: {
    category: 'feminino' | 'masculino';
    stub?: boolean;
  },
): NavLink {
  const label = rtwLabel(tipo, opts.category);
  if (opts.stub) {
    return { label, route: null };
  }
  return {
    label,
    route: genderRtwPath(opts.category, tipo),
  };
}

const FEMININO_RTW_LINKS: NavLink[] = [
  rtwLink('vestidos', { category: 'feminino' }),
  rtwLink('calcas', { category: 'feminino' }),
  rtwLink('casacos', { category: 'feminino' }),
  rtwLink('camisas', { category: 'feminino' }),
];

const MASCULINO_RTW_LINKS: NavLink[] = [
  rtwLink('calcas', { category: 'masculino' }),
  rtwLink('casacos', { category: 'masculino' }),
  rtwLink('camisas', { category: 'masculino', stub: true }),
];

function shopMega(
  _label: string,
  rtwLinks: NavLink[],
  opts?: { category?: 'feminino' | 'masculino' },
): MegaMenuConfig {
  const category = opts?.category;
  const categoryParams = category ? { categoria: category } : undefined;
  return {
    columns: [
      {
        featured: true,
        links: [
          {
            label: 'Lookbook',
            route: ROUTES.lookbook,
            queryParams: categoryParams,
          },
        ],
      },
      { title: 'Produtos', links: rtwLinks },
      {
        title: 'Coleções',
        links: COLLECTION_NAV.map((c) => ({
          label: c.label,
          route: c.route,
          queryParams: categoryParams,
        })),
      },
    ],
  };
}

export const MEGA_MENUS: Partial<Record<Exclude<MegaKey, null>, MegaMenuConfig>> = {
  feminino: shopMega('Feminino', FEMININO_RTW_LINKS, { category: 'feminino' }),
  masculino: shopMega('Masculino', MASCULINO_RTW_LINKS, { category: 'masculino' }),
};

export const MEGA_STUB_TITLES: Partial<Record<Exclude<MegaKey, null>, string>> = {
  joia: 'JÓIA',
  arte: 'ARTE',
  casa: 'CASA',
};

/** Mobile sheet */
export interface MobileNavLink {
  label: string;
  route: string | null;
  queryParams?: Record<string, string>;
  fragment?: string;
  active?: NavActive;
}

export interface MobileNavGroup {
  label: string;
  open?: boolean;
  links: MobileNavLink[];
  /** Same destination as the desktop header item, when the group title is tapped. */
  route?: string | null;
  queryParams?: Record<string, string>;
  fragment?: string;
  active?: NavActive;
}

export interface MobileNavItem {
  type: 'link' | 'group';
  link?: MobileNavLink;
  group?: MobileNavGroup;
}

export const MOBILE_NAV: MobileNavItem[] = [
  {
    type: 'group',
    group: {
      label: 'FEMININO',
      open: true,
      route: ROUTES.home,
      queryParams: { categoria: 'feminino' },
      fragment: 'colecoes',
      active: 'feminino',
      links: [
        {
          label: 'Coleções',
          route: ROUTES.home,
          queryParams: { categoria: 'feminino' },
          fragment: 'colecoes',
          active: 'feminino',
        },
        {
          label: 'Lookbook',
          route: ROUTES.lookbook,
          queryParams: { categoria: 'feminino' },
          active: 'feminino',
        },
        {
          label: 'Calças e Shorts',
          route: genderRtwPath('feminino', 'calcas'),
          active: 'feminino',
        },
        {
          label: 'Blazers',
          route: genderRtwPath('feminino', 'casacos'),
          active: 'feminino',
        },
        ...COLLECTION_NAV.map((c) => ({
          label: c.label,
          route: c.route,
          queryParams: { categoria: 'feminino' },
          active: 'feminino' as NavActive,
        })),
      ],
    },
  },
  {
    type: 'group',
    group: {
      label: 'MASCULINO',
      route: ROUTES.home,
      queryParams: { categoria: 'masculino' },
      fragment: 'colecoes',
      active: 'masculino',
      links: [
        {
          label: 'Coleções',
          route: ROUTES.home,
          queryParams: { categoria: 'masculino' },
          fragment: 'colecoes',
          active: 'masculino',
        },
        {
          label: 'Lookbook',
          route: ROUTES.lookbook,
          queryParams: { categoria: 'masculino' },
          active: 'masculino',
        },
        {
          label: 'Calças e Shorts',
          route: genderRtwPath('masculino', 'calcas'),
          active: 'masculino',
        },
        {
          label: 'Blazers',
          route: genderRtwPath('masculino', 'casacos'),
          active: 'masculino',
        },
        ...COLLECTION_NAV.map((c) => ({
          label: c.label,
          route: c.route,
          queryParams: { categoria: 'masculino' },
          active: 'masculino' as NavActive,
        })),
      ],
    },
  },
  { type: 'link', link: { label: 'JÓIA', route: ROUTES.joias, active: 'joias' } },
  {
    type: 'link',
    link: { label: 'ARTE', route: ROUTES.arte, active: 'arte' },
  },
  { type: 'link', link: { label: 'CASA', route: null } },
  {
    type: 'link' as const,
    link: { label: 'ALTA COSTURA', route: ROUTES.altaCostura },
  },
  {
    type: 'link',
    link: { label: 'ABOUT', route: ROUTES.about, active: 'about' },
  },
];

/** Footer columns */
export const FOOTER_LINKS = {
  atendimento: [
    {
      label: 'Contato',
      route: `mailto:${CONTACT_EMAILS.geral.email}`,
      external: true,
    },
    {
      label: 'ArtCouture',
      route: `mailto:${CONTACT_EMAILS.artCouture.email}`,
      external: true,
    },
    {
      label: 'Uomo',
      route: `mailto:${CONTACT_EMAILS.uomo.email}`,
      external: true,
    },
    {
      label: 'Donna',
      route: `mailto:${CONTACT_EMAILS.donna.email}`,
      external: true,
    },
    {
      label: 'Arte',
      route: `mailto:${CONTACT_EMAILS.arte.email}`,
      external: true,
    },
    { label: 'Guia de tamanhos', route: null },
    { label: 'Atelier', ...aboutLink(ABOUT_FRAGMENTS.criador) },
  ] as NavLink[],
  colecoes: [
    ...COLLECTION_NAV.map((c) => ({
      label: c.label,
      route: c.route,
    })),
    ...(ALTA_COSTURA_PUBLIC
      ? [{ label: 'Alta Costura', route: ROUTES.altaCostura }]
      : []),
  ] as NavLink[],
  /** Legal pages */
  legal: [
    { label: 'Privacidade', route: legalPath('privacidade') },
    { label: 'Termos', route: legalPath('termos') },
    { label: 'Cookies', route: legalPath('cookies') },
  ] as NavLink[],
  redes: [
    {
      label: 'Instagram',
      route: 'https://www.instagram.com/leochiasso/',
      external: true,
    },
    {
      label: 'LinkedIn',
      route: 'https://www.linkedin.com/',
      external: true,
    },
  ] as NavLink[],
};

/** About page hero anchors — IDs must match ABOUT_FRAGMENTS / section `id`s */
export const ABOUT_ANCHORS = [
  { id: ABOUT_FRAGMENTS.marca, label: 'UMA MARCA LENDÁRIA' },
  { id: ABOUT_FRAGMENTS.criador, label: 'O CRIADOR' },
  { id: ABOUT_FRAGMENTS.casa, label: 'A CASA' },
  { id: ABOUT_FRAGMENTS.pilares, label: 'PILARES' },
  { id: ABOUT_FRAGMENTS.tecido, label: 'O TECIDO' },
] as const;

export const ABOUT_MORE_LINKS: NavLink[] = [
  ...COLLECTION_NAV.map((c) => ({ label: c.label, route: c.route })),
  { label: 'Atelier', ...aboutLink(ABOUT_FRAGMENTS.criador) },
];
