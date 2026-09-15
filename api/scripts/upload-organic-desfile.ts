/**
 * One-shot: upload Organic Dreams H.264 mp4 to R2 and rewrite Neon URLs.
 *   cd api && npx tsx scripts/upload-organic-desfile.ts
 */
import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { rewriteDatabaseUrls } from './cdn-url-map';

async function main(): Promise<void> {
  const bucket = process.env.STORAGE_BUCKET;
  const cdnBase = (process.env.CDN_BASE_URL ?? '').replace(/\/$/, '');
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKey = process.env.STORAGE_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_KEY;
  if (!bucket || !cdnBase || !endpoint || !accessKey || !secretKey) {
    throw new Error('STORAGE_BUCKET, CDN_BASE_URL, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY required');
  }

  const rel = 'alta-costura/organic-dreams-desfile.mp4';
  const abs = path.join(process.cwd(), '..', 'src', 'assets', 'media', rel);
  const key = `video/${rel}`;
  const buf = await fs.readFile(abs);
  // eslint-disable-next-line no-console
  console.log(`Uploading ${abs} (${buf.length} bytes) → ${key}`);

  const s3 = new S3Client({
    region: process.env.STORAGE_REGION ?? 'auto',
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: 'video/mp4',
    }),
  );

  const url = `${cdnBase}/${key}`;
  // eslint-disable-next-line no-console
  console.log(`Uploaded ${url}`);

  const prisma = new PrismaClient();
  try {
    const urlMap = new Map<string, string>([
      [`assets/media/${rel}`, url],
      ['assets/media/alta-costura/organic-dreams-desfile.MOV', url],
    ]);
    const stats = await rewriteDatabaseUrls(prisma, urlMap, cdnBase);
    // eslint-disable-next-line no-console
    console.log('DB updated', stats);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
