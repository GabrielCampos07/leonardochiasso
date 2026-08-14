/**
 * Canonical "Recomendados" order within each collection (feminino first, then masculino).
 * Lower number = higher in PLP. Slugs not listed fall to the end (9990+).
 *
 * Source: brand list (Organic / Niponic / Brazilian Dreams), Aug 2026.
 */

/** Organic Dreams — feminino (brand #10 calça seca degrau = piece of mini-blazer-basque, not standalone) */
const ORGANIC: string[] = [
  'vestido-assimetrico-rasgo', // 1 Vestido Lg Assimétrico
  'vestido-longo-bateau', // 2 Vestido Lg Bateau
  'vestido-geo', // 3 Vestido Geo
  'trench-coat', // 4 Trench Coat
  'mini-blazer-basque', // 5 Mini Blazer Degrau (+ calça seca degrau no kit)
  'colete-trench', // 6 Colete Trench
  'maxi-blazer', // 7 Maxi Blazer
  'calca-pantalona-rasgo', // 8 pantalona Rasgo
  'calca-pantalona-degrau', // 9 pantalona Degrau
  'shorts-degrau', // 11 Shorts Degrau
  'shorts-pala', // 12 Shorts Saia pala
  'vestido-longo-mosaico-textil', // 13 Vestido Lg Mosaic Têxtil
  'jaqueta-mosaico-textil', // 14 Jaqueta Mosaico Têxtil
  'camisa-mosaico-textil-calca-pantalona', // 15 Camisa Mosaico Têxtil
  'top-mosaico-textil', // 16 Top mosaico têxtil
  'organic-jaqueta-sfilaciatta-degrade', // extra Organic
  'organic-vestido-sfilaciatta-plumaria', // extra Organic
];

/** Organic Dreams — masculino (fora da lista principal; fica no fim) */
const ORGANIC_MASC: string[] = [
  'jaqueta-jeans-camiseta-calca-slean',
  'jaqueta-trench',
];

/** Niponic Dreams — feminino (lista pula #8) */
const NIPONIC_FEM: string[] = [
  'look-obi-organza', // 1 Jaqueta rebordad/shorts
  'look-2-trench-obi', // 2 Trench/calca organza
  'tunica-cetim-botanica-pantalona', // 3 Vestido/pantalona/lenço
  'look-5-tunica-geo', // 4 Tunica/pantal. organza
  'tunica-bermuda-origami-hotgrey', // 5 tunica org/Berm. paetês
  'corset-petalas-pantalona-origami', // 6 corset petal./calça cetim
  'blusa-laco-pantalona-origami', // 7 blusa laço/calça cetim
  'vestido-longo-mousseline-grafica', // 9 vestido Lg estampa digit
  'vestido-longo-radial', // 10 Vestido longo radial
  'vestido-longo-kimono-cavalino', // 11 Vestido Kimono cavalin
  'vestido-longo-ideogramas', // 12 Vestido Lg ideogramas
  'vestido-longo-georgette-borboletas', // 13 Vestido Lg borboletas
  'vestido-longo-canvas-organza-origami', // 14 Vestido Lg ondas e nos
  'vestido-longo-explosion-origamis', // 15 Vestido explosion
  'vestido-capa-origami', // 16 Vestido paetês + Capa
];

/** Niponic Dreams — masculino */
const NIPONIC_MASC: string[] = [
  'look-4-polo-bermuda', // 1 Camiseta polo/bernuda
  'look-3-blazer-bermuda', // 2 Blazer branco/bernuda
  'look-8-terno-canvas', // 3 Terno Sand/camiset polo
  'tunica-oriental', // extra vs lista Niponic
];

