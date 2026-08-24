import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CollectionDto } from '../catalog/dto/catalog.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return collections.map(mapCollection);
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
    return mapCollection(created);
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
    });
    return mapCollection(updated);
  }

  async setProducts(
    slug: string,
    productSlugs: string[],
  ): Promise<CollectionDto & { productSlugs: string[] }> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }

    const products = await this.prisma.product.findMany({
      where: { slug: { in: productSlugs } },
      select: { id: true, slug: true },
    });
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
      ...mapCollection(collection),
      productSlugs,
    };
  }
}

function mapCollection(c: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  publishedAt: Date | null;
}): CollectionDto {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    publishedAt: c.publishedAt?.toISOString() ?? null,
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
