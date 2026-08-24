/** PATCH target for CMS gallery edits (joias, arte, …). */
export interface ContentGalleryPatch {
  path: string;
  value: unknown;
  /** Extra paths to sync in local state only (e.g. legacy `image` field). */
  localSync?: { path: string; value: unknown }[];
}

export interface ContentGalleryPaths {
  /** JSON path to the images array, e.g. `images` or `pieces.0.images`. */
  imagesPath: string;
  /** JSON path to the cover still, e.g. `image` or `pieces.0.image`. */
  imagePath?: string;
}

export interface ContentGalleryState {
  /** URLs currently shown in the gallery UI. */
  gallery: string[];
  /** Document stores a dedicated `images` array (not only `image`). */
  hasImagesArray: boolean;
}

/** Replace or append one gallery URL with a single PATCH. */
export function patchContentGalleryImage(
  state: ContentGalleryState,
  index: number,
  cdnUrl: string,
  paths: ContentGalleryPaths,
): ContentGalleryPatch {
  const { imagesPath, imagePath } = paths;
  const { gallery, hasImagesArray } = state;

  if (index >= gallery.length) {
    const next = [...gallery, cdnUrl];
    if (!hasImagesArray && gallery.length === 0) {
      return { path: imagePath ?? imagesPath, value: cdnUrl };
    }
    return {
      path: imagesPath,
      value: next,
      localSync: imagePath ? [{ path: imagePath, value: next[0]! }] : undefined,
    };
  }

  if (hasImagesArray || gallery.length > 1) {
    return {
      path: `${imagesPath}.${index}`,
      value: cdnUrl,
      localSync: index === 0 && imagePath ? [{ path: imagePath, value: cdnUrl }] : undefined,
    };
  }

  return { path: imagePath ?? imagesPath, value: cdnUrl };
}

/** Remove one gallery entry with a single PATCH. */
export function removeContentGalleryImage(
  state: ContentGalleryState,
  index: number,
  paths: ContentGalleryPaths,
): ContentGalleryPatch | null {
  if (index < 0 || index >= state.gallery.length) return null;

  const next = state.gallery.filter((_, i) => i !== index);
  const { imagesPath, imagePath } = paths;

  if (next.length === 0) {
    const patch: ContentGalleryPatch = {
      path: imagePath ?? imagesPath,
      value: '',
    };
    if (imagePath && hasImagesArrayPath(imagesPath)) {
      patch.localSync = [{ path: imagesPath, value: [] }];
    }
    return patch;
  }

  if (!state.hasImagesArray && next.length === 1) {
    return {
      path: imagePath ?? imagesPath,
      value: next[0]!,
      localSync: hasImagesArrayPath(imagesPath)
        ? [{ path: imagesPath, value: next }]
        : undefined,
    };
  }

  return {
    path: imagesPath,
    value: next,
    localSync: imagePath ? [{ path: imagePath, value: next[0]! }] : undefined,
  };
}

function hasImagesArrayPath(imagesPath: string): boolean {
  return imagesPath === 'images' || imagesPath.endsWith('.images');
}
