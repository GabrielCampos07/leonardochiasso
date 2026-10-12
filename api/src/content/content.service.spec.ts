import { NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';

function joiaRow(over: Record<string, unknown> = {}) {
  return {
    id: 'j1',
    kind: 'joia',
    slug: 'colar-dentes',
    data: { title: 'Colar Dentes' },
    sortOrder: 0,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe('ContentService joia archive', () => {
  const prisma = {
    contentDocument: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new ContentService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists live joias by default', async () => {
    prisma.contentDocument.findMany.mockResolvedValue([joiaRow()]);
    await service.list('joia');
    expect(prisma.contentDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { kind: 'joia', archivedAt: null },
      }),
    );
  });

  it('hides an archived joia from the public get', async () => {
    prisma.contentDocument.findUnique.mockResolvedValue(
      joiaRow({ archivedAt: new Date() }),
    );
    await expect(service.get('joia', 'colar-dentes')).resolves.toBeNull();
  });

  it('archives and restores a joia document', async () => {
    const now = new Date('2026-10-12T17:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    prisma.contentDocument.findUnique.mockResolvedValue(joiaRow());
    prisma.contentDocument.update.mockResolvedValue(
      joiaRow({ archivedAt: now }),
    );
    const archived = await service.archive('joia', 'colar-dentes');
    expect(prisma.contentDocument.update).toHaveBeenCalledWith({
      where: { kind_slug: { kind: 'joia', slug: 'colar-dentes' } },
      data: { archivedAt: now },
    });
    expect(archived.archivedAt).toEqual(now);

    prisma.contentDocument.update.mockResolvedValue(joiaRow({ archivedAt: null }));
    const restored = await service.restore('joia', 'colar-dentes');
    expect(prisma.contentDocument.update).toHaveBeenCalledWith({
      where: { kind_slug: { kind: 'joia', slug: 'colar-dentes' } },
      data: { archivedAt: null },
    });
    expect(restored.archivedAt).toBeNull();
    jest.useRealTimers();
  });

  it('404s archive when the joia is missing', async () => {
    prisma.contentDocument.findUnique.mockResolvedValue(null);
    await expect(service.archive('joia', 'sumiu')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