/** Brazilian Dreams — feminino */
const BRAZILIAN_FEM: string[] = [
  'colete-bermuda-saia-echarpe', // 1 Col/short/echarpe/offw
  'colete-patchwork-pantalona-echarpe', // 2 Col/panta/echarpe black
  'corset-cestaria-saia-pump', // 3 corset cestaria/saia est
  'macacao-moulage-cetim-grevileas', // 4 macacao estampado cet
  'maxi-blazer-bermuda-file', // 5 Blazer/bermuda bord filé
  'jaqueta-file-shorts-canvas', // 6 Jaqueta filé/ shorts saia
  'vestido-tubular-file', // 7 Vestido tubo filé
  'top-kaiapo-bermuda', // 8 top pint Kaiapó/bernuda
  'macaquinho-kaiapo', // 9 macaquinho Kaiapó
  'vestido-tubular-kaiapo', // 10 vestido tubo Kaiapó
  'top-sfilaciatta-calca-slean', // 11 top plumário preto/calç
  'mini-blazer-saia-sfilaciatta', // 12 Blazer/saia plumaria
  'jaqueta-sfilaciatta-pantalona-acqua', // 13 jaqueta plumaria acqua
  'jaqueta-sfilaciatta-degrade', // 14 jaqueta plumaria degrd
  'vestido-sfilaciatta-plumaria', // 15 Vestido nude/preto plumaria
  'echarpe-degrade', // extra: produto único da echarpe
];

/** Brazilian Dreams — masculino */
const BRAZILIAN_MASC: string[] = [
  'camisa-bermuda-grevileas', // 1 Camisa organza/berm IB
  'terno-doppiopetto-canhamo', // 2 Terno Sand / polo
  // extras (fora da lista principal)
  'blazer-patchwork-calca-sand',
  'jaqueta-utilitaria-calca-sand',
  'jaqueta-utilitaria-shorts-sand',
  'polo-calca-offwhite',
  'polo-calca-black',
  'polo-ml-calca-offwhite',
  'camiseta-botanica-calca',
  'camisa-botanica-shorts',
];

function indexMap(slugs: string[], offset = 0): Record<string, number> {
  const out: Record<string, number> = {};
  slugs.forEach((slug, i) => {
    out[slug] = offset + i + 1;
  });
  return out;
}

/** Flat slug → recommend rank (lower first). Masculino after feminino within collection. */
export const RECOMMEND_ORDER: Record<string, number> = {
  ...indexMap(ORGANIC, 0),
  ...indexMap(ORGANIC_MASC, 100),
  ...indexMap(NIPONIC_FEM, 0),
  ...indexMap(NIPONIC_MASC, 100),
  ...indexMap(BRAZILIAN_FEM, 0),
  ...indexMap(BRAZILIAN_MASC, 100),
};

/** Slugs still expected by the brand list but not yet catalogued as standalone products. */
export const RECOMMEND_ORDER_GAPS = [
  'calca-seca-degrau', // Organic #10 — only as piece inside mini-blazer-basque
] as const;

export function recommendRank(slug: string): number {
  const admin = adminOrderIndex(slug);
  if (admin != null) return admin;
  return RECOMMEND_ORDER[slug] ?? 9990;
}

/** Optional admin custom order from localStorage (`lc-admin-catalog`). */
function adminOrderIndex(slug: string): number | null {
  try {
    const raw = localStorage.getItem('lc-admin-catalog');
    if (!raw) return null;
    const order = (JSON.parse(raw) as { order?: string[] | null }).order;
    if (!order?.length) return null;
    const i = order.indexOf(slug);
    return i >= 0 ? i : null;
  } catch {
    return null;
  }
}

export function sortByRecommendOrder<T extends { slug: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const d = recommendRank(a.slug) - recommendRank(b.slug);
    if (d !== 0) return d;
    return a.slug.localeCompare(b.slug);
  });
}

/** Canonical collection order for cross-collection RTW grids. */
export const COLLECTION_SORT_ORDER = [
  'organic-dreams',
  'niponic-dreams',
  'brazilian-dreams',
] as const;

/** Organic → Niponic → Brazilian, then recommend rank within collection. */
export function sortByCollectionThenRecommend<
  T extends { slug: string; collectionSlug?: string },
>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ai = COLLECTION_SORT_ORDER.indexOf(
      a.collectionSlug as (typeof COLLECTION_SORT_ORDER)[number],
    );
    const bi = COLLECTION_SORT_ORDER.indexOf(
      b.collectionSlug as (typeof COLLECTION_SORT_ORDER)[number],
    );
    const ca = ai === -1 ? 999 : ai;
    const cb = bi === -1 ? 999 : bi;
    if (ca !== cb) return ca - cb;
    const r = recommendRank(a.slug) - recommendRank(b.slug);
    if (r !== 0) return r;
    return a.slug.localeCompare(b.slug);
  });
}
