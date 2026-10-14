import {
  DRAFT_BADGE,
  BADGE_TEXTURE_H,
  BADGE_TEXTURE_W,
  SIGN_TEXTURE_H,
  areaTint,
  boxBadge,
  boxPhotoTint,
  makeBadgeTexture,
  makeSignTexture,
  sectorCountLabel,
  signTextureWidth,
} from './stockroom-labels';

describe('stockroom labels', () => {
  it('shows RASCUNHO, then ESGOTADO, then the stock count', () => {
    expect(boxBadge({ status: 'draft', stockQty: 0 }).text).toBe('RASCUNHO');
    expect(boxBadge({ status: 'published', stockQty: 0 }).text).toBe('ESGOTADO');
    expect(boxBadge({ status: 'published', stockQty: -2 }).kind).toBe('soldout');
    expect(boxBadge({ status: 'published', stockQty: 3 }).text).toBe('3 UN.');
  });

  it('uses the site sold-out red and dims sold-out photos', () => {
    const soldOut = boxBadge({ status: 'published', stockQty: 0 });
    expect(soldOut.fill).toBe('#8B1E2D');
    expect(boxPhotoTint(soldOut)).not.toBe(0xffffff);
    expect(boxPhotoTint(boxBadge({ stockQty: 2 }))).toBe(0xffffff);
  });

  it('paints badge and sign canvases at their declared sizes', () => {
    const badge = makeBadgeTexture(boxBadge({ stockQty: 1 }));
    const image = badge.image as HTMLCanvasElement;
    expect(image.width).toBe(BADGE_TEXTURE_W);
    expect(image.height).toBe(BADGE_TEXTURE_H);
    badge.dispose();
    const sign = makeSignTexture('Brazilian Dreams', 26, false, 9);
    const signImage = sign.image as HTMLCanvasElement;
    expect(signImage.height).toBe(SIGN_TEXTURE_H);
    expect(signImage.width).toBe(signTextureWidth(9));
    sign.dispose();
  });

  it('paints the amber RASCUNHO pill on an unpublished collection sign only', () => {
    const amberPixels = (texture: ReturnType<typeof makeSignTexture>) => {
      const canvas = texture.image as HTMLCanvasElement;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0xe3 && data[i + 1] === 0xb3 && data[i + 2] === 0x41) count++;
      }
      texture.dispose();
      return count;
    };
    expect(DRAFT_BADGE.text).toBe('RASCUNHO');
    expect(DRAFT_BADGE.fill).toBe('#E3B341');
    expect(amberPixels(makeSignTexture('Cápsula', 3, false, 6, true))).toBeGreaterThan(1000);
    expect(amberPixels(makeSignTexture('Cápsula', 3, false, 6, false))).toBe(0);
  });

  it('matches the sign canvas to the plane aspect so letters are not stretched', () => {
    expect(signTextureWidth(4)).toBe(SIGN_TEXTURE_H * 4);
    expect(signTextureWidth(100)).toBe(2048);
    expect(signTextureWidth(0.5)).toBe(512);
  });

  it('pluralises the piece count and cycles rug tints', () => {
    expect(sectorCountLabel(1)).toBe('1 peça');
    expect(sectorCountLabel(19)).toBe('19 peças');
    expect(areaTint(0)).toBe(areaTint(6));
    expect(areaTint(-1)).toBe(areaTint(5));
  });
});
