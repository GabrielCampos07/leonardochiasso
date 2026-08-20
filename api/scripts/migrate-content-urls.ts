/**
 * Rewrite Neon JSON URLs from assets/media/... → CDN (no upload).
 * Run after migrate:assets and/or after manual video upload to R2.
 *
 *   cd api && npm run migrate:content-urls
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  buildUrlMap,
  rewriteDatabaseUrls,
  walkMedia,
} from './cdn-url-map';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const cdnBase = (process.env.CDN_BASE_URL ?? '').replace(/\/$/, '');
  if (!cdnBase) throw new Error('CDN_BASE_URL required');

  const files = await walkMedia();
  const urlMap = buildUrlMap(files, cdnBase);
  const stats = await rewriteDatabaseUrls(prisma, urlMap, cdnBase);

  // eslint-disable-next-line no-console
  console.log(
    `Done. ${files.length} local paths mapped → ` +
      `${stats.mediaAssets} media_assets, ${stats.contentDocs} content_documents, ${stats.products} products updated.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
