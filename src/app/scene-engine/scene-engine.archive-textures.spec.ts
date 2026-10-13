import { Group, Mesh, Texture } from 'three';
import { layoutHangers } from './collection-rack';
import { disposeObject3D } from './dispose';
import { createGarmentHanger } from './garment-hanger';
import { isPhotoMaterial } from './photo-material';
import { createSceneEngine, type SceneEngine } from './scene-engine';
import { isTextureLive, photoTextureCache } from './texture-cache';
import { makeFallbackTexture, textureCacheUrl } from './texture-loader';
import type { SceneHanger, SceneLayout, SceneRack } from './types';

const RACK_ID = 'organic-dreams';

function hanger(slug: string, name: string, imageUrl: string): SceneHanger {
  return {
    productId: slug,
    slug,
    name,
    imageUrl,
    thumbUrl: imageUrl,
    stockQty: 1,
    priceLabel: 'R$ 1,00',
    status: 'published',
    rackId: RACK_ID,
    kind: 'garment',
  };
}

function photoLayout(...pieces: SceneHanger[]): SceneLayout {
  return {
    racks: [
      {
        id: RACK_ID,
        name: 'Organic Dreams',
        sortOrder: 0,
        kind: 'rack',
        hangers: pieces,
      },
    ],
  };
}

function seedPhoto(url: string, name: string): Texture {
  const texture = makeFallbackTexture('#445566', name);
  photoTextureCache.put(textureCacheUrl(url), texture);
  return texture;
}

function hangerGroup(engine: SceneEngine, slug: string): Group | null {
  return (engine as unknown as { findHangerGroup(s: string): Group | null }).findHangerGroup(slug);
}

function hangerPhoto(engine: SceneEngine, slug: string): Texture | null {
  const group = hangerGroup(engine, slug);
  const garment = group?.getObjectByName('garment') as Mesh | undefined;
  if (!garment || !isPhotoMaterial(garment.material)) return null;
  return garment.material.map;
}

