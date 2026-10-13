import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { disposeObject3D } from './dispose';
import { isTextureLive, markSharedTexture, photoTextureCache, RefCountedTextureCache } from './texture-cache';

function paintTexture(label: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#334455';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 2, 12);
  }
  return new CanvasTexture(canvas);
}

describe('RefCountedTextureCache', () => {
  afterEach(() => {
    photoTextureCache.clear();
  });

  it('returns the same live instance and survives disposeObject3D', async () => {
    const cache = new RefCountedTextureCache();
    const first = paintTexture('one');
    const loaded = await cache.acquire('https://cdn.example/a.jpg?tex=1', async () => first);
    expect(loaded).toBe(first);
    expect(cache.refs('https://cdn.example/a.jpg?tex=1')).toBe(1);

    const mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: loaded }));
    disposeObject3D(mesh);

    expect(isTextureLive(first)).toBeTrue();
    const again = await cache.acquire('https://cdn.example/a.jpg?tex=1', async () => {
      throw new Error('must not reload a live cached texture');
    });
    expect(again).toBe(first);
    cache.clear();
  });

  it('evicts a disposed instance and reloads', async () => {
    const cache = new RefCountedTextureCache();
    const dead = markSharedTexture(paintTexture('dead'), 'k');
    cache.put('k', dead);
    dead.dispose();
    expect(isTextureLive(dead)).toBeFalse();
    expect(cache.peek('k')).toBeNull();

    const fresh = paintTexture('fresh');
    const loaded = await cache.acquire('k', async () => fresh);
    expect(loaded).toBe(fresh);
    expect(isTextureLive(loaded)).toBeTrue();
    cache.clear();
  });
});
