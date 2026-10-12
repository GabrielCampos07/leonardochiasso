import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { AdminProductsService } from './admin-products.service';

function productRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'vestido',
    name: 'Vestido',
    description: '',
    details: [],
    shippingCopy: null,
    priceCents: 720000,
    currency: 'BRL',
    color: null,
    size: null,
    fabric: null,
    season: null,
    status: ProductStatus.published,
    stockQty: 2,
    categoryId: 'c1',
    pieces: [],
    colorVariants: [],
    imageBindings: [],
    artCouture: false,
    recommendOrder: 0,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { slug: 'feminino' },
    collections: [],
    media: [],
    ...over,
  };
}

describe('AdminProductsService archive', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new AdminProductsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists live products by default and archived when asked', async () => {
    prisma.product.findMany.mockResolvedValue([productRow()]);
    await service.list(false);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: null } }),
    );

    prisma.product.findMany.mockResolvedValue([
      productRow({ archivedAt: new Date('2026-10-12T12:00:00Z') }),
    ]);
    const archived = await service.list(true);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: { not: null } } }),
    );
    expect(archived[0]?.archivedAt).toBe('2026-10-12T12:00:00.000Z');
  });

  it('archives without deleting the product', async () => {
    const now = new Date('2026-10-12T15:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', slug: 'vestido' });
    prisma.product.update.mockResolvedValue(
      productRow({ archivedAt: now }),
    );

    const dto = await service.archive('vestido');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'vestido' },
        data: { archivedAt: now },
      }),
    );
    expect(dto.archivedAt).toBe(now.toISOString());
    expect(prisma.product.findUnique).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('restores by clearing archivedAt', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', slug: 'vestido' });
    prisma.product.update.mockResolvedValue(productRow({ archivedAt: null }));
    const dto = await service.restore('vestido');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'vestido' },
        data: { archivedAt: null },
      }),
    );
    expect(dto.archivedAt).toBeNull();
  });

  it('404s when the slug is missing', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.archive('sumiu')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});
