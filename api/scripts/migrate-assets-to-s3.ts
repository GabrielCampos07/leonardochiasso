/**
 * Upload local `src/assets/media` to R2 and rewrite Neon URLs to CDN.
 *
 *   cd api && npm run migrate:assets          # upload images + videos + DB
 *   cd api && npm run migrate:content-urls    # DB only (after manual video upload)
 *
 * Requires STORAGE_* and CDN_BASE_URL in api/.env
 *
 * Manual videos on R2: upload to bucket key `video/{path}` matching local layout, e.g.
 *   video/joias/joias-intro.mp4  →  {CDN_BASE_URL}/video/joias/joias-intro.mp4
 * Then run migrate:content-urls.
 */
import 'dotenv/config';
import * as fs from 'node:fs/promises';
import { PrismaClient, MediaRole } from '@prisma/client';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import {
  buildUrlMap,
  rewriteDatabaseUrls,
  walkMedia,
} from './cdn-url-map';

const prisma = new PrismaClient();

const VARIANTS: { role: MediaRole; max: number }[] = [
  { role: MediaRole.thumb, max: 400 },
  { role: MediaRole.card, max: 800 },
  { role: MediaRole.pdp, max: 1600 },
  { role: MediaRole.zoom, max: 2400 },
];

function s3Client(): S3Client {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const region = process.env.STORAGE_REGION ?? 'auto';
  const accessKey = process.env.STORAGE_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY required');
  }
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
}

function videoContentType(name: string): string {
  if (/\.mp4$/i.test(name)) return 'video/mp4';
  if (/\.mov$/i.test(name)) return 'video/quicktime';
  return 'application/octet-stream';
}

async function uploadVariants(
  s3: S3Client,
  bucket: string,
  cdnBase: string,
  relKey: string,
  buf: Buffer,
): Promise<string> {
  let pdpUrl = '';
  for (const v of VARIANTS) {
    const variantBuf = await sharp(buf)
      .rotate()
      .resize({ width: v.max, height: v.max, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const key = `${v.role}/${relKey.replace(/\.\w+$/, '.webp')}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: variantBuf,
        ContentType: 'image/webp',
      }),
    );
    const url = `${cdnBase}/${key}`;
    if (v.role === MediaRole.pdp) pdpUrl = url;
  }
  return pdpUrl;
}

async function uploadVideo(
  s3: S3Client,
  bucket: string,
  cdnBase: string,
  relKey: string,
  buf: Buffer,
): Promise<string> {
  const key = `video/${relKey}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: videoContentType(relKey),
    }),
  );
  return `${cdnBase}/${key}`;
}

async function main(): Promise<void> {
  const bucket = process.env.STORAGE_BUCKET;
  const cdnBase = (process.env.CDN_BASE_URL ?? '').replace(/\/$/, '');
  if (!bucket || !cdnBase) throw new Error('STORAGE_BUCKET and CDN_BASE_URL required');

  const skipUpload = process.argv.includes('--content-only');
  const files = await walkMedia();
  const urlMap = buildUrlMap(files, cdnBase);

  const videosOnly = process.argv.includes('--videos-only');
  const imagesOnly = process.argv.includes('--images-only');

  if (!skipUpload) {
    const s3 = s3Client();
    let images = 0;
    let videos = 0;
    for (const file of files) {
      if (videosOnly && file.kind !== 'video') continue;
      if (imagesOnly && file.kind !== 'image') continue;
      const buf = await fs.readFile(file.abs);
      if (file.kind === 'image') {
        const cdnUrl = await uploadVariants(s3, bucket, cdnBase, file.rel, buf);
        urlMap.set(file.legacy, cdnUrl);
        images++;
        // eslint-disable-next-line no-console
        console.log(`Uploaded ${file.rel} → ${cdnUrl}`);
      } else {
        const cdnUrl = await uploadVideo(s3, bucket, cdnBase, file.rel, buf);
        urlMap.set(file.legacy, cdnUrl);
        videos++;
        // eslint-disable-next-line no-console
        console.log(`Uploaded video ${file.rel} → ${cdnUrl}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`Upload complete: ${images} images, ${videos} videos.`);
  }

  const stats = await rewriteDatabaseUrls(prisma, urlMap, cdnBase);
  // eslint-disable-next-line no-console
  console.log(
    `DB updated: ${stats.mediaAssets} media_assets, ${stats.contentDocs} content_documents, ${stats.products} products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
