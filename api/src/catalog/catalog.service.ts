import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapProduct,
  publishedProductInclude,
} from './catalog.mapper';
import {
  CollectionDetailDto,
  CollectionDto,
  ProductDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.published },
      include: publishedProductInclude,
      orderBy: { createdAt: 'asc' },
    });
    return products.map(mapProduct);
  }

  async getProductBySlug(slug: string): Promise<ProductDto> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.published },
      include: publishedProductInclude,
    });
    if (!product) {
      throw new NotFoundException(`Product not found: ${slug}`);
    }
    return mapProduct(product);
  }

  async listCollections(): Promise<CollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return collections.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      publishedAt: c.publishedAt?.toISOString() ?? null,
    }));
  }

  async getCollectionBySlug(slug: string): Promise<CollectionDetailDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          where: { product: { status: ProductStatus.published } },
          orderBy: { sortOrder: 'asc' },
          include: {
            product: { include: publishedProductInclude },
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
      products: collection.products.map((pc) => mapProduct(pc.product)),
    };
  }
}
