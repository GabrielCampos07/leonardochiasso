import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import sharp from 'sharp';
import { MediaRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VARIANTS: { role: MediaRole; max: number }[] = [
  { role: MediaRole.thumb, max: 400 },
  { role: MediaRole.card, max: 800 },
  { role: MediaRole.pdp, max: 1600 },
  { role: MediaRole.zoom, max: 2400 },
];

@Injectable()
export class MediaService {
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly cdnBase: string;
  private readonly localMediaRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const endpoint = config.get<string>('STORAGE_ENDPOINT');
    const region = config.get<string>('STORAGE_REGION') ?? 'auto';
    const accessKey = config.get<string>('STORAGE_ACCESS_KEY');
    const secretKey = config.get<string>('STORAGE_SECRET_KEY');
    this.bucket = config.get<string>('STORAGE_BUCKET') ?? '';
    this.cdnBase = (config.get<string>('CDN_BASE_URL') ?? '').replace(/\/$/, '');
    this.localMediaRoot = path.join(process.cwd(), '..', 'src', 'assets', 'media');

    if (endpoint && accessKey && secretKey && this.bucket) {
      this.s3 = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      });
    } else {
      this.s3 = null;
    }
  }

  async presign(filename: string, mime: string) {
    const key = `originals/${randomUUID()}-${sanitize(filename)}`;
    if (!this.s3) {
      return {
        uploadUrl: null as string | null,
        storageKey: key,
        local: true,
        message: 'S3 not configured — use complete with base64 buffer in dev',
      };
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mime,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    return { uploadUrl, storageKey: key, local: false };
  }

  async complete(storageKey: string, altPt?: string, bufferBase64?: string) {
    if (bufferBase64) {
      await this.writeOriginalLocal(storageKey, Buffer.from(bufferBase64, 'base64'));
    }
    const original = await this.readOriginal(storageKey);
    const variants: { role: MediaRole; url: string; key: string }[] = [];

    for (const v of VARIANTS) {
      const buf = await sharp(original)
        .rotate()
        .resize({ width: v.max, height: v.max, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const variantKey = storageKey.replace(/^originals\//, `${v.role}/`).replace(/\.\w+$/, '.webp');
      const url = await this.storeBuffer(variantKey, buf, 'image/webp');
      variants.push({ role: v.role, url, key: variantKey });
    }

    const pdp = variants.find((v) => v.role === MediaRole.pdp) ?? variants[variants.length - 1]!;
    const asset = await this.prisma.mediaAsset.create({
      data: {
        storageKey: pdp.key,
        cdnUrl: pdp.url,
        mime: 'image/webp',
        altPt: altPt ?? null,
        role: MediaRole.pdp,
      },
    });

    return { asset, variants };
  }

  private async writeOriginalLocal(storageKey: string, body: Buffer): Promise<void> {
    const local = path.join(this.localMediaRoot, path.basename(storageKey));
    await fs.mkdir(path.dirname(local), { recursive: true });
    await fs.writeFile(local, body);
  }

  private async readOriginal(storageKey: string): Promise<Buffer> {
    if (this.s3) {
      try {
        const res = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
        );
        const bytes = await res.Body?.transformToByteArray();
        if (bytes?.length) return Buffer.from(bytes);
      } catch {
        /* fall through to local */
      }
      const local = path.join(this.localMediaRoot, path.basename(storageKey));
      try {
        return await fs.readFile(local);
      } catch {
        throw new Error(`Original not found for key: ${storageKey}`);
      }
    }
    const local = path.join(this.localMediaRoot, path.basename(storageKey));
    return fs.readFile(local);
  }

  private async storeBuffer(key: string, body: Buffer, mime: string): Promise<string> {
    if (this.s3 && this.bucket) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: mime,
        }),
      );
      return this.cdnBase ? `${this.cdnBase}/${key}` : `https://${this.bucket}/${key}`;
    }
    const out = path.join(this.localMediaRoot, '_uploads', key.replace(/\//g, '_'));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, body);
    return `assets/media/_uploads/${path.basename(out)}`;
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
