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
import {
  AttachProductMediaDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/admin-products.dto';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      include: publishedProductInclude,
      orderBy: [{ recommendOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return products.map(mapProduct);
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const category = await this.prisma.category.findUnique({
      where: { slug: dto.category },
    });
    if (!category) {
      throw new BadRequestException(`Unknown category: ${dto.category}`);
    }

    const collection = await this.prisma.collection.findUnique({
      where: { slug: dto.collectionSlug },
    });
    if (!collection) {
      throw new BadRequestException(
        `Unknown collection: ${dto.collectionSlug}`,
      );
    }

    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Product slug already exists: ${dto.slug}`);
    }

    const maxPc = await this.prisma.productCollection.aggregate({
      where: { collectionId: collection.id },
      _max: { sortOrder: true },
    });
    const nextSort = (maxPc._max.sortOrder ?? -1) + 1;

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
      },
      include: publishedProductInclude,
    });

    return mapProduct(created);
  }

  async update(slug: string, dto: UpdateProductDto): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { collections: true },
    });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);

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

    if (dto.category !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { slug: dto.category },
      });
      if (!category) {
        throw new BadRequestException(`Unknown category: ${dto.category}`);
      }
      data.category = { connect: { id: category.id } };
    }

    if (dto.collectionSlug !== undefined) {
      const collection = await this.prisma.collection.findUnique({
        where: { slug: dto.collectionSlug },
      });
      if (!collection) {
        throw new BadRequestException(
          `Unknown collection: ${dto.collectionSlug}`,
        );
      }
      const existingLink = product.collections.find(
        (pc) => pc.collectionId === collection.id,
      );
      const maxPc = await this.prisma.productCollection.aggregate({
        where: { collectionId: collection.id },
        _max: { sortOrder: true },
      });
      const sortOrder =
        existingLink?.sortOrder ?? (maxPc._max.sortOrder ?? -1) + 1;

      await this.prisma.$transaction([
        this.prisma.productCollection.deleteMany({
          where: { productId: product.id },
        }),
        this.prisma.productCollection.create({
          data: {
            productId: product.id,
            collectionId: collection.id,
            sortOrder,
          },
        }),
      ]);
    }

    const updated = await this.prisma.product.update({
      where: { slug },
      data,
      include: publishedProductInclude,
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
        `Unknown product slugs: ${missing.join(', ')}`,
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
