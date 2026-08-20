/**
 * One-off: upload local `src/assets/media` images to S3/R2 and update MediaAsset.cdn_url.
 *
 * Usage (from repo root):
 *   cd api && npx tsx scripts/migrate-assets-to-s3.ts
 *
 * Requires STORAGE_* and CDN_BASE_URL in api/.env
 */
import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaClient, MediaRole } from '@prisma/client';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

const prisma = new PrismaClient();
const MEDIA_ROOT = path.join(process.cwd(), '..', 'src', 'assets', 'media');

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

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(jpe?g|png|webp|gif)$/i.test(e.name)) out.push(full);
  }
  return out;
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

async function main(): Promise<void> {
  const bucket = process.env.STORAGE_BUCKET;
  const cdnBase = (process.env.CDN_BASE_URL ?? '').replace(/\/$/, '');
  if (!bucket || !cdnBase) throw new Error('STORAGE_BUCKET and CDN_BASE_URL required');

  const s3 = s3Client();
  const files = await walk(MEDIA_ROOT);
  const urlMap = new Map<string, string>();

  for (const file of files) {
    const rel = path.relative(MEDIA_ROOT, file).replace(/\\/g, '/');
    const legacy = `assets/media/${rel}`;
    const buf = await fs.readFile(file);
    const cdnUrl = await uploadVariants(s3, bucket, cdnBase, rel, buf);
    urlMap.set(legacy, cdnUrl);
    // eslint-disable-next-line no-console
    console.log(`Uploaded ${rel} → ${cdnUrl}`);
  }

  const assets = await prisma.mediaAsset.findMany();
  let updated = 0;
  for (const asset of assets) {
    const legacy = asset.cdnUrl.replace(/^\//, '');
    const next = urlMap.get(legacy);
    if (next && next !== asset.cdnUrl) {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { cdnUrl: next, storageKey: next.replace(`${cdnBase}/`, '') },
      });
      updated++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. ${files.length} files uploaded, ${updated} MediaAsset rows updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
