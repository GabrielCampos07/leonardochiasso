import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  collectionCoverInclude,
  resolveCollectionCoverImage,
} from '../catalog/collection-cover';
import { CollectionDto } from '../catalog/dto/catalog.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenderList,
  matchesGenderList,
  orderIdsByGenderList,
  parseGenderList,
} from '../catalog/gender';
import { syncCollectionGenderOrders } from './collection-gender-order.sync';
import { archivedAtWhere } from './archive-query';

export interface CollectionGenderOrderDto {
  collection: string;
  gender: GenderList;
  productIds: string[];
}

@Injectable()
export class AdminCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(archived = false): Promise<CollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      where: archivedAtWhere(archived),
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
        ...collectionCoverInclude,
      },
    });
    return collections.map((c) => mapCollection(c, c._count.products));
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

  /** Hard delete. Member products stay in the catalog; only the join rows go. */
  async remove(slug: string): Promise<void> {
    const collection = await this.requireCollection(slug);
    await this.prisma.collection.delete({ where: { id: collection.id } });
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
      await syncCollectionGenderOrders(
        tx,
        collection.id,
        productSlugs.map((productSlug) => bySlug.get(productSlug)!),
      );
    });

    return {
      ...mapCollection(collection, productSlugs.length),
      productSlugs,
    };
  }

  /** All members in `sortOrder`, including archived products. */
  async getProducts(slug: string): Promise<{ productSlugs: string[] }> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: { product: { select: { slug: true } } },
        },
      },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }
    return { productSlugs: collection.products.map((row) => row.product.slug) };
  }

  async getGenderOrder(
    slug: string,
    genderRaw: string | undefined,
  ): Promise<CollectionGenderOrderDto> {
    const gender = parseGenderList(genderRaw);
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          include: { product: { include: { category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        genderOrders: {
          where: { gender },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }

    const matching = collection.products.filter(
      (pc) =>
        !pc.product.archivedAt &&
        matchesGenderList(pc.product.category.slug, gender),
    );
    const productIds = orderIdsByGenderList(
      matching.map((pc) => pc.productId),
      collection.genderOrders,
      new Map(matching.map((pc) => [pc.productId, pc.sortOrder])),
    );

    return { collection: slug, gender, productIds };
  }

  async setGenderOrder(
    slug: string,
    genderRaw: string | undefined,
    productIds: string[],
  ): Promise<CollectionGenderOrderDto> {
    const gender = parseGenderList(genderRaw);
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }

    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('A lista de peças contém itens repetidos.');
    }

    const members = new Map(
      collection.products.map((pc) => [pc.productId, pc]),
    );
    // Peças arquivadas não entram na ordenação: são ignoradas se enviadas.
    productIds = productIds.filter(
      (id) => !members.get(id)?.product.archivedAt,
    );
    const uniqueIds = new Set(productIds);
    const notInCollection = productIds.filter((id) => !members.has(id));
    if (notInCollection.length > 0) {
      throw new BadRequestException(
        `Peças que não pertencem a esta coleção: ${notInCollection.join(', ')}`,
      );
    }

    const wrongGender = productIds.filter((id) => {
      const pc = members.get(id)!;
      return !matchesGenderList(pc.product.category.slug, gender);
    });
    if (wrongGender.length > 0) {
      throw new BadRequestException(
        `Peças fora do filtro ${gender} (aceita ${gender} ou unissex): ${wrongGender.join(', ')}`,
      );
    }

    const expected = collection.products
      .filter(
        (pc) =>
          !pc.product.archivedAt &&
          matchesGenderList(pc.product.category.slug, gender),
      )
      .map((pc) => pc.productId);
    const expectedSet = new Set(expected);
    const missing = expected.filter((id) => !uniqueIds.has(id));
    const extra = productIds.filter((id) => !expectedSet.has(id));
    if (missing.length > 0 || extra.length > 0) {
      const parts: string[] = [];
      if (missing.length > 0) {
        parts.push(`faltando ${missing.join(', ')}`);
      }
      if (extra.length > 0) {
        parts.push(`sobrando ${extra.join(', ')}`);
      }
      throw new BadRequestException(
        `A ordem deve conter exatamente as peças ativas ${gender} (incluindo unissex) desta coleção (${parts.join('; ')}). Recarregue a página e tente de novo.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.collectionGenderOrder.deleteMany({
        where: { collectionId: collection.id, gender },
      });
      if (productIds.length > 0) {
        await tx.collectionGenderOrder.createMany({
          data: productIds.map((productId, sortOrder) => ({
            collectionId: collection.id,
            productId,
            gender,
            sortOrder,
          })),
        });
      }
    });

    return { collection: slug, gender, productIds };
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
    products?: Parameters<typeof resolveCollectionCoverImage>[1];
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
    coverImage: resolveCollectionCoverImage(c.slug, c.products ?? []),
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
