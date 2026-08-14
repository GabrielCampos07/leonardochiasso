/** Ready-to-wear groupings derived from current Organic Dreams catalog. */
export type RtwType = 'vestidos' | 'calcas' | 'casacos' | 'camisas';

export const RTW_LABELS: Record<RtwType, string> = {
  vestidos: 'Vestidos',
  calcas: 'Calças',
  casacos: 'Casacos',
  camisas: 'Camisas',
};

type RtwProductRef = {
  slug: string;
  name: string;
  pieces?: { id: string; name: string }[];
};

/** Classify a garment label (product name segment or piece id+name). */
function garmentRtwType(label: string): RtwType | null {
  const key = label.toLowerCase();

  if (key.includes('vestido')) return 'vestidos';
  if (
    key.includes('tunica') ||
    key.includes('túnica') ||
    key.includes('macacao') ||
    key.includes('macacão') ||
    key.includes('macaquinho')
  ) {
    return 'vestidos';
  }

  if (
    key.includes('jaqueta') ||
    key.includes('colete') ||
    key.includes('casaco') ||
    key.includes('terno') ||
    key.includes('blazer') ||
    key.includes('trench')
  ) {
    return 'casacos';
  }

  if (
    key.includes('camisa') ||
    key.includes('blusa') ||
    key.includes('corset') ||
    key.includes('polo') ||
    key.includes('camiseta')
  ) {
    return 'camisas';
  }
  if (key.startsWith('top-') || key.includes('top ') || /\btop\b/.test(key)) {
    return 'camisas';
  }

  if (
    key.includes('calca') ||
    key.includes('calça') ||
    key.includes('pantalona') ||
    key.includes('shorts') ||
    key.includes('bermuda') ||
    key.includes('saia')
  ) {
    return 'calcas';
  }

  return null;
}

/** Primary garment segment — text before look separators. */
function primaryGarmentKey(product: { slug: string; name: string }): string {
  const namePrimary = product.name.split(/\s*[+/·]\s*|\s+\/\s*/)[0] ?? product.name;
  const slugPrimary =
    product.slug.split(
      /-(?:calca|pantalona|bermuda|shorts|saia|echarpe|polo|corset)-/,
    )[0] ?? product.slug;
  return `${slugPrimary} ${namePrimary}`.toLowerCase();
}

/** Infer RTW bucket from the primary garment in a look / SKU. */
export function productRtwType(product: { slug: string; name: string }): RtwType | null {
  return garmentRtwType(primaryGarmentKey(product));
}

/**
 * Whether a product belongs in an RTW listing.
 * Includes multi-piece looks when any buyable piece matches the tipo
 * (e.g. Camisa / calça appears in Camisas and Calças e Shorts).
 */
export function productMatchesRtwType(product: RtwProductRef, tipo: RtwType): boolean {
  if (productRtwType(product) === tipo) return true;

  if (product.pieces?.length) {
    return product.pieces.some(
      (piece) => garmentRtwType(`${piece.id} ${piece.name}`) === tipo,
    );
  }

  const segments = product.name.split(/\s*[+/·]\s*|\s+\/\s*/).slice(1);
  return segments.some((seg) => garmentRtwType(seg) === tipo);
}

/** Display label for RTW tipo, optionally scoped by gender hub. */
export function rtwLabel(
  tipo: RtwType,
  _category?: 'feminino' | 'masculino' | null,
): string {
  if (tipo === 'calcas') return 'Calças e Shorts';
  if (tipo === 'casacos') return 'Blazers';
  return RTW_LABELS[tipo];
}
