import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapProduct,
  publishedProductInclude,
} from '../catalog/catalog.mapper';
import { ProductDto } from '../catalog/dto/catalog.dto';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
    else if (path === 'description' && typeof value === 'string') data.description = value;
    else if (path === 'color' && typeof value === 'string') data.color = value;
    else if (path === 'pieces') data.pieces = value as Prisma.InputJsonValue;
    else if (path === 'colorVariants') data.colorVariants = value as Prisma.InputJsonValue;
    else if (path === 'imageBindings') data.imageBindings = value as Prisma.InputJsonValue;
    else {
      const clone = structuredClone({
        name: product.name,
        description: product.description,
        color: product.color,
        pieces: product.pieces,
        colorVariants: product.colorVariants,
        imageBindings: product.imageBindings,
      }) as Record<string, unknown>;
      const normalizedPath = path.startsWith('colors.') ? path.replace(/^colors\./, 'colorVariants.') : path;
      setNested(clone, normalizedPath, value);
      if (typeof clone['name'] === 'string') data.name = clone['name'];
      if (typeof clone['description'] === 'string') data.description = clone['description'];
      if (typeof clone['color'] === 'string') data.color = clone['color'];
      if (clone['pieces'] != null) data.pieces = clone['pieces'] as Prisma.InputJsonValue;
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
}

function setNested(root: Record<string, unknown>, path: string, value: unknown): void {
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
