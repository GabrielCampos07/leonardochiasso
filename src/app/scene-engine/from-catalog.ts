import type { ApiProductDto } from '../core/catalog.service';
import type { Product } from '../core/product.model';
import type { SceneProductInput } from './types';

export function productToSceneInput(product: Product): SceneProductInput {
  return {
    slug: product.slug,
    name: product.name,
    collectionSlug: product.collectionSlug || '',
    collectionSlugs: product.collectionSlug ? [product.collectionSlug] : [],
    status: product.status,
    stockQty: product.stockQty,
    media: product.media,
    thumb: product.thumb,
    gallery: product.gallery,
    imageUrl: product.thumb || null,
  };
}

export function apiProductToSceneInput(dto: ApiProductDto): SceneProductInput {
  return {
    slug: dto.slug,
    name: dto.name,
    collectionSlug: dto.collections?.[0]?.slug ?? '',
    collectionSlugs: (dto.collections ?? []).map((c) => c.slug).filter(Boolean),
    status: dto.status,
    stockQty: dto.stockQty,
    media: dto.media,
    thumb: dto.thumb,
    gallery: dto.gallery,
    imageUrl: dto.thumb || null,
  };
}
