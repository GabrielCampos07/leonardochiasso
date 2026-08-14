import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(customerId: string): Promise<string[]> {
    const items = await this.prisma.wishlistItem.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
      select: { productSlug: true },
    });
    return items.map((item) => item.productSlug);
  }

  /** Replaces the stored list with `productSlugs`; reads come back in insertion order. */
  async replace(customerId: string, productSlugs: string[]): Promise<string[]> {
    const unique = [...new Set(productSlugs)];
    await this.prisma.$transaction([
      this.prisma.wishlistItem.deleteMany({
        where: unique.length
          ? { customerId, productSlug: { notIn: unique } }
          : { customerId },
      }),
      this.prisma.wishlistItem.createMany({
        data: unique.map((productSlug) => ({ customerId, productSlug })),
        skipDuplicates: true,
      }),
    ]);
    return this.list(customerId);
  }

  async add(customerId: string, productSlug: string): Promise<string[]> {
    await this.prisma.wishlistItem.createMany({
      data: [{ customerId, productSlug }],
      skipDuplicates: true,
    });
    return this.list(customerId);
  }

  async remove(customerId: string, productSlug: string): Promise<string[]> {
    await this.prisma.wishlistItem.deleteMany({
      where: { customerId, productSlug },
    });
    return this.list(customerId);
  }
}
