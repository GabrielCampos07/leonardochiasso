/**
 * Enrich seeded products + content documents from Angular static data.
 * Called at the end of prisma/seed.ts.
 */
import { PrismaClient, Prisma } from '@prisma/client';

type ProductLike = {
  slug: string;
  pieces?: unknown[];
  colorVariants?: unknown[];
  imageBindings?: unknown[];
  artCouture?: boolean;
  recommendOrder?: number;
};

function inferBindings(
  product: ProductLike & { gallery?: string[] },
): unknown[] {
  const gallery = product.gallery ?? [];
  const bindings: unknown[] = [];
  for (const piece of (product.pieces ?? []) as Array<{
    id: string;
    thumb?: string;
    imageFocus?: string;
  }>) {
    const idx = piece.thumb ? gallery.indexOf(piece.thumb) : -1;
    if (idx >= 0) {
      bindings.push({ pieceId: piece.id, galleryIndex: idx });
    } else if (piece.imageFocus) {
      bindings.push({ pieceId: piece.id, imageFocus: piece.imageFocus });
    }
  }
  return bindings;
}

export async function enrichCatalogFromFrontend(prisma: PrismaClient): Promise<void> {
  const { PRODUCTS } = await import('../../src/app/core/products');
  for (const p of PRODUCTS) {
    const bindings =
      (p.imageBindings?.length ? p.imageBindings : inferBindings({ ...p, gallery: p.gallery })) ??
      [];
    await prisma.product.updateMany({
      where: { slug: p.slug },
      data: {
        pieces: (p.pieces ?? []) as unknown as Prisma.InputJsonValue,
        colorVariants: (p.colorVariants ?? []) as unknown as Prisma.InputJsonValue,
        imageBindings: bindings as unknown as Prisma.InputJsonValue,
        artCouture: p.artCouture ?? false,
        recommendOrder: (p as { recommendOrder?: number }).recommendOrder ?? 9990,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Enriched ${PRODUCTS.length} products with pieces/bindings from frontend catalog.`);
}

export async function seedContentDocuments(prisma: PrismaClient): Promise<void> {
  const { JOIAS_PIECES } = await import('../../src/app/core/joias.data');
  const { ART_SERIES } = await import('../../src/app/core/arte.data');
  const { ARTCOUTURE_WEARERS } = await import(
    '../../src/app/pages/alta-costura/artcouture-wearers.data'
  );
  const { LOOKBOOKS } = await import('../../src/app/pages/alta-costura/lookbook.data');
  const { ALTA_DESFILES } = await import('../../src/app/pages/alta-costura/alta-costura.data');

  for (const [i, piece] of JOIAS_PIECES.entries()) {
    const { slug, ...data } = piece;
    await upsertDoc(prisma, 'joia', slug, data, i);
  }

  for (const [i, series] of ART_SERIES.entries()) {
    await upsertDoc(prisma, 'arte-series', series.id, series, i);
  }

  for (const [i, wearer] of ARTCOUTURE_WEARERS.entries()) {
    await upsertDoc(prisma, 'wearer', wearer.id, wearer, i);
  }

  for (const [i, lb] of LOOKBOOKS.entries()) {
    await upsertDoc(prisma, 'lookbook', lb.slug, lb, i);
  }

  for (const [i, d] of ALTA_DESFILES.entries()) {
    await upsertDoc(prisma, 'desfile', d.slug, d, i);
  }

  // eslint-disable-next-line no-console
  console.log('Seeded content documents (joias, arte, wearers, lookbooks, desfiles).');
}

async function upsertDoc(
  prisma: PrismaClient,
  kind: string,
  slug: string,
  data: unknown,
  sortOrder: number,
): Promise<void> {
  await prisma.contentDocument.upsert({
    where: { kind_slug: { kind, slug } },
    create: { kind, slug, data: data as Prisma.InputJsonValue, sortOrder },
    update: { data: data as Prisma.InputJsonValue, sortOrder },
  });
}
