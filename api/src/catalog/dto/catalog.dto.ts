import { MediaRole, ProductStatus } from '@prisma/client';

/** Shape returned by public catalog endpoints (camelCase JSON). */
export interface ProductDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  shipping: string | null;
  priceCents: number;
  currency: string;
  color: string | null;
  size: string | null;
  fabric: string | null;
  season: string | null;
  status: ProductStatus;
  stockQty: number;
  category: string;
  /** Primary collection name for storefront compatibility (e.g. "Organic Dreams"). */
  collection: string;
  collections: { slug: string; name: string }[];
  thumb: string;
  gallery: string[];
  media: {
    id: string;
    cdnUrl: string;
    role: MediaRole;
    altPt: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }[];
}

export interface CollectionDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  publishedAt: string | null;
}

export interface CollectionDetailDto extends CollectionDto {
  products: ProductDto[];
}
