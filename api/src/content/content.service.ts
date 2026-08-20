import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  list(kind: string) {
    return this.prisma.contentDocument.findMany({
      where: { kind },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });
  }

  get(kind: string, slug: string) {
    return this.prisma.contentDocument.findUnique({
      where: { kind_slug: { kind, slug } },
    });
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
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}
