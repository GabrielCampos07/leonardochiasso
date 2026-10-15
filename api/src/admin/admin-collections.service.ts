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
  parseGenderList,
} from '../catalog/gender';
import {
  applyMembershipSortOrdersTwoPhase,
  mergeLiveOrderIntoMembership,
  sortMembersBySortOrder,
  syncDerivedGenderOrders,
} from './membership-order';
import { archivedAtWhere } from './archive-query';

export { mergeLiveOrderIntoMembership };

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
    keepMissing = false,
  ): Promise<CollectionDto & { productSlugs: string[] }> {
    return this.prisma.$transaction(
      async (tx) => {
        const collection = await tx.collection.findUnique({ where: { slug } });
        if (!collection) {
          throw new NotFoundException(`Collection not found: ${slug}`);
        }

        const current = await tx.productCollection.findMany({
          where: { collectionId: collection.id },
          orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
          include: { product: { select: { slug: true } } },
        });
        const ordered = keepMissing
          ? mergeLiveOrderIntoMembership(
              current.map((row) => row.product.slug),
              productSlugs,
            )
          : productSlugs;

        const products = await tx.product.findMany({
          where: { slug: { in: ordered } },
          select: {
            id: true,
            slug: true,
            status: true,
            category: { select: { slug: true } },
          },
        });
        if (products.length !== ordered.length) {
          const found = new Set(products.map((p) => p.slug));
          const missing = ordered.filter((s) => !found.has(s));
          throw new BadRequestException(
            `Unknown product slugs: ${missing.join(', ')}`,
          );
        }
        const bySlug = new Map(products.map((p) => [p.slug, p]));
        const nextIds = ordered.map(
          (productSlug) => requireProductBySlug(bySlug, productSlug).id,
        );
        const nextIdSet = new Set(nextIds);
        const currentById = new Map(current.map((row) => [row.productId, row]));
        const leaving = current
          .map((row) => row.productId)
          .filter((id) => !nextIdSet.has(id));
        if (leaving.length > 0) {
          await tx.productCollection.deleteMany({
            where: { collectionId: collection.id, productId: { in: leaving } },
          });
        }

        const newcomers: {
          collectionId: string;
          productId: string;
          sortOrder: number;
        }[] = [];
        const sortChanges: { productId: string; sortOrder: number }[] = [];
        for (let sortOrder = 0; sortOrder < nextIds.length; sortOrder++) {
          const productId = nextIds[sortOrder]!;
          const existing = currentById.get(productId);
          if (existing) {
            if (existing.sortOrder === sortOrder) continue;
            sortChanges.push({ productId, sortOrder });
          } else {
            newcomers.push({
              collectionId: collection.id,
              productId,
              sortOrder,
            });
          }
        }
        await applyMembershipSortOrdersTwoPhase(tx, collection.id, sortChanges);
        if (newcomers.length > 0) {
          await tx.productCollection.createMany({ data: newcomers });
        }

        await syncDerivedGenderOrders(
          tx,
          collection.id,
          ordered.map((productSlug) => {
            const product = requireProductBySlug(bySlug, productSlug);
            return { productId: product.id, gender: productGenderSlug(product) };
          }),
        );

        return {
          ...mapCollection(collection, ordered.length),
          productSlugs: ordered,
        };
      },
      { timeout: 15_000 },
    );
  }

  /**
   * Add pieces at the end. Inserts only newcomers — never updates or
   * deletes other `product_collections` rows (`keepMissing` semantics).
   */
  async appendProducts(
    slug: string,
    incomingSlugs: string[],
  ): Promise<CollectionDto & { productSlugs: string[] }> {
    return this.prisma.$transaction(
      async (tx) => {
        const collection = await tx.collection.findUnique({ where: { slug } });
        if (!collection) {
          throw new NotFoundException(`Collection not found: ${slug}`);
        }

        const current = await tx.productCollection.findMany({
          where: { collectionId: collection.id },
          orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
          include: {
            product: { select: { slug: true, category: { select: { slug: true } } } },
          },
        });
        const have = new Set(current.map((row) => row.product.slug));
        const newcomers = uniqueSlugs(incomingSlugs).filter((item) => !have.has(item));
        const keptSlugs = current.map((row) => row.product.slug);

        if (newcomers.length === 0) {
          return {
            ...mapCollection(collection, keptSlugs.length),
            productSlugs: keptSlugs,
          };
        }

        const products = await tx.product.findMany({
          where: { slug: { in: newcomers } },
          select: { id: true, slug: true, status: true, category: { select: { slug: true } } },
        });
        if (products.length !== newcomers.length) {
          const found = new Set(products.map((p) => p.slug));
          const missing = newcomers.filter((item) => !found.has(item));
          throw new BadRequestException(
            `Unknown product slugs: ${missing.join(', ')}`,
          );
        }
        const bySlug = new Map(products.map((p) => [p.slug, p]));
        const maxSort = current.reduce((max, row) => Math.max(max, row.sortOrder), -1);
        await tx.productCollection.createMany({
          data: newcomers.map((productSlug, index) => ({
            collectionId: collection.id,
            productId: requireProductBySlug(bySlug, productSlug).id,
            sortOrder: maxSort + 1 + index,
          })),
        });

        const members = [
          ...current.map((row) => ({
            productId: row.productId,
            gender: productGenderSlug(row.product),
          })),
          ...newcomers.map((productSlug) => {
            const product = requireProductBySlug(bySlug, productSlug);
            return { productId: product.id, gender: productGenderSlug(product) };
          }),
        ];
        await syncDerivedGenderOrders(tx, collection.id, members);

        return {
          ...mapCollection(collection, keptSlugs.length + newcomers.length),
          productSlugs: [...keptSlugs, ...newcomers],
        };
      },
      { timeout: 15_000 },
    );
  }

  /**
   * Remove one member. Deletes only that `product_collections` row and
   * that product's derived gender-order rows. Other pieces stay untouched.
   */
  async removeProduct(
    slug: string,
    productSlug: string,
  ): Promise<CollectionDto & { productSlugs: string[] }> {
    return this.prisma.$transaction(
      async (tx) => {
        const collection = await tx.collection.findUnique({ where: { slug } });
        if (!collection) {
          throw new NotFoundException(`Collection not found: ${slug}`);
        }
        const product = await tx.product.findUnique({
          where: { slug: productSlug },
          select: { id: true },
        });
        if (!product) {
          throw new NotFoundException(`Product not found: ${productSlug}`);
        }
        const row = await tx.productCollection.findUnique({
          where: {
            productId_collectionId: {
              productId: product.id,
              collectionId: collection.id,
            },
          },
        });
        if (!row) {
          throw new NotFoundException(
            `Product ${productSlug} is not in collection ${slug}`,
          );
        }

        await tx.productCollection.delete({
          where: {
            productId_collectionId: {
              productId: product.id,
              collectionId: collection.id,
            },
          },
        });
        await tx.collectionGenderOrder.deleteMany({
          where: { collectionId: collection.id, productId: product.id },
        });

        const remaining = await tx.productCollection.findMany({
          where: { collectionId: collection.id },
          orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
          include: { product: { select: { slug: true } } },
        });
        return {
          ...mapCollection(collection, remaining.length),
          productSlugs: remaining.map((item) => item.product.slug),
        };
      },
      { timeout: 15_000 },
    );
  }

  /** All members in `sortOrder`, including archived products. */
  async getProducts(slug: string): Promise<{ productSlugs: string[] }> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
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
          orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
        },
      },
    });
    if (!collection) {
      throw new NotFoundException(`Collection not found: ${slug}`);
    }

    const matching = sortMembersBySortOrder(collection.products).filter(
      (pc) =>
        !pc.product.archivedAt &&
        matchesGenderList(pc.product.category.slug, gender),
    );

    return {
      collection: slug,
      gender,
      productIds: matching.map((pc) => pc.productId),
    };
  }

  async setGenderOrder(
    slug: string,
    genderRaw: string | undefined,
    productIds: string[],
  ): Promise<CollectionGenderOrderDto> {
    const gender = parseGenderList(genderRaw);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('A lista de peças contém itens repetidos.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const collection = await tx.collection.findUnique({
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

        const members = new Map(collection.products.map((pc) => [pc.productId, pc]));
        const liveIds = productIds.filter((id) => !members.get(id)?.product.archivedAt);
        const uniqueIds = new Set(liveIds);
        const notInCollection = liveIds.filter((id) => !members.has(id));
        if (notInCollection.length > 0) {
          throw new BadRequestException(
            `Peças que não pertencem a esta coleção: ${notInCollection.join(', ')}`,
          );
        }

        const wrongGender = liveIds.filter((id) => {
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
        const extra = liveIds.filter((id) => !expectedSet.has(id));
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

        const membership = sortMembersBySortOrder(collection.products).map((pc) => pc.productId);
        const nextIds = mergeLiveOrderIntoMembership(membership, liveIds);
        const byId = new Map(collection.products.map((pc) => [pc.productId, pc] as const));

        const sortChanges: { productId: string; sortOrder: number }[] = [];
        for (let sortOrder = 0; sortOrder < nextIds.length; sortOrder++) {
          const productId = nextIds[sortOrder]!;
          const current = byId.get(productId);
          if (current && current.sortOrder === sortOrder) continue;
          sortChanges.push({ productId, sortOrder });
        }
        await applyMembershipSortOrdersTwoPhase(tx, collection.id, sortChanges);

        await syncDerivedGenderOrders(
          tx,
          collection.id,
          nextIds.map((productId) => {
            const row = byId.get(productId);
            if (!row) {
              throw new BadRequestException(`Unknown product id: ${productId}`);
            }
            return { productId, gender: row.product.category.slug };
          }),
        );

        return { collection: slug, gender, productIds: liveIds };
      },
      { timeout: 15_000 },
    );
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

function requireProductBySlug<T extends { slug: string }>(
  bySlug: Map<string, T>,
  slug: string,
): T {
  const product = bySlug.get(slug);
  if (!product) {
    throw new BadRequestException(`Unknown product slug: ${slug}`);
  }
  return product;
}

function productGenderSlug(product: {
  slug?: string;
  category?: { slug: string } | null;
}): string {
  const gender = product.category?.slug;
  if (!gender) {
    throw new BadRequestException(
      `Product missing category: ${product.slug ?? 'unknown'}`,
    );
  }
  return gender;
}

function uniqueSlugs(slugs: readonly string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of slugs) {
    const slug = raw.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    next.push(slug);
  }
  return next;
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
