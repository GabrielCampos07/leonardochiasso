import { MediaRole, Prisma, ProductStatus } from '@prisma/client';
import { ProductDto } from './dto/catalog.dto';

export const publishedProductInclude = {
  category: true,
  collections: {
    include: { collection: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  media: {
    include: { mediaAsset: true },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof publishedProductInclude;
}>;

export function mapProduct(product: ProductWithRelations): ProductDto {
  const media = product.media.map((pm) => ({
    id: pm.mediaAsset.id,
    cdnUrl: pm.mediaAsset.cdnUrl,
    role: pm.mediaAsset.role,
    altPt: pm.mediaAsset.altPt,
    sortOrder: pm.sortOrder,
    isPrimary: pm.isPrimary,
  }));

  const thumbAsset =
    media.find((m) => m.isPrimary) ??
    media.find((m) => m.role === MediaRole.thumb) ??
    media[0];

  const gallery = media
    .filter((m) => m.role === MediaRole.gallery || m.role === MediaRole.pdp)
    .map((m) => m.cdnUrl);

  const collections = product.collections.map((pc) => ({
    slug: pc.collection.slug,
    name: pc.collection.name,
  }));

  const details = Array.isArray(product.details)
    ? (product.details as string[])
    : [];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    details,
    shipping: product.shippingCopy,
    priceCents: product.priceCents,
    currency: product.currency,
    color: product.color,
    size: product.size,
    fabric: product.fabric,
    season: product.season,
    status: product.status,
    stockQty: product.stockQty,
    category: product.category.slug,
    collection: collections[0]?.name ?? '',
    collections,
    thumb: thumbAsset?.cdnUrl ?? '',
    gallery:
      gallery.length > 0
        ? gallery
        : media.filter((m) => m.id !== thumbAsset?.id).map((m) => m.cdnUrl),
    media,
  };
}

export function publishedOnly(
  status: ProductStatus = ProductStatus.published,
): Prisma.ProductWhereInput {
  return { status };
}
