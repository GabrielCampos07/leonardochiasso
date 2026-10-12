/** Framework-agnostic scene graph inputs. No three.js imports here. */

export const UNCOLLECTED_RACK_ID = '__none__';
export const UNCOLLECTED_RACK_NAME = 'Sem coleção';

export interface SceneCollectionInput {
  slug: string;
  name: string;
  sortOrder: number;
}

export interface SceneMediaInput {
  cdnUrl: string;
  sortOrder?: number;
}

export interface SceneProductInput {
  slug: string;
  name: string;
  /** Primary collection slug when the API already resolved one. */
  collectionSlug?: string | null;
  /** Raw ProductCollection slugs — first match wins, empty means uncollected. */
  collectionSlugs?: string[] | null;
  status?: string | null;
  stockQty?: number | null;
  media?: SceneMediaInput[] | null;
  thumb?: string | null;
  gallery?: string[] | null;
}

export interface SceneHanger {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  stockQty: number;
  status: string;
  rackId: string;
}

export interface SceneRack {
  id: string;
  name: string;
  sortOrder: number;
  hangers: SceneHanger[];
}

export interface SceneLayout {
  racks: SceneRack[];
}

export function primaryImageUrl(product: SceneProductInput): string | null {
  const media = [...(product.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const fromMedia = media.find((m) => m.cdnUrl)?.cdnUrl;
  if (fromMedia) return fromMedia;
  if (product.thumb) return product.thumb;
  return product.gallery?.find(Boolean) ?? null;
}

export function stockBadgeColor(stockQty: number): string {
  if (stockQty <= 0) return '#8B1E2D';
  if (stockQty <= 2) return '#B8963E';
  return '#4A7C59';
}

export function isDraftStatus(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'draft';
}

export function hangerOpacity(status: string | null | undefined): number {
  return isDraftStatus(status) ? 0.42 : 1;
}
