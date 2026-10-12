import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { CatalogService } from './catalog.service';

describe('CatalogService public archive filters', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    collection: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const service = new CatalogService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only published, non-archived products', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    await service.listProducts();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ProductStatus.published, archivedAt: null },
      }),
    );
  });

  it('404s an archived product PDP', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.getProductBySlug('vestido')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'vestido',
          status: ProductStatus.published,
          archivedAt: null,
        },
      }),
    );
  });

  it('hides archived collections from the public list and detail', async () => {
    prisma.collection.findMany.mockResolvedValue([]);
    await service.listCollections();
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: null } }),
    );

    prisma.collection.findFirst.mockResolvedValue(null);
    await expect(service.getCollectionBySlug('organic-dreams')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'organic-dreams', archivedAt: null },
      }),
    );
  });
});
