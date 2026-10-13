import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
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

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CatalogCacheService,
  ) {}

  async listProducts(): Promise<ProductDto[]> {
    return this.cache.getOrSet('products:list', async () => {
      const products = await this.prisma.product.findMany({
        where: { status: ProductStatus.published, archivedAt: null },
        include: publicProductInclude,
        orderBy: [{ recommendOrder: 'asc' }, { createdAt: 'asc' }],
      });
      return products.map(mapProduct);
    });
  }

  async getProductBySlug(slug: string): Promise<ProductDto> {
    return this.cache.getOrSet(`products:slug:${slug}`, async () => {
      const product = await this.prisma.product.findFirst({
        where: { slug, status: ProductStatus.published, archivedAt: null },
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
        where: { archivedAt: null },
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
        coverImage: resolveCollectionCoverImage(
          (c as { coverImage?: string | null }).coverImage,
          c.products,
        ),
      }));
    });
  }

  async getCollectionBySlug(slug: string): Promise<CollectionDetailDto> {
    return this.cache.getOrSet(`collections:slug:${slug}`, async () => {
      const collection = await this.prisma.collection.findFirst({
        where: { slug, archivedAt: null },
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
        coverImage: resolveCollectionCoverImage(
          (collection as { coverImage?: string | null }).coverImage,
          collection.products,
        ),
        products: collection.products.map((pc) => mapProduct(pc.product)),
      };
    });
  }
}
