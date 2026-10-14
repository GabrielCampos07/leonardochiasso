import type { ApiProductDto } from '../core/catalog.service';
import type { JoiaPiece } from '../core/joias.data';
import { joiaGallery } from '../core/joias.data';
import type { Product } from '../core/product.model';
import type { SceneProductInput } from './types';

export function collectionOrdersFrom(
  collections: ReadonlyArray<{ slug?: string | null; sortOrder?: number | null }> | null | undefined,
  fallbackSlug = '',
): { slug: string; sortOrder: number }[] {
  const rows = (collections ?? [])
    .map((c, i) => ({
      slug: (c.slug ?? '').trim(),
      sortOrder: Number.isFinite(c.sortOrder) ? Number(c.sortOrder) : i,
    }))
    .filter((c) => c.slug);
  if (rows.length) return rows;
  const slug = fallbackSlug.trim();
  return slug ? [{ slug, sortOrder: 0 }] : [];
}

export function productToSceneInput(product: Product): SceneProductInput {
  return {
    slug: product.slug,
    name: product.name,
    collectionSlug: product.collectionSlug || '',
    collectionSlugs: product.collectionSlug ? [product.collectionSlug] : [],
    collectionOrders: collectionOrdersFrom(product.collections, product.collectionSlug || ''),
    status: product.status,
    stockQty: product.stockQty,
    price: product.price,
    priceCents: product.priceCents,
    priceLabel: product.priceLabel,
    pieceKind: 'garment',
    media: product.media,
    thumb: product.thumb,
    gallery: product.gallery,
    imageUrl: product.thumb || null,
    archivedAt: product.archivedAt ?? null,
  };
}

export function apiProductToSceneInput(dto: ApiProductDto): SceneProductInput {
  const extra = dto as ApiProductDto & {
    promoPrice?: number | null;
    currentPrice?: number | null;
    promoPriceCents?: number | null;
    currentPriceCents?: number | null;
  };
  const price = Number.isFinite(dto.priceCents) ? dto.priceCents / 100 : null;
  const promoPrice =
    typeof extra.promoPrice === 'number'
      ? extra.promoPrice
      : typeof extra.promoPriceCents === 'number'
        ? extra.promoPriceCents / 100
        : null;
  const currentPrice =
    typeof extra.currentPrice === 'number'
      ? extra.currentPrice
      : typeof extra.currentPriceCents === 'number'
        ? extra.currentPriceCents / 100
        : null;
  return {
    slug: dto.slug,
    name: dto.name,
    collectionSlug: dto.collections?.[0]?.slug ?? '',
    collectionSlugs: (dto.collections ?? []).map((c) => c.slug).filter(Boolean),
    collectionOrders: collectionOrdersFrom(dto.collections),
    status: dto.status,
    stockQty: dto.stockQty,
    price,
    priceCents: dto.priceCents,
    promoPrice,
    currentPrice,
    pieceKind: 'garment',
    media: dto.media,
    thumb: dto.thumb,
    gallery: dto.gallery,
    imageUrl: dto.thumb || null,
    archivedAt: dto.archivedAt ?? null,
  };
}

/** Joias come from `/api/joias` (content kind `joia`), never from clothing products. */
export function joiaToSceneInput(piece: JoiaPiece): SceneProductInput {
  const gallery = joiaGallery(piece);
  return {
    slug: piece.slug,
    name: piece.title,
    collectionSlug: piece.collectionSlug || '',
    collectionSlugs: piece.collectionSlug ? [piece.collectionSlug] : [],
    status: 'published',
    stockQty: null,
    price: piece.price,
    priceLabel: piece.priceLabel,
    pieceKind: 'jewelry',
    thumb: piece.image ?? gallery[0] ?? '',
    gallery,
    imageUrl: piece.image ?? gallery[0] ?? null,
    archivedAt: piece.archivedAt ?? null,
  };
}
