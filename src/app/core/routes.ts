/**
 * Single source of truth for app paths.
 * Use these helpers in templates/components instead of string literals.
 * Route tree in `app.routes.ts` should consume the same PATH segments.
 */

/** Path segments (no leading slash) — for Angular `Routes` defs */
export const PATH = {
  home: '',
  about: 'about',
  product: 'produto',
  collection: 'colecao',
  category: 'categoria',
  cart: 'carrinho',
  checkout: 'checkout',
  legal: 'legal',
  account: 'conta',
  /** Coming-soon Alta Costura landing */
  altaCostura: 'alta-costura',
  /** Editorial runway hub */
  desfiles: 'desfiles',
  /** Editorial lookbook hub */
  lookbook: 'lookbook',
  /** Account wishlist — Portuguese boutique path */
  wishlist: 'conta/favoritos',
  /** Customer order history */
  orders: 'conta/pedidos',
  /** Customer auth — checkout requires login */
  login: 'conta/entrar',
  register: 'conta/cadastro',
  /** Lacoste-style gender hubs — “Ver tudo” feminino / masculino */
  feminino: 'feminino',
  masculino: 'masculino',
  /** Editorial art gallery */
  arte: 'arte',
  /** Jewelry — joias */
  joias: 'joias',
  /** Local product admin (dev) */
  admin: 'admin',
  /** Legacy PLP — keep until collection URLs fully migrate */
  femininoNovidades: 'feminino/novidades',
} as const;

export type GenderSlug = 'feminino' | 'masculino';

/** Resolve gender hub from a router URL (path + query). */
export function genderFromUrl(url: string): GenderSlug | null {
  const path = (url.split('?')[0] ?? '').split('#')[0] ?? '';
  if (path.startsWith('/masculino')) return 'masculino';
  if (path.startsWith('/feminino')) return 'feminino';
  try {
    const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    const params = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q);
    const c = params.get('categoria');
    if (c === 'masculino' || c === 'feminino') return c;
  } catch {
    /* ignore malformed URLs */
  }
  return null;
}

/**
 * When false, Alta Costura stays out of public nav (routes remain).
 * Currently public as “Em breve” ArtCouture landing.
 */
export const ALTA_COSTURA_PUBLIC = true;

/** Absolute path strings (leading slash) — for routerLink / href */
export const ROUTES = {
  home: '/',
  about: `/${PATH.about}`,
  altaCostura: `/${PATH.altaCostura}`,
  /** Desfiles hub — Organic / Niponic / Brazilian films */
  desfiles: `/${PATH.desfiles}`,
  /** Lookbook hub — pick a collection */
  lookbook: `/${PATH.lookbook}`,
  feminino: `/${PATH.feminino}`,
  masculino: `/${PATH.masculino}`,
  arte: `/${PATH.arte}`,
  joias: `/${PATH.joias}`,
  femininoNovidades: `/${PATH.femininoNovidades}`,
  cart: `/${PATH.cart}`,
  checkout: `/${PATH.checkout}`,
  account: `/${PATH.account}`,
  wishlist: `/${PATH.wishlist}`,
  orders: `/${PATH.orders}`,
  login: `/${PATH.login}`,
  register: `/${PATH.register}`,
  admin: `/${PATH.admin}`,
  adminProducts: `/${PATH.admin}/produtos`,
  adminJoias: `/${PATH.admin}/joias`,
  adminCollections: `/${PATH.admin}/colecoes`,
} as const;

export function adminProductPath(slug: string): string {
  return `${ROUTES.adminProducts}/${slug}`;
}

export function adminJoiaPath(slug: string): string {
  return `${ROUTES.adminJoias}/${slug}`;
}

export function adminCollectionPath(slug: string): string {
  return `${ROUTES.adminCollections}/${slug}`;
}

export const ADMIN_NEW_PRODUCT_SLUG = 'novo';
export const ADMIN_NEW_JOIA_SLUG = 'nova';
export const ADMIN_NEW_COLLECTION_SLUG = 'nova';

/** Query param on `/admin/produtos/novo` to pre-fill collection (Phase 4b → products form). */
export const ADMIN_PRODUCT_COLLECTION_QUERY = 'colecao';

export function adminNewProductPath(collectionSlug?: string): string {
  const base = adminProductPath(ADMIN_NEW_PRODUCT_SLUG);
  if (!collectionSlug) return base;
  return `${base}?${ADMIN_PRODUCT_COLLECTION_QUERY}=${encodeURIComponent(collectionSlug)}`;
}

export function adminNewJoiaPath(): string {
  return adminJoiaPath(ADMIN_NEW_JOIA_SLUG);
}

export function adminNewCollectionPath(): string {
  return adminCollectionPath(ADMIN_NEW_COLLECTION_SLUG);
}

/** Known collection slugs (URL-safe) */
export const COLLECTION_SLUGS = {
  organicDreams: 'organic-dreams',
  niponicDreams: 'niponic-dreams',
  brazilianDreams: 'brazilian-dreams',
} as const;

export type CollectionSlug =
  (typeof COLLECTION_SLUGS)[keyof typeof COLLECTION_SLUGS];

/** About page section fragments (must match element `id`s) */
export const ABOUT_FRAGMENTS = {
  marca: 'marca',
  criador: 'criador',
  casa: 'casa',
  tecido: 'tecido',
  pilares: 'pilares',
} as const;

export type AboutFragment =
  (typeof ABOUT_FRAGMENTS)[keyof typeof ABOUT_FRAGMENTS];

/** Builders — prefer these over string concat */
export function productPath(slug: string): string {
  return `/${PATH.product}/${slug}`;
}

export function collectionPath(slug: CollectionSlug | string): string {
  return `/${PATH.collection}/${slug}`;
}

export function categoryPath(slug: string): string {
  return `/${PATH.category}/${slug}`;
}

/** Legacy gender path — bare `/feminino` · `/masculino` redirect to home + categoria. */
export function genderPath(slug: GenderSlug): string {
  return slug === 'masculino' ? ROUTES.masculino : ROUTES.feminino;
}

/** RTW listing by gender — `/feminino/vestidos` · `/masculino/calcas` */
export function genderRtwPath(gender: GenderSlug, tipo: string): string {
  return `${genderPath(gender)}/${tipo}`;
}

export function aboutPath(fragment?: AboutFragment | string): string {
  return fragment ? `${ROUTES.about}#${fragment}` : ROUTES.about;
}

export function legalPath(page: 'privacidade' | 'termos' | 'cookies'): string {
  return `/${PATH.legal}/${page}`;
}

/** Runway editorial — `/desfiles/:slug` */
export function desfilePath(slug: string): string {
  return `${ROUTES.desfiles}/${slug}`;
}

/** Collection lookbook — `/lookbook/:slug` */
export function lookbookPath(slug: string): string {
  return `${ROUTES.lookbook}/${slug}`;
}

/** Single look detail — `/lookbook/:slug/look-N` */
export function lookPath(slug: string, lookNumber: number): string {
  return `${lookbookPath(slug)}/look-${lookNumber}`;
}

/** Art gallery — `/arte` or `/arte/:slug` */
export function artePath(slug?: string): string {
  return slug ? `${ROUTES.arte}/${slug}` : ROUTES.arte;
}

/** Jewelry — `/joias` */
export function joiasPath(): string {
  return ROUTES.joias;
}

/** Commands for `[routerLink]` + optional `[fragment]` */
export function aboutLink(
  fragment?: AboutFragment | string,
): { route: string; fragment?: string } {
  return fragment
    ? { route: ROUTES.about, fragment }
    : { route: ROUTES.about };
}
