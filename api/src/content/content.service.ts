import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { archivedAtWhere } from '../admin/archive-query';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  list(kind: string, archived = false) {
    return this.prisma.contentDocument.findMany({
      where: { kind, ...archivedAtWhere(archived) },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });
  }

  async get(kind: string, slug: string, opts?: { includeArchived?: boolean }) {
    const row = await this.prisma.contentDocument.findUnique({
      where: { kind_slug: { kind, slug } },
    });
    if (!row) return null;
    if (!opts?.includeArchived && row.archivedAt) return null;
    return row;
  }

  async archive(kind: string, slug: string) {
    await this.requireDoc(kind, slug);
    return this.prisma.contentDocument.update({
      where: { kind_slug: { kind, slug } },
      data: { archivedAt: new Date() },
    });
  }

  async restore(kind: string, slug: string) {
    await this.requireDoc(kind, slug);
    return this.prisma.contentDocument.update({
      where: { kind_slug: { kind, slug } },
      data: { archivedAt: null },
    });
  }

  private async requireDoc(kind: string, slug: string) {
    const doc = await this.prisma.contentDocument.findUnique({
      where: { kind_slug: { kind, slug } },
    });
    if (!doc) throw new NotFoundException(`${kind}/${slug} not found`);
    return doc;
  }

  async patch(kind: string, slug: string, path: string, value: unknown) {
    const doc = await this.prisma.contentDocument.findUnique({
      where: { kind_slug: { kind, slug } },
    });
    if (!doc) throw new NotFoundException(`${kind}/${slug} not found`);
    const data = structuredClone(doc.data) as Record<string, unknown>;
    setNested(data, path, value);
    return this.prisma.contentDocument.update({
      where: { kind_slug: { kind, slug } },
      data: { data: data as Prisma.InputJsonValue },
    });
  }

  upsert(kind: string, slug: string, data: unknown, sortOrder = 0) {
    return this.prisma.contentDocument.upsert({
      where: { kind_slug: { kind, slug } },
      create: {
        kind,
        slug,
        data: (data ?? {}) as Prisma.InputJsonValue,
        sortOrder,
      },
      update: {
        data: (data ?? {}) as Prisma.InputJsonValue,
        sortOrder,
      },
    });
  }
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const seg = cur[key];
    if (seg == null || typeof seg !== 'object') {
      const nextKey = parts[i + 1]!;
      cur[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}
