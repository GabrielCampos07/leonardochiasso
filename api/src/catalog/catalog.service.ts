import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import {
  collectionCoverInclude,
  resolveCollectionCoverImage,
} from './collection-cover';
import { mapProduct, publicProductInclude } from './catalog.mapper';
import {
  CollectionDetailDto,
  CollectionDto,
  ProductDto,
} from './dto/catalog.dto';
import { parseOptionalGenderList, sortByPublicGenderBlocks } from './gender';

/** Membership `product_collections.sortOrder` for this collection slug. */
export function membershipSortOrder(
  product: { collections?: { slug: string; sortOrder?: number }[] | null },
  collectionSlug: string,
): number {
  const hit = product.collections?.find((row) => row.slug === collectionSlug);
  if (hit != null && Number.isFinite(hit.sortOrder)) return Number(hit.sortOrder);
  return Number.MAX_SAFE_INTEGER;
}

/** Coleção pública = publicada (publishedAt definido) e não arquivada. */
export const publicCollectionWhere = {
  publishedAt: { not: null },
  archivedAt: null,
} satisfies Prisma.CollectionWhereInput;

/**
 * Produto público = publicado, não arquivado e, se pertencer a alguma coleção,
 * ao menos uma delas precisa ser pública. Produtos sem coleção seguem visíveis.
 */
export const publicProductWhere = {
  status: ProductStatus.published,
  archivedAt: null,
  OR: [
    { collections: { none: {} } },
    { collections: { some: { collection: publicCollectionWhere } } },
  ],
} satisfies Prisma.ProductWhereInput;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CatalogCacheService,
  ) {}

  async listProducts(
    genderRaw?: string,
    collectionRaw?: string,
  ): Promise<ProductDto[]> {
    const gender = parseOptionalGenderList(genderRaw);
    const collection = collectionRaw?.trim().toLowerCase() || undefined;
    const cacheKey =
      (gender ? `products:list:${gender}` : 'products:list') +
      (collection ? `:col:${collection}` : '');
    return this.cache.getOrSet(cacheKey, async () => {
      const products = await this.prisma.product.findMany({
        where: {
          AND: [
            publicProductWhere,
            ...(collection
              ? [
                  {
                    collections: {
                      some: {
                        collection: { ...publicCollectionWhere, slug: collection },
                      },
                    },
                  },
                ]
              : []),
          ],
          ...(gender
            ? { category: { slug: { in: [gender, 'unissex'] } } }
            : {}),
        },
        include: publicProductInclude,
        orderBy: [{ recommendOrder: 'asc' }, { createdAt: 'asc' }],
      });
      const mapped = products.map(mapProduct);
      if (collection) {
        return [...mapped].sort(
          (a, b) => membershipSortOrder(a, collection) - membershipSortOrder(b, collection),
        );
      }
      if (gender) return mapped;
      return sortByPublicGenderBlocks(mapped);
    });
  }

  async getProductBySlug(slug: string): Promise<ProductDto> {
    return this.cache.getOrSet(`products:slug:${slug}`, async () => {
      const product = await this.prisma.product.findFirst({
        where: { slug, ...publicProductWhere },
        include: publicProductInclude,
      });
      if (!product) {
        throw new NotFoundException(`Product not found: ${slug}`);
      }
      return mapProduct(product);
    });
  }

  async listCollections(): Promise<CollectionDto[]> {
    return this.cache.getOrSet('collections:list', async () => {
      const collections = await this.prisma.collection.findMany({
        where: publicCollectionWhere,
        orderBy: { sortOrder: 'asc' },
        include: collectionCoverInclude,
      });
      return collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        publishedAt: c.publishedAt?.toISOString() ?? null,
        archivedAt: null,
        coverImage: resolveCollectionCoverImage(c.slug, c.products),
      }));
    });
  }

  async getCollectionBySlug(slug: string): Promise<CollectionDetailDto> {
    return this.cache.getOrSet(`collections:slug:${slug}`, async () => {
      const collection = await this.prisma.collection.findFirst({
        where: { slug, ...publicCollectionWhere },
        include: {
          products: {
            where: {
              product: { status: ProductStatus.published, archivedAt: null },
            },
            orderBy: { sortOrder: 'asc' },
            include: {
              product: { include: publicProductInclude },
            },
          },
        },
      });
      if (!collection) {
        throw new NotFoundException(`Collection not found: ${slug}`);
      }
      return {
        id: collection.id,
        slug: collection.slug,
        name: collection.name,
        description: collection.description,
        sortOrder: collection.sortOrder,
        publishedAt: collection.publishedAt?.toISOString() ?? null,
        archivedAt: null,
        coverImage: resolveCollectionCoverImage(collection.slug, collection.products),
        products: collection.products.map((pc) => mapProduct(pc.product)),
      };
    });
  }
}
