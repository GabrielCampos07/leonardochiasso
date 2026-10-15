import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapProduct,
  publishedProductInclude,
} from '../catalog/catalog.mapper';
import { ProductDto } from '../catalog/dto/catalog.dto';
import { archivedAtWhere } from './archive-query';
import { listsForProductGender } from '../catalog/gender';
import { syncProductGenderOrders } from './collection-gender-order.sync';
import {
  AttachProductMediaDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/admin-products.dto';

export const MULTI_COLLECTION_CHANGE_BLOCKED =
  'Esta peça está em mais de uma coleção; a troca de coleção está bloqueada.';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(archived = false): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: archivedAtWhere(archived),
      include: publishedProductInclude,
      orderBy: [{ recommendOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return products.map(mapProduct);
  }

  async archive(slug: string): Promise<ProductDto> {
    await this.requireProduct(slug);
    const updated = await this.prisma.product.update({
      where: { slug },
      data: { archivedAt: new Date() },
      include: publishedProductInclude,
    });
    return mapProduct(updated);
  }

  async restore(slug: string): Promise<ProductDto> {
    await this.requireProduct(slug);
    const updated = await this.prisma.product.update({
      where: { slug },
      data: { archivedAt: null },
      include: publishedProductInclude,
    });
    return mapProduct(updated);
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    if (dto.gender) dto.category = dto.gender;
    delete dto.gender;
    // Lookups independentes em paralelo (categoria, coleção, slug existente e
    // o maior sortOrder da coleção — este filtrado pela relação, sem depender
    // do id da coleção). A ordem de validação/erros abaixo é mantida.
    const [category, collection, existing, maxPc] = await Promise.all([
      this.prisma.category.findUnique({ where: { slug: dto.category } }),
      this.prisma.collection.findUnique({ where: { slug: dto.collectionSlug } }),
      this.prisma.product.findUnique({ where: { slug: dto.slug } }),
      this.prisma.productCollection.aggregate({
        where: { collection: { slug: dto.collectionSlug } },
        _max: { sortOrder: true },
      }),
    ]);

    if (!category) {
      throw new BadRequestException(`Unknown category: ${dto.category}`);
    }
    if (!collection) {
      throw new BadRequestException(
        `Unknown collection: ${dto.collectionSlug}`,
      );
    }
    if (existing) {
      throw new ConflictException(`Product slug already exists: ${dto.slug}`);
    }

    const nextSort = (maxPc._max.sortOrder ?? -1) + 1;
    const genderLists = listsForProductGender(dto.category);
    const maxGenderOrders =
      genderLists.length > 0
        ? await this.prisma.collectionGenderOrder.groupBy({
            by: ['gender'],
            where: { collectionId: collection.id, gender: { in: genderLists } },
            _max: { sortOrder: true },
          })
        : [];
    const nextGenderSort = new Map(
      maxGenderOrders.map((row) => [
        row.gender,
        (row._max.sortOrder ?? -1) + 1,
      ]),
    );

    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? '',
        priceCents: dto.priceCents,
        status: dto.status ?? ProductStatus.draft,
        color: dto.color ?? null,
        size: dto.size ?? null,
        fabric: dto.fabric ?? null,
        season: dto.season ?? null,
        stockQty: dto.stockQty ?? 0,
        artCouture: dto.artCouture ?? false,
        recommendOrder: dto.recommendOrder ?? 9990,
        categoryId: category.id,
        collections: {
          create: {
            collectionId: collection.id,
            sortOrder: nextSort,
          },
        },
        genderOrders: {
          create: genderLists.map((gender) => ({
            collectionId: collection.id,
            gender,
            sortOrder: nextGenderSort.get(gender) ?? 0,
          })),
        },
      },
      include: publishedProductInclude,
    });

    return mapProduct(created);
  }

  async update(slug: string, dto: UpdateProductDto): Promise<ProductDto> {
    if (dto.gender) dto.category = dto.gender;
    delete dto.gender;
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, slug: true } },
        collections: {
          include: { collection: { select: { slug: true } } },
          orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
        },
      },
    });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);

    const categoryUnchanged =
      dto.category === undefined || dto.category === product.category.slug;
    const currentCollectionSlug = product.collections[0]?.collection.slug;
    const collectionUnchanged =
      dto.collectionSlug === undefined ||
      dto.collectionSlug === currentCollectionSlug;

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.shippingCopy !== undefined) data.shippingCopy = dto.shippingCopy;
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.size !== undefined) data.size = dto.size;
    if (dto.fabric !== undefined) data.fabric = dto.fabric;
    if (dto.season !== undefined) data.season = dto.season;
    if (dto.stockQty !== undefined) data.stockQty = dto.stockQty;
    if (dto.artCouture !== undefined) data.artCouture = dto.artCouture;
    if (dto.recommendOrder !== undefined) data.recommendOrder = dto.recommendOrder;
    if (dto.details !== undefined) {
      data.details = dto.details as Prisma.InputJsonValue;
    }
    if (dto.pieces !== undefined) {
      data.pieces = dto.pieces as Prisma.InputJsonValue;
    }
    if (dto.colorVariants !== undefined) {
      data.colorVariants = dto.colorVariants as Prisma.InputJsonValue;
    }
    if (dto.imageBindings !== undefined) {
      data.imageBindings = dto.imageBindings as Prisma.InputJsonValue;
    }

    if (dto.slug !== undefined && dto.slug !== slug) {
      const clash = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (clash) {
        throw new ConflictException(`Product slug already exists: ${dto.slug}`);
      }
      data.slug = dto.slug;
    }

    if (!categoryUnchanged) {
      const category = await this.prisma.category.findUnique({
        where: { slug: dto.category },
      });
      if (!category) {
        throw new BadRequestException(`Unknown category: ${dto.category}`);
      }
      data.category = { connect: { id: category.id } };
    }

    if (!collectionUnchanged) {
      if (product.collections.length > 1) {
        throw new BadRequestException(MULTI_COLLECTION_CHANGE_BLOCKED);
      }
      return this.updateMovingCollection(slug, product, dto.collectionSlug!, data);
    }

    const updated = await this.prisma.product.update({
      where: { slug },
      data,
      include: publishedProductInclude,
    });

    if (!categoryUnchanged) {
      await syncProductGenderOrders(this.prisma, updated.id);
    }

    return mapProduct(updated);
  }

  /**
   * Move the one join row to the end of the new collection
   * (`max(sortOrder)+1`). Row update, product.update, gender-order sync and
   * the max+1 aggregate run in a single `$transaction`. Never delete/recreate.
   */
  private async updateMovingCollection(
    slug: string,
    product: {
      id: string;
      collections: { productId: string; collectionId: string; sortOrder: number }[];
    },
    collectionSlug: string,
    data: Prisma.ProductUpdateInput,
  ): Promise<ProductDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug: collectionSlug },
    });
    if (!collection) {
      throw new BadRequestException(`Unknown collection: ${collectionSlug}`);
    }

    const current = product.collections[0];
    if (current?.collectionId === collection.id) {
      const updated = await this.prisma.product.update({
        where: { slug },
        data,
        include: publishedProductInclude,
      });
      return mapProduct(updated);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const maxPc = await tx.productCollection.aggregate({
        where: { collectionId: collection.id },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxPc._max.sortOrder ?? -1) + 1;

      if (current) {
        await tx.productCollection.update({
          where: {
            productId_collectionId: {
              productId: product.id,
              collectionId: current.collectionId,
            },
          },
          data: { collectionId: collection.id, sortOrder },
        });
      } else {
        await tx.productCollection.create({
          data: {
            productId: product.id,
            collectionId: collection.id,
            sortOrder,
          },
        });
      }

      const next = await tx.product.update({
        where: { slug },
        data,
        include: publishedProductInclude,
      });
      await syncProductGenderOrders(tx, next.id);
      return next;
    });

    return mapProduct(updated);
  }

  async patchBySlug(
    slug: string,
    path: string,
    value: unknown,
  ): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: publishedProductInclude,
    });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);

    const data: Prisma.ProductUpdateInput = {};
    if (path === 'name' && typeof value === 'string') data.name = value;
    else if (path === 'description' && typeof value === 'string')
      data.description = value;
    else if (path === 'color' && typeof value === 'string') data.color = value;
    else if (path === 'details') data.details = value as Prisma.InputJsonValue;
    else if (path === 'pieces') data.pieces = value as Prisma.InputJsonValue;
    else if (path === 'colorVariants')
      data.colorVariants = value as Prisma.InputJsonValue;
    else if (path === 'imageBindings')
      data.imageBindings = value as Prisma.InputJsonValue;
    else {
      const clone = structuredClone({
        name: product.name,
        description: product.description,
        color: product.color,
        details: product.details,
        pieces: product.pieces,
        colorVariants: product.colorVariants,
        imageBindings: product.imageBindings,
      }) as Record<string, unknown>;
      const normalizedPath = path.startsWith('colors.')
        ? path.replace(/^colors\./, 'colorVariants.')
        : path;
      setNested(clone, normalizedPath, value);
      if (typeof clone['name'] === 'string') data.name = clone['name'];
      if (typeof clone['description'] === 'string')
        data.description = clone['description'];
      if (typeof clone['color'] === 'string') data.color = clone['color'];
      if (clone['details'] != null)
        data.details = clone['details'] as Prisma.InputJsonValue;
      if (clone['pieces'] != null)
        data.pieces = clone['pieces'] as Prisma.InputJsonValue;
      if (clone['colorVariants'] != null) {
        data.colorVariants = clone['colorVariants'] as Prisma.InputJsonValue;
      }
      if (clone['imageBindings'] != null) {
        data.imageBindings = clone['imageBindings'] as Prisma.InputJsonValue;
      }
    }

    const updated = await this.prisma.product.update({
      where: { slug },
      data,
      include: publishedProductInclude,
    });
    return mapProduct(updated);
  }

  async reorder(orderedSlugs: string[]): Promise<{ updated: number }> {
    const products = await this.prisma.product.findMany({
      where: { slug: { in: orderedSlugs } },
      select: { id: true, slug: true },
    });
    if (products.length !== orderedSlugs.length) {
      const found = new Set(products.map((p) => p.slug));
      const missing = orderedSlugs.filter((s) => !found.has(s));
      throw new BadRequestException(
        missing.length === 0
          ? 'A lista de peças contém slugs repetidos.'
          : `Unknown product slugs: ${missing.join(', ')}`,
      );
    }

    const bySlug = new Map(products.map((p) => [p.slug, p.id]));
    await this.prisma.$transaction(
      orderedSlugs.map((slug, index) =>
        this.prisma.product.update({
          where: { id: bySlug.get(slug)! },
          data: { recommendOrder: index },
        }),
      ),
    );
    return { updated: orderedSlugs.length };
  }

  async reorderMedia(slug: string, mediaIds: string[]): Promise<ProductDto> {
    const product = await this.requireProduct(slug);
    const links = await this.prisma.productMedia.findMany({
      where: { productId: product.id },
    });
    const linked = new Set(links.map((l) => l.mediaAssetId));
    const missing = mediaIds.filter((id) => !linked.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Media not attached to product: ${missing.join(', ')}`,
      );
    }
    if (mediaIds.length !== links.length) {
      throw new BadRequestException(
        'mediaIds must include every attached media asset exactly once.',
      );
    }

    await this.prisma.$transaction(
      mediaIds.map((mediaAssetId, index) =>
        this.prisma.productMedia.update({
          where: {
            productId_mediaAssetId: {
              productId: product.id,
              mediaAssetId,
            },
          },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getMapped(slug);
  }

  async attachMedia(
    slug: string,
    dto: AttachProductMediaDto,
  ): Promise<ProductDto> {
    const product = await this.requireProduct(slug);
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: dto.mediaAssetId },
    });
    if (!asset) {
      throw new NotFoundException(`MediaAsset not found: ${dto.mediaAssetId}`);
    }

    const existing = await this.prisma.productMedia.findUnique({
      where: {
        productId_mediaAssetId: {
          productId: product.id,
          mediaAssetId: dto.mediaAssetId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Media already attached to this product.');
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const max = await this.prisma.productMedia.aggregate({
        where: { productId: product.id },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    if (dto.isPrimary) {
      await this.prisma.productMedia.updateMany({
        where: { productId: product.id },
        data: { isPrimary: false },
      });
    }

    await this.prisma.productMedia.create({
      data: {
        productId: product.id,
        mediaAssetId: dto.mediaAssetId,
        sortOrder,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    return this.getMapped(slug);
  }

  async detachMedia(slug: string, mediaAssetId: string): Promise<ProductDto> {
    const product = await this.requireProduct(slug);
    const link = await this.prisma.productMedia.findUnique({
      where: {
        productId_mediaAssetId: {
          productId: product.id,
          mediaAssetId,
        },
      },
    });
    if (!link) {
      throw new NotFoundException(
        `Media link not found for product ${slug}: ${mediaAssetId}`,
      );
    }

    await this.prisma.productMedia.delete({
      where: {
        productId_mediaAssetId: {
          productId: product.id,
          mediaAssetId,
        },
      },
    });

    return this.getMapped(slug);
  }

  private async requireProduct(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return product;
  }

  private async getMapped(slug: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: publishedProductInclude,
    });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return mapProduct(product);
  }
}

function setNested(
  root: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const nextKey = parts[i + 1]!;
    const nextIsIndex = /^\d+$/.test(nextKey);
    if (Array.isArray(cur)) {
      const idx = Number(key);
      if (cur[idx] == null || typeof cur[idx] !== 'object') {
        cur[idx] = nextIsIndex ? [] : {};
      }
      cur = cur[idx];
    } else if (cur && typeof cur === 'object') {
      const rec = cur as Record<string, unknown>;
      if (rec[key] == null || typeof rec[key] !== 'object') {
        rec[key] = nextIsIndex ? [] : {};
      }
      cur = rec[key];
    }
  }
  const last = parts[parts.length - 1]!;
  if (Array.isArray(cur)) {
    cur[Number(last)] = value;
  } else if (cur && typeof cur === 'object') {
    (cur as Record<string, unknown>)[last] = value;
  }
}
