import { NotFoundException } from '@nestjs/common';
import { AdminCollectionsService } from './admin-collections.service';

function collectionRow(over: Record<string, unknown> = {}) {
  return {
    id: 'col-1',
    slug: 'organic-dreams',
    name: 'Organic Dreams',
    description: null,
    sortOrder: 1,
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe('AdminCollectionsService archive', () => {
  const prisma = {
    collection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productCollection: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const service = new AdminCollectionsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists live collections by default', async () => {
    prisma.collection.findMany.mockResolvedValue([
      { ...collectionRow(), _count: { products: 3 } },
    ]);
    const list = await service.list(false);
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: null } }),
    );
    expect(list[0]?.productCount).toBe(3);
    expect(list[0]?.archivedAt).toBeNull();
  });

  it('uses the catalog thumb for Organic when members have no photos', async () => {
    prisma.collection.findMany.mockResolvedValue([
      { ...collectionRow(), _count: { products: 0 }, products: [] },
    ]);
    const list = await service.list(false);
    expect(list[0]?.coverImage).toContain('plp-calca-thumb.webp');
  });

  it('derives coverImage from the first live member photo', async () => {
    prisma.collection.findMany.mockResolvedValue([
      {
        ...collectionRow(),
        _count: { products: 2 },
        products: [
          {
            sortOrder: 0,
            product: {
              archivedAt: null,
              media: [
                {
                  sortOrder: 0,
                  isPrimary: true,
                  mediaAsset: {
                    cdnUrl:
                      'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev/pdp/plp-calca-thumb.webp',
                  },
                },
              ],
            },
          },
        ],
      },
    ]);
    const list = await service.list(false);
    expect(list[0]?.coverImage).toContain('plp-calca-thumb.webp');
  });

  it('archives the collection and leaves product_collections untouched', async () => {
    const now = new Date('2026-10-12T16:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    prisma.collection.findUnique.mockResolvedValue(collectionRow());
    prisma.productCollection.count.mockResolvedValue(4);
    prisma.collection.update.mockResolvedValue(
      collectionRow({ archivedAt: now }),
    );

    const dto = await service.archive('organic-dreams');
    expect(dto.archivedAt).toBe(now.toISOString());
    expect(dto.productCount).toBe(4);
    expect(prisma.productCollection.deleteMany).not.toHaveBeenCalled();
    expect(prisma.productCollection.createMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.collection.update).toHaveBeenCalledWith({
      where: { slug: 'organic-dreams' },
      data: { archivedAt: now },
    });
    jest.useRealTimers();
  });

  it('restores without rewriting the junction', async () => {
    prisma.collection.findUnique.mockResolvedValue(
      collectionRow({ archivedAt: new Date() }),
    );
    prisma.productCollection.count.mockResolvedValue(4);
    prisma.collection.update.mockResolvedValue(collectionRow({ archivedAt: null }));

    const dto = await service.restore('organic-dreams');
    expect(dto.archivedAt).toBeNull();
    expect(dto.productCount).toBe(4);
    expect(prisma.productCollection.deleteMany).not.toHaveBeenCalled();
  });

  it('hard-deletes a collection without touching member products', async () => {
    prisma.collection.findUnique.mockResolvedValue(collectionRow({ slug: 'casa' }));
    prisma.collection.delete.mockResolvedValue(collectionRow({ slug: 'casa' }));
    await service.remove('casa');
    expect(prisma.collection.delete).toHaveBeenCalledWith({ where: { id: 'col-1' } });
    expect(prisma.productCollection.deleteMany).not.toHaveBeenCalled();
  });

  it('404s when the collection is missing', async () => {
    prisma.collection.findUnique.mockResolvedValue(null);
    await expect(service.archive('sumiu')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.collection.update).not.toHaveBeenCalled();
  });

  it('returns every member slug in sortOrder, including archived', async () => {
    prisma.collection.findUnique.mockResolvedValue({
      ...collectionRow(),
      products: [
        { sortOrder: 0, product: { slug: 'arquivo' } },
        { sortOrder: 1, product: { slug: 'vestido' } },
      ],
    });
    await expect(service.getProducts('organic-dreams')).resolves.toEqual({
      productSlugs: ['arquivo', 'vestido'],
    });
  });
});
