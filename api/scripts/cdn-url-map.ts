import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

export const MEDIA_ROOT = path.join(process.cwd(), '..', 'src', 'assets', 'media');

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_RE = /\.(mp4|mov)$/i;

export type MediaKind = 'image' | 'video';

export interface MediaFile {
  abs: string;
  rel: string;
  legacy: string;
  kind: MediaKind;
}

export async function walkMedia(root = MEDIA_ROOT): Promise<MediaFile[]> {
  const out: MediaFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }
      const kind = IMAGE_RE.test(e.name) ? 'image' : VIDEO_RE.test(e.name) ? 'video' : null;
      if (!kind) continue;
      const rel = path.relative(root, full).replace(/\\/g, '/');
      // Superseded by organic-dreams-desfile.mp4 (H.264 on CDN).
      if (/^alta-costura\/organic-dreams-desfile\.mov$/i.test(rel)) continue;
      const legacy = `assets/media/${rel}`;
      out.push({ abs: full, rel, legacy, kind });
    }
  }

  await walk(root);
  return out;
}

/** Expected public CDN URL for a legacy SPA asset path (no upload). */
export function legacyToCdnUrl(legacy: string, cdnBase: string): string | undefined {
  const normalized = legacy.replace(/^\//, '');
  if (!normalized.startsWith('assets/media/')) return undefined;
  const rel = normalized.slice('assets/media/'.length);
  if (VIDEO_RE.test(rel)) return `${cdnBase}/video/${rel}`;
  if (IMAGE_RE.test(rel)) return `${cdnBase}/pdp/${rel.replace(/\.\w+$/, '.webp')}`;
  return undefined;
}

export function buildUrlMap(files: MediaFile[], cdnBase: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    const url =
      f.kind === 'video'
        ? `${cdnBase}/video/${f.rel}`
        : `${cdnBase}/pdp/${f.rel.replace(/\.\w+$/, '.webp')}`;
    map.set(f.legacy, url);
  }
  return map;
}

function resolveUrl(value: string, urlMap: Map<string, string>, cdnBase: string): string {
  const normalized = value.replace(/^\//, '');
  // Organic Dreams full show was Hostinger-only HEVC .MOV; now H.264 on CDN.
  if (/assets\/media\/alta-costura\/organic-dreams-desfile\.mov$/i.test(normalized)) {
    return `${cdnBase.replace(/\/$/, '')}/video/alta-costura/organic-dreams-desfile.mp4`;
  }
  return urlMap.get(normalized) ?? legacyToCdnUrl(normalized, cdnBase) ?? value;
}

export function rewriteAssetUrlsWithBase(
  value: unknown,
  urlMap: Map<string, string>,
  cdnBase: string,
): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/^\//, '');
    if (normalized.startsWith('assets/media/')) {
      return resolveUrl(normalized, urlMap, cdnBase);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteAssetUrlsWithBase(item, urlMap, cdnBase));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteAssetUrlsWithBase(v, urlMap, cdnBase);
    }
    return out;
  }
  return value;
}

export async function rewriteDatabaseUrls(
  prisma: PrismaClient,
  urlMap: Map<string, string>,
  cdnBase: string,
): Promise<{ mediaAssets: number; contentDocs: number; products: number }> {
  let mediaAssets = 0;
  let contentDocs = 0;
  let products = 0;

  const assets = await prisma.mediaAsset.findMany();
  for (const asset of assets) {
    const legacy = asset.cdnUrl.replace(/^\//, '');
    const next =
      urlMap.get(legacy) ??
      (legacy.startsWith('assets/media/') ? legacyToCdnUrl(legacy, cdnBase) : undefined);
    if (next && next !== asset.cdnUrl) {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { cdnUrl: next, storageKey: next.replace(`${cdnBase}/`, '') },
      });
      mediaAssets++;
    }
  }

  const docs = await prisma.contentDocument.findMany();
  for (const doc of docs) {
    const next = rewriteAssetUrlsWithBase(doc.data, urlMap, cdnBase);
    if (JSON.stringify(next) !== JSON.stringify(doc.data)) {
      await prisma.contentDocument.update({
        where: { id: doc.id },
        data: { data: next as Prisma.InputJsonValue },
      });
      contentDocs++;
    }
  }

  const catalog = await prisma.product.findMany({
    select: { id: true, pieces: true, colorVariants: true },
  });
  for (const p of catalog) {
    const nextPieces = rewriteAssetUrlsWithBase(p.pieces, urlMap, cdnBase);
    const nextColors = rewriteAssetUrlsWithBase(p.colorVariants, urlMap, cdnBase);
    if (
      JSON.stringify(nextPieces) !== JSON.stringify(p.pieces) ||
      JSON.stringify(nextColors) !== JSON.stringify(p.colorVariants)
    ) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          pieces: nextPieces as Prisma.InputJsonValue,
          colorVariants: nextColors as Prisma.InputJsonValue,
        },
      });
      products++;
    }
  }

  return { mediaAssets, contentDocs, products };
}