async function until(pred: () => boolean, ms = 2500): Promise<void> {
  const start = performance.now();
  while (!pred()) {
    if (performance.now() - start > ms) {
      throw new Error('timed out waiting for hanger photos');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function isBoundPhoto(map: Texture | null): boolean {
  if (!map || !isTextureLive(map)) return false;
  const key = String(map.userData?.['cacheKey'] ?? '');
  return key.includes('?tex=1') || key.startsWith('https://') || key.startsWith('http://');
}

async function photosLive(engine: SceneEngine, slugs: string[]): Promise<void> {
  await until(() => slugs.every((slug) => isBoundPhoto(hangerPhoto(engine, slug))));
}

function mountEngine(): { engine: SceneEngine; canvas: HTMLCanvasElement; host: HTMLDivElement } | null {
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
    return null;
  }
  engine.start();
  return { engine, canvas, host };
}

describe('archive → undo keeps rack photos', () => {
  const engines: SceneEngine[] = [];

  afterEach(() => {
    for (const engine of engines) engine.dispose();
    engines.length = 0;
    photoTextureCache.clear();
    document.body.querySelectorAll('div').forEach((el) => {
      if (el.querySelector('canvas')) el.remove();
    });
  });

  it('rebuilds the rack after archive + Desfazer without disposing cached photos', async () => {
    const urls = {
      a: 'https://cdn.example/vestido-a.jpg',
      b: 'https://cdn.example/vestido-b.jpg',
      c: 'https://cdn.example/vestido-c.jpg',
    };
    const seeded = {
      a: seedPhoto(urls.a, 'A'),
      b: seedPhoto(urls.b, 'B'),
      c: seedPhoto(urls.c, 'C'),
    };
    const a = hanger('vestido-a', 'Vestido A', urls.a);
    const b = hanger('vestido-b', 'Vestido B', urls.b);
    const c = hanger('vestido-c', 'Vestido C', urls.c);

    const mounted = mountEngine();
    if (!mounted) {
      pending('WebGL not available in this browser');
      return;
    }
    const { engine } = mounted;
    engines.push(engine);
    engine.setLayout(photoLayout(a, b, c));
    await photosLive(engine, ['vestido-a', 'vestido-b', 'vestido-c']);
    expect(hangerPhoto(engine, 'vestido-a')).toBe(seeded.a);
    expect(hangerPhoto(engine, 'vestido-b')).toBe(seeded.b);
    expect(hangerPhoto(engine, 'vestido-c')).toBe(seeded.c);

    engine.removeHanger('vestido-b', true);
    await photosLive(engine, ['vestido-a', 'vestido-c']);
    expect(hangerGroup(engine, 'vestido-b')).toBeNull();
    expect(isTextureLive(seeded.a)).toBeTrue();
    expect(isTextureLive(seeded.b)).toBeTrue();
    expect(isTextureLive(seeded.c)).toBeTrue();
    expect(hangerPhoto(engine, 'vestido-a')).toBe(seeded.a);
    expect(hangerPhoto(engine, 'vestido-c')).toBe(seeded.c);

    engine.addHanger(b, true);
    await photosLive(engine, ['vestido-a', 'vestido-b', 'vestido-c']);
    expect(hangerPhoto(engine, 'vestido-a')).toBe(seeded.a);
    expect(hangerPhoto(engine, 'vestido-b')).toBe(seeded.b);
    expect(hangerPhoto(engine, 'vestido-c')).toBe(seeded.c);
    expect(isTextureLive(hangerPhoto(engine, 'vestido-a'))).toBeTrue();
    expect(isTextureLive(hangerPhoto(engine, 'vestido-b'))).toBeTrue();
    expect(isTextureLive(hangerPhoto(engine, 'vestido-c'))).toBeTrue();

    engine.dispose();
  });

  it('reloads photos when a collection is sunk and restoreUnit remounts the rack', async () => {
    const url = 'https://cdn.example/joia.jpg';
    const seeded = seedPhoto(url, 'Joia');
    const piece = hanger('brinco', 'Brinco', url);
    const unit: SceneRack = {
      id: RACK_ID,
      name: 'Organic Dreams',
      sortOrder: 0,
      kind: 'rack',
      hangers: [piece],
    };
    const mounted = mountEngine();
    if (!mounted) {
      pending('WebGL not available in this browser');
      return;
    }
    const { engine } = mounted;
    engines.push(engine);
    engine.setLayout({ racks: [unit] });
    await photosLive(engine, ['brinco']);
    expect(hangerPhoto(engine, 'brinco')).toBe(seeded);

    engine.sinkUnit(RACK_ID, true);
    expect(hangerGroup(engine, 'brinco')).toBeNull();
    expect(isTextureLive(seeded)).toBeTrue();

    engine.restoreUnit(unit);
    await photosLive(engine, ['brinco']);
    expect(hangerPhoto(engine, 'brinco')).toBe(seeded);
    expect(isTextureLive(hangerPhoto(engine, 'brinco'))).toBeTrue();

    engine.dispose();
  });
});

describe('layoutHangers leftover dispose', () => {
  afterEach(() => photoTextureCache.clear());

  it('does not dispose a cached photo still used by a sibling hanger', () => {
    const url = 'https://cdn.example/keep.jpg';
    const cached = seedPhoto(url, 'Keep');
    const keep = hanger('keep', 'Keep', url);
    const gone = hanger('gone', 'Gone', 'https://cdn.example/gone.jpg');
    const keepGroup = createGarmentHanger(keep);
    const goneGroup = createGarmentHanger(gone);
    const garment = keepGroup.getObjectByName('garment') as Mesh;
    if (isPhotoMaterial(garment.material)) garment.material.map = cached;
    const gonePhoto = goneGroup.getObjectByName('garment') as Mesh;
    if (isPhotoMaterial(gonePhoto.material)) gonePhoto.material.map = cached;

    const root = new Group();
    root.add(keepGroup, goneGroup);
    layoutHangers(root, [keep], 3.2);
    expect(root.children).toEqual([keepGroup]);
    expect(isTextureLive(cached)).toBeTrue();
    expect((keepGroup.getObjectByName('garment') as Mesh).material).toBeTruthy();
    if (isPhotoMaterial(garment.material)) {
      expect(garment.material.map).toBe(cached);
    }
    disposeObject3D(root);
    expect(isTextureLive(cached)).toBeTrue();
  });
});
