import { COLLECTION_SLUGS, CollectionSlug } from './routes';

/** Official product collections (Dreams architecture) — display labels. */
export const COLLECTIONS = [
  'Organic Dreams',
  'Niponic Dreams',
  'Brazilian Dreams',
] as const;

export type Collection = (typeof COLLECTIONS)[number];

/** Display label by URL slug */
export const COLLECTION_LABELS: Record<CollectionSlug, Collection> = {
  [COLLECTION_SLUGS.organicDreams]: 'Organic Dreams',
  [COLLECTION_SLUGS.niponicDreams]: 'Niponic Dreams',
  [COLLECTION_SLUGS.brazilianDreams]: 'Brazilian Dreams',
};

/** Crop focus on look photos until solo product shots exist. */
export type PieceImageFocus = 'top' | 'bottom' | 'center' | 'waist';

/** Color swatch for PLP / PDP. */
export interface ProductColor {
  id: string;
  name: string;
  hex: string;
}

/** Canonical hex map for boutique color names. */
const COLOR_HEX: Record<string, string> = {
  'off-white': '#F5F2EB',
  offwhite: '#F5F2EB',
  'hot grey': '#8B8680',
  hotgrey: '#8B8680',
  black: '#1A1A1A',
  aqua: '#A7C7CB',
  acqua: '#A7C7CB',
  lilac: '#A47DAB',
  sand: '#C4B7A6',
  vermelho: '#8B1E2D',
  blue: '#2C4A6E',
  oldgold: '#B8963E',
  'old gold': '#B8963E',
  nude: '#E8D5C4',
  preto: '#1A1A1A',
  branco: '#F7F7F5',
  white: '#F7F7F5',
};

const SKIP_COLOR_TOKENS = new Set([
  'unica',
  'única',
  'unico',
  'único',
  'sob',
  'encomenda',
  'bermuda',
  'unica·',
  'lenço',
  'lenco',
  'saia',
  'obi',
  'degradê',
  'degrade',
]);

/** Build swatches from explicit list or by parsing a color label. */
export function colorSwatches(
  colors?: ProductColor[] | null,
  fallbackLabel?: string | null,
): ProductColor[] {
  if (colors?.length) return colors;
  if (!fallbackLabel) return [];
  return parseColorLabel(fallbackLabel);
}

export function parseColorLabel(label: string): ProductColor[] {
  const raw = label
    .replace(/·/g, '/')
    .replace(/,/g, '/')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  const out: ProductColor[] = [];
  const seen = new Set<string>();

  for (const token of raw) {
    const key = token
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!key || SKIP_COLOR_TOKENS.has(key.split(' ')[0]!)) continue;
    // Skip multi-word noise like "Sob encomenda"
    if (key.includes('encomenda') || key.includes('unica') || key.includes('única')) {
      continue;
    }

    const hexKey = key.replace(/\s+/g, ' ');
    const hex =
      COLOR_HEX[hexKey] ??
      COLOR_HEX[hexKey.replace(/\s/g, '')] ??
      null;
    if (!hex) continue;

    const id = hexKey.replace(/\s+/g, '-');
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: token.replace(/\b\w/g, (c) => c.toUpperCase()),
      hex,
    });
  }

  return out;
}

/** Named palette helpers for product data. */
export const SWATCH = {
  offWhite: { id: 'off-white', name: 'Off-white', hex: COLOR_HEX['off-white']! },
  hotGrey: { id: 'hot-grey', name: 'Hot grey', hex: COLOR_HEX['hot grey']! },
  black: { id: 'black', name: 'Black', hex: COLOR_HEX['black']! },
  aqua: { id: 'aqua', name: 'Aqua', hex: COLOR_HEX['aqua']! },
  lilac: { id: 'lilac', name: 'Lilac', hex: COLOR_HEX['lilac']! },
  sand: { id: 'sand', name: 'Sand', hex: COLOR_HEX['sand']! },
  blue: { id: 'blue', name: 'Blue', hex: COLOR_HEX['blue']! },
  vermelho: { id: 'vermelho', name: 'Vermelho', hex: COLOR_HEX['vermelho']! },
  oldGold: { id: 'old-gold', name: 'Oldgold', hex: COLOR_HEX['oldgold']! },
  nude: { id: 'nude', name: 'Nude', hex: COLOR_HEX['nude']! },
} as const;

/** One purchasable piece inside a multi-product look. */
export interface ProductPiece {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  fabric?: string;
  color?: string;
  colors?: ProductColor[];
  /** Solo thumb when available; otherwise look thumb + imageFocus crop */
  thumb?: string;
  imageFocus?: PieceImageFocus;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Whole BRL (storefront / cart) */
  price: number;
  /** Optional API cents — present when hydrated from catalog API */
  priceCents?: number;
  priceLabel: string;
  color: string;
  /** Optional structured swatches (preferred over parsing `color`) */
  colors?: ProductColor[];
  size: string;
  fabric: string;
  season: string;
  description: string;
  details: string[];
  shipping: string;
  thumb: string;
  gallery: string[];
  category: 'feminino' | 'masculino';
  /** Display label (UI) */
  collection: Collection;
  /** URL-safe slug — pairs with `/colecao/:collectionSlug` */
  collectionSlug: CollectionSlug;
  /**
   * When set (2+), PLP/PDP offer choosing one piece to buy.
   * Look `price` remains the full-look reference; each piece has its own price.
   */
  pieces?: ProductPiece[];
  /** Future dedicated ArtCouture section — atelier mosaic / couture line. */
  artCouture?: boolean;
}

export interface CartItem {
  productId: string;
  /** Selected piece within a look (when product.pieces is set). */
  pieceId?: string;
  quantity: number;
}

/** Cart line key — unique per product (+ piece). */
export function cartLineKey(productId: string, pieceId?: string): string {
  return pieceId ? `${productId}::${pieceId}` : productId;
}

/** Resolve display product for a cart line / selected piece. */
export function productWithPiece(product: Product, pieceId?: string | null): Product {
  if (!pieceId || !product.pieces?.length) return product;
  const piece = product.pieces.find((p) => p.id === pieceId);
  if (!piece) return product;
  return {
    ...product,
    name: piece.name,
    price: piece.price,
    priceLabel: piece.priceLabel,
    fabric: piece.fabric ?? product.fabric,
    color: piece.color ?? product.color,
    colors: piece.colors ?? product.colors,
    thumb: piece.thumb ?? product.thumb,
  };
}

export function formatPriceLabel(reais: number): string {
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
