import { Group, Mesh, Texture } from 'three';
import { createSceneEngine, type SceneEngine } from './scene-engine';
import { isPhotoMaterial } from './photo-material';
import { isTextureLive, photoTextureCache } from './texture-cache';
import {
  makeFallbackTexture,
  TEXTURE_BITMAP_FULL_H,
  TEXTURE_BITMAP_FULL_W,
  textureAcquireKey,
  textureCacheUrl,
} from './texture-loader';
import type { SceneHanger, SceneLayout } from './types';

const RACK_ID = 'niponic-dreams';
const THUMB = 'https://cdn.example/pdp/plp-a-thumb.webp';
const FULL = 'https://cdn.example/pdp/pdp-a-01.webp';

function piece(slug: string, thumb = THUMB, full = FULL): SceneHanger {
  return {
    productId: slug,
    slug,
    name: slug,
    imageUrl: full,
    thumbUrl: thumb,
    stockQty: 1,
    priceLabel: 'R$ 1,00',
    status: 'published',
    rackId: RACK_ID,
    kind: 'garment',
  };
}

function seed(url: string, name: string, full = false): Texture {
  const texture = makeFallbackTexture('#334455', name);
  const key = full
    ? textureAcquireKey(url, TEXTURE_BITMAP_FULL_W, TEXTURE_BITMAP_FULL_H)
    : textureCacheUrl(url);
  photoTextureCache.put(key, texture);
  return texture;
}

function hangerPhoto(engine: SceneEngine, slug: string): Texture | null {
  const group = (engine as unknown as { findHangerGroup(s: string): Group | null }).findHangerGroup(slug);
  const garment = group?.getObjectByName('garment') as Mesh | undefined;
  if (!garment || !isPhotoMaterial(garment.material)) return null;
  return garment.material.map;
}

function cacheKey(engine: SceneEngine, slug: string): string {
  return String(hangerPhoto(engine, slug)?.userData?.['cacheKey'] ?? '');
}

async function until(pred: () => boolean, ms = 2500): Promise<void> {
  const start = performance.now();
  while (!pred()) {
    if (performance.now() - start > ms) throw new Error('timed out waiting for photo lod');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('SceneEngine photo LOD', () => {
  const engines: SceneEngine[] = [];

  afterEach(() => {
    for (const engine of engines) engine.dispose();
    engines.length = 0;
    photoTextureCache.clear();
    document.body.querySelectorAll('div').forEach((el) => {
      if (el.querySelector('canvas')) el.remove();
    });
  });

  it('binds the thumb first, not the pdp photo', async () => {
    const thumbC = 'https://cdn.example/pdp/plp-c-thumb.webp';
    const fullC = 'https://cdn.example/pdp/pdp-c-01.webp';
    seed(THUMB, 'thumb');
    seed(FULL, 'full', true);
    seed(thumbC, 'thumb-c');
    seed(fullC, 'full-c', true);
    const host = document.createElement('div');
    host.style.cssText = 'width:800px;height:450px;';
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    host.appendChild(canvas);
    document.body.appendChild(host);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engines.push(engine);
    engine.start();
    engine.setLayout({
      racks: [
        {
          id: RACK_ID,
          name: 'Niponic Dreams',
          sortOrder: 0,
          kind: 'rack',
          hangers: [piece('vestido-a'), piece('vestido-b')],
        },
        {
          id: 'organic-dreams',
          name: 'Organic Dreams',
          sortOrder: 1,
          kind: 'rack',
          hangers: [piece('vestido-c', thumbC, fullC)],
        },
      ],
    });
    engine.focusOverview(true);
    await until(() => cacheKey(engine, 'vestido-a').includes('plp-a-thumb'));
    await until(() => cacheKey(engine, 'vestido-c').includes('plp-c-thumb'));
    expect(cacheKey(engine, 'vestido-a')).toContain('plp-a-thumb');
    expect(cacheKey(engine, 'vestido-a')).not.toContain('pdp-a-01');
    engine.focusHanger('vestido-a', true);
    await until(() => cacheKey(engine, 'vestido-a').includes('pdp-a-01'));
    expect(cacheKey(engine, 'vestido-c')).toContain('plp-c-thumb');
    expect(cacheKey(engine, 'vestido-c')).not.toContain('pdp-c-01');
  });

  it('falls back to the full pdp photo when thumb is missing', async () => {
    seed(FULL, 'full');
    seed(FULL, 'full-hi', true);
    const host = document.createElement('div');
    host.style.cssText = 'width:800px;height:450px;';
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    host.appendChild(canvas);
    document.body.appendChild(host);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engines.push(engine);
    engine.start();
    engine.setLayout({
      racks: [
        {
          id: RACK_ID,
          name: 'Niponic Dreams',
          sortOrder: 0,
          kind: 'rack',
          hangers: [piece('vestido-a', '', FULL)],
        },
      ],
    });
    await until(() => cacheKey(engine, 'vestido-a').includes('pdp-a-01'));
    expect(hangerPhoto(engine, 'vestido-a')).toBeTruthy();
  });

  it('upgrades in-focus pieces to the pdp photo and keeps the thumb cached', async () => {
    const thumbTex = seed(THUMB, 'thumb');
    const fullTex = seed(FULL, 'full', true);
    const host = document.createElement('div');
    host.style.cssText = 'width:800px;height:450px;';
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    host.appendChild(canvas);
    document.body.appendChild(host);
    const engine = createSceneEngine(canvas, { reducedMotion: true, lite: true, host });
    if (!engine) {
      host.remove();
      pending('WebGL not available in this browser');
      return;
    }
    engines.push(engine);
    engine.start();
    const layout: SceneLayout = {
      racks: [
        {
          id: RACK_ID,
          name: 'Niponic Dreams',
          sortOrder: 0,
          kind: 'rack',
          hangers: [piece('vestido-a'), piece('vestido-b')],
        },
      ],
    };
    engine.setLayout(layout);
    engine.focusHanger('vestido-a', true);
    await until(() => cacheKey(engine, 'vestido-a').includes('pdp-a-01'));
    expect(hangerPhoto(engine, 'vestido-a')).toBe(fullTex);
    expect(isTextureLive(fullTex)).toBeTrue();
    expect(isTextureLive(thumbTex)).toBeTrue();
  });
});
