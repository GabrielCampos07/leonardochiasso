import { CanvasTexture, SRGBColorSpace } from 'three';
import { isDraftStatus, isSoldOut } from '../types';

export type BoxBadgeKind = 'draft' | 'soldout' | 'stock';

export interface BoxBadge {
  kind: BoxBadgeKind;
  text: string;
  fill: string;
  color: string;
}

export const BADGE_TEXTURE_W = 512;
export const BADGE_TEXTURE_H = 128;
export const SIGN_TEXTURE_W = 1024;
export const SIGN_TEXTURE_H = 256;
const FONT = '"Encode Sans Expanded", "Helvetica Neue", sans-serif';

/** Draft wins (not on sale at all), then sold out, then the stock count. */
export function boxBadge(piece: { stockQty?: number | null; status?: string | null }): BoxBadge {
  if (isDraftStatus(piece.status)) {
    return { kind: 'draft', text: 'RASCUNHO', fill: '#E3B341', color: '#1A1408' };
  }
  if (isSoldOut(piece.stockQty)) {
    return { kind: 'soldout', text: 'ESGOTADO', fill: '#8B1E2D', color: '#FFFFFF' };
  }
  const qty = Math.max(0, Math.round(piece.stockQty ?? 0));
  return { kind: 'stock', text: `${qty} UN.`, fill: '#0E0C0E', color: '#FFFFFF' };
}

/** Sold-out photos are dimmed so the red badge reads first. */
export function boxPhotoTint(badge: BoxBadge): number {
  return badge.kind === 'soldout' ? 0x9a9a9a : 0xffffff;
}

export function sectorCountLabel(pieces: number): string {
  return pieces === 1 ? '1 peça' : `${pieces} peças`;
}

/** Largest bold size (down to `min`) at which `text` fits `maxWidth`; ellipsis below that. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  max: number,
  min: number,
  weight = 700,
): { label: string; font: string } {
  const label = text.trim().toUpperCase();
  for (let size = max; size >= min; size -= 4) {
    const font = `${weight} ${size}px ${FONT}`;
    ctx.font = font;
    if (ctx.measureText(label).width <= maxWidth) return { label, font };
  }
  const font = `${weight} ${min}px ${FONT}`;
  ctx.font = font;
  let cut = label.length;
  while (cut > 1 && ctx.measureText(`${label.slice(0, cut).trimEnd()}…`).width > maxWidth) cut -= 1;
  return { label: `${label.slice(0, cut).trimEnd()}…`, font };
}

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Full-width pill strip across the bottom of the box photo. */
export function makeBadgeTexture(badge: BoxBadge): CanvasTexture {
  return canvasTexture(BADGE_TEXTURE_W, BADGE_TEXTURE_H, (ctx) => {
    ctx.fillStyle = badge.fill;
    ctx.fillRect(0, 0, BADGE_TEXTURE_W, BADGE_TEXTURE_H);
    ctx.fillStyle = badge.color;
    ctx.font = `800 76px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.text, BADGE_TEXTURE_W / 2, BADGE_TEXTURE_H / 2 + 4, BADGE_TEXTURE_W - 40);
  });
}

/** Canvas width for a sign plane of `aspect` (width / height) so letters are not stretched. */
export function signTextureWidth(aspect: number): number {
  return Math.min(2048, Math.max(512, Math.round(SIGN_TEXTURE_H * aspect)));
}

export const DRAFT_BADGE = boxBadge({ status: 'draft' });

/**
 * Header sign above a collection's bays: name large, piece count small.
 * `draft` is the unsaved "Nova coleção" placeholder; `unpublished` is a saved collection
 * hidden from the storefront, flagged with the same RASCUNHO pill as draft pieces.
 */
export function makeSignTexture(
  name: string,
  pieces: number,
  draft = false,
  aspect = 4,
  unpublished = false,
  comingSoon = false,
): CanvasTexture {
  const width = signTextureWidth(aspect);
  return canvasTexture(width, SIGN_TEXTURE_H, (ctx) => {
    ctx.fillStyle = draft ? '#F4EFE6' : '#0E0C0E';
    ctx.fillRect(0, 0, width, SIGN_TEXTURE_H);
    if (draft) {
      ctx.setLineDash([28, 18]);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#0E0C0E';
      ctx.strokeRect(8, 8, width - 16, SIGN_TEXTURE_H - 16);
    }
    ctx.fillStyle = draft ? '#0E0C0E' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const name1 = fitText(ctx, name, width - 64, 128, 56);
    ctx.font = name1.font;
    ctx.fillText(name1.label, width / 2, 100);
    const count = draft ? 'nova coleção' : comingSoon ? 'Em breve' : sectorCountLabel(pieces);
    if (!unpublished || draft) {
      ctx.font = `500 52px ${FONT}`;
      ctx.globalAlpha = 0.78;
      ctx.fillText(count, width / 2, 200);
      return;
    }
    const pillFont = `800 40px ${FONT}`;
    const countFont = `500 52px ${FONT}`;
    ctx.font = pillFont;
    const pillW = ctx.measureText(DRAFT_BADGE.text).width + 40;
    ctx.font = countFont;
    const gap = 24;
    const left = width / 2 - (pillW + gap + ctx.measureText(count).width) / 2;
    ctx.fillStyle = DRAFT_BADGE.fill;
    ctx.fillRect(left, 172, pillW, 58);
    ctx.fillStyle = DRAFT_BADGE.color;
    ctx.font = pillFont;
    ctx.textAlign = 'left';
    ctx.fillText(DRAFT_BADGE.text, left + 20, 203);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = countFont;
    ctx.globalAlpha = 0.78;
    ctx.fillText(count, left + pillW + gap, 200);
  });
}

/** Muted rug tints, cycled per collection so neighbouring areas separate. */
export const AREA_TINTS: readonly number[] = [0xb9c4b0, 0xd6c3a5, 0xb7c0cc, 0xd1b3a8, 0xc9c1d4, 0xc4cba2];

export function areaTint(index: number): number {
  return AREA_TINTS[((index % AREA_TINTS.length) + AREA_TINTS.length) % AREA_TINTS.length];
}
