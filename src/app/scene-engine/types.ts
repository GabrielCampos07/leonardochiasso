/** Framework-agnostic scene graph inputs. No three.js imports here. */

import type { LooseMedia, LooseProductPhotos } from './photo-url';

export type { LooseMedia, LooseProductPhotos } from './photo-url';
export {
  derivedThumbUrl,
  fullImageUrl,
  hangerTextureUrls,
  mediaItemUrl,
  mergeProductPhotos,
  primaryImageUrl,
  textureJobId,
  thumbImageUrl,
} from './photo-url';
export type { HangerTextureQuality } from './photo-url';

export const UNCOLLECTED_RACK_ID = '__none__';
export const UNCOLLECTED_RACK_NAME = 'Sem coleção';

export interface SceneCollectionInput {
  slug: string;
  name: string;
  sortOrder: number;
  archivedAt?: string | null;
}

export type SceneMediaInput = LooseMedia;

export type SceneUnitKind = 'rack' | 'vitrine';
export type ScenePieceKind = 'garment' | 'jewelry';

export interface SceneProductInput extends LooseProductPhotos {
  slug: string;
  name: string;
  /** Primary collection slug when the API already resolved one. */
  collectionSlug?: string | null;
  /** Raw ProductCollection slugs — first match wins, empty means uncollected. */
  collectionSlugs?: string[] | null;
  status?: string | null;
  stockQty?: number | null;
  price?: number | null;
  currentPrice?: number | null;
  promoPrice?: number | null;
  priceCents?: number | null;
  priceLabel?: string | null;
  pieceKind?: ScenePieceKind;
  archivedAt?: string | null;
}

export interface SceneHanger {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Storefront thumb (`pdp/*-thumb.webp`); loaded with the same `?tex=1` bust. */
  thumbUrl?: string | null;
  stockQty: number;
  priceLabel: string;
  status: string;
  rackId: string;
  kind: ScenePieceKind;
}

export interface SceneRack {
  id: string;
  name: string;
  sortOrder: number;
  hangers: SceneHanger[];
  kind: SceneUnitKind;
}

export interface SceneLayout {
  racks: SceneRack[];
}

export function isSoldOut(stockQty: number | null | undefined): boolean {
  return (stockQty ?? 1) <= 0;
}

export function isDraftStatus(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'draft';
}

/** Photos and labels stay fully opaque. Draft is not a fade. */
export function hangerOpacity(_status: string | null | undefined): number {
  return 1;
}
