import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CollectionDto } from '../catalog/dto/catalog.dto';
import { PrismaService } from '../prisma/prisma.service';
import { archivedAtWhere } from './archive-query';

@Injectable()
export class AdminCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(archived = false): Promise<CollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      where: archivedAtWhere(archived),
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return collections.map((c) =>
      mapCollection(c, c._count.products),
    );
  }

  async create(input: {
    name: string;
    slug: string;
    description?: string;
    sortOrder?: number;
    publishedAt?: string | null;
  }): Promise<CollectionDto> {
    const existing = await this.prisma.collection.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Collection slug already exists: ${input.slug}`,
      );
    }

    const created = await this.prisma.collection.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        publishedAt: parseOptionalDate(input.publishedAt, false),
      },
    });
    return mapCollection(created, 0);
  }

  async update(
    slug: string,
    input: {
      name?: string;
      description?: string;
      sortOrder?: number;
      publishedAt?: string | null;
    },
  ): Promise<CollectionDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }

    const data: Prisma.CollectionUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.publishedAt !== undefined) {
      data.publishedAt = parseOptionalDate(input.publishedAt, true);
    }

    const updated = await this.prisma.collection.update({
      where: { slug },
      data,
      include: { _count: { select: { products: true } } },
    });
    return mapCollection(updated, updated._count.products);
  }

  /**
   * Soft-archive only. Leaves `product_collections` and member products untouched
   * so restore brings the same pieces back onto this collection.
   */
  async archive(slug: string): Promise<CollectionDto> {
    const collection = await this.requireCollection(slug);
    const productCount = await this.prisma.productCollection.count({
      where: { collectionId: collection.id },
    });
    const updated = await this.prisma.collection.update({
      where: { slug },
      data: { archivedAt: new Date() },
    });
    return mapCollection(updated, productCount);
  }

  async restore(slug: string): Promise<CollectionDto> {
    const collection = await this.requireCollection(slug);
    const productCount = await this.prisma.productCollection.count({
      where: { collectionId: collection.id },
    });
    const updated = await this.prisma.collection.update({
      where: { slug },
      data: { archivedAt: null },
    });
    return mapCollection(updated, productCount);
  }

  async setProducts(
    slug: string,
    productSlugs: string[],
  ): Promise<CollectionDto & { productSlugs: string[] }> {
    // Coleção e produtos são buscas independentes → em paralelo.
    const [collection, products] = await Promise.all([
      this.prisma.collection.findUnique({ where: { slug } }),
      this.prisma.product.findMany({
        where: { slug: { in: productSlugs } },
        select: { id: true, slug: true },
      }),
    ]);
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }
    if (products.length !== productSlugs.length) {
      const found = new Set(products.map((p) => p.slug));
      const missing = productSlugs.filter((s) => !found.has(s));
      throw new BadRequestException(
        `Unknown product slugs: ${missing.join(', ')}`,
      );
    }

    const bySlug = new Map(products.map((p) => [p.slug, p.id]));

    await this.prisma.$transaction(async (tx) => {
      await tx.productCollection.deleteMany({
        where: { collectionId: collection.id },
      });
      if (productSlugs.length > 0) {
        await tx.productCollection.createMany({
          data: productSlugs.map((productSlug, index) => ({
            collectionId: collection.id,
            productId: bySlug.get(productSlug)!,
            sortOrder: index,
          })),
        });
      }
    });

    return {
      ...mapCollection(collection, productSlugs.length),
      productSlugs,
    };
  }

  private async requireCollection(slug: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }
    return collection;
  }
}

function mapCollection(
  c: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    sortOrder: number;
    publishedAt: Date | null;
    archivedAt?: Date | null;
  },
  productCount = 0,
): CollectionDto {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    publishedAt: c.publishedAt?.toISOString() ?? null,
    archivedAt: c.archivedAt?.toISOString() ?? null,
    productCount,
  };
}

function parseOptionalDate(
  value: string | null | undefined,
  allowUndefinedAsSkip: boolean,
): Date | null | undefined {
  if (value === undefined) {
    return allowUndefinedAsSkip ? undefined : null;
  }
  if (value === null) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return d;
}
