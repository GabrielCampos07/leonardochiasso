import { Texture } from 'three';

/** Marks a texture that many meshes share. `disposeObject3D` must not GPU-dispose it. */
export const SHARED_TEXTURE_FLAG = 'shared';
export const TEXTURE_CACHE_KEY = 'cacheKey';
const TEXTURE_DISPOSED_FLAG = 'disposed';

export function isSharedTexture(texture: Texture | null | undefined): boolean {
  return Boolean(texture?.userData?.[SHARED_TEXTURE_FLAG]);
}

export function markSharedTexture(texture: Texture, cacheKey?: string): Texture {
  texture.userData[SHARED_TEXTURE_FLAG] = true;
  if (cacheKey) texture.userData[TEXTURE_CACHE_KEY] = cacheKey;
  if (!texture.userData['disposeWatched']) {
    texture.userData['disposeWatched'] = true;
    texture.addEventListener('dispose', () => {
      texture.userData[TEXTURE_DISPOSED_FLAG] = true;
    });
  }
  return texture;
}

/** False after `dispose()` or a closed ImageBitmap — the cache must reload. */
export function isTextureLive(texture: Texture | null | undefined): boolean {
  if (!texture) return false;
  if (texture.userData?.[TEXTURE_DISPOSED_FLAG]) return false;
  const image = texture.image as { width?: number; height?: number } | undefined;
  if (!image) return false;
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    if (image.width === 0 && image.height === 0) return false;
  }
  return true;
}

interface CacheEntry {
  texture: Texture;
  refs: number;
}

/**
 * Ref-counted photo cache. Rebuilds (archive / undo / remount) release refs
 * but keep the GPU texture until `clear()`, so the next hanger can reuse it.
 * A disposed or detached instance is evicted and reloaded.
 */
export class RefCountedTextureCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<Texture | null>>();

  get size(): number {
    return this.entries.size;
  }

  refs(key: string): number {
    return this.entries.get(key)?.refs ?? 0;
  }

  peek(key: string): Texture | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (!isTextureLive(entry.texture)) {
      this.entries.delete(key);
      return null;
    }
    return entry.texture;
  }

  put(key: string, texture: Texture): Texture {
    markSharedTexture(texture, key);
    const prev = this.entries.get(key);
    this.entries.set(key, { texture, refs: prev?.refs ?? 0 });
    return texture;
  }

  retain(texture: Texture): Texture {
    const key = String(texture.userData?.[TEXTURE_CACHE_KEY] ?? '');
    if (!key) {
      markSharedTexture(texture);
      return texture;
    }
    const entry = this.entries.get(key);
    if (entry && entry.texture === texture) entry.refs += 1;
    return texture;
  }

  release(texture: Texture | null | undefined): void {
    if (!texture) return;
    const key = String(texture.userData?.[TEXTURE_CACHE_KEY] ?? '');
    if (!key) return;
    const entry = this.entries.get(key);
    if (!entry || entry.texture !== texture) return;
    entry.refs = Math.max(0, entry.refs - 1);
  }

  async acquire(key: string, load: () => Promise<Texture | null>): Promise<Texture | null> {
    const hit = this.peek(key);
    if (hit) {
      this.retain(hit);
      return hit;
    }
    const pending = this.inflight.get(key);
    if (pending) {
      const texture = await pending;
      if (texture && isTextureLive(texture)) {
        this.retain(texture);
        return texture;
      }
      return texture;
    }
    const request = (async () => {
      try {
        const texture = await load();
        if (!texture) return null;
        const raced = this.peek(key);
        if (raced) {
          if (!isSharedTexture(texture)) texture.dispose();
          return raced;
        }
        this.put(key, texture);
        return texture;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, request);
    const texture = await request;
    if (texture && isTextureLive(texture)) this.retain(texture);
    return texture;
  }

  clear(): void {
    for (const { texture } of this.entries.values()) {
      texture.dispose();
    }
    this.entries.clear();
    this.inflight.clear();
  }
}

export const photoTextureCache = new RefCountedTextureCache();
