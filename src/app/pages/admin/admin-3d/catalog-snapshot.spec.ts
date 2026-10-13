import {
  CATALOG_SNAPSHOT_KEY,
  CATALOG_SNAPSHOT_TTL_MS,
  CATALOG_SNAPSHOT_VERSION,
  catalogFingerprint,
  leanSceneProduct,
  readCatalogSnapshot,
  writeCatalogSnapshot,
} from './catalog-snapshot';

function memoryStore(seed: Record<string, string> = {}): Storage {
  const data = { ...seed };
  return {
    get length() {
      return Object.keys(data).length;
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    getItem(key: string) {
      return data[key] ?? null;
    },
    key(index: number) {
      return Object.keys(data)[index] ?? null;
    },
    removeItem(key: string) {
      delete data[key];
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

const collections = [{ slug: 'niponic-dreams', name: 'Niponic Dreams', sortOrder: 1 }];
const products = [
  {
    slug: 'look-obi',
    name: 'Look Obi',
    thumb: 'https://cdn.example/pdp/look-obi-thumb.webp',
    collectionSlugs: ['niponic-dreams'],
    pieceKind: 'garment' as const,
  },
];

describe('catalogFingerprint', () => {
  it('changes when a thumb URL or hanger set changes', () => {
    const a = catalogFingerprint(collections, products, []);
    const b = catalogFingerprint(
      collections,
      [{ ...products[0]!, thumb: 'https://cdn.example/pdp/look-obi-thumb-v2.webp' }],
      [],
    );
    const c = catalogFingerprint(collections, [...products, { slug: 'novo', name: 'Novo', thumb: 'n.webp' }], []);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBe(catalogFingerprint(collections, products, []));
  });
});

describe('catalog session snapshot', () => {
  it('writes a versioned key and reads hangers with thumb URLs', () => {
    const store = memoryStore();
    expect(
      writeCatalogSnapshot({ collections, products, joias: [] }, store, 1_000),
    ).toBeTrue();
    const snap = readCatalogSnapshot(1_000, store);
    expect(snap?.v).toBe(CATALOG_SNAPSHOT_VERSION);
    expect(store.getItem(CATALOG_SNAPSHOT_KEY)).toContain('look-obi-thumb.webp');
    expect(snap?.products[0]?.thumb).toBe('https://cdn.example/pdp/look-obi-thumb.webp');
    expect(snap?.collections[0]?.slug).toBe('niponic-dreams');
  });

  it('expires after the short TTL and rejects another version', () => {
    const store = memoryStore();
    writeCatalogSnapshot({ collections, products, joias: [] }, store, 1_000);
    expect(readCatalogSnapshot(1_000 + CATALOG_SNAPSHOT_TTL_MS + 1, store)).toBeNull();
    store.setItem(
      CATALOG_SNAPSHOT_KEY,
      JSON.stringify({ v: 99, savedAt: 1_000, collections, products, joias: [] }),
    );
    expect(readCatalogSnapshot(1_000, store)).toBeNull();
  });

  it('keeps only the thumb on the lean hanger row', () => {
    const lean = leanSceneProduct({
      slug: 'x',
      name: 'X',
      thumb: 'thumb.webp',
      gallery: ['a.webp', 'b.webp', 'c.webp'],
      imageUrl: 'full.webp',
    });
    expect(lean.thumb).toBe('thumb.webp');
    expect(lean.gallery).toEqual(['a.webp']);
  });
});
