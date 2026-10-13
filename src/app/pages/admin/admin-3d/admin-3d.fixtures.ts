import { AdminCollectionDto } from '../../../core/admin-collections-api.service';
import { COLLECTION_LABELS, Collection, Product } from '../../../core/product.model';
import { PRODUCTS } from '../../../core/products';
import { COLLECTION_SLUGS, CollectionSlug } from '../../../core/routes';
import type { SceneCollectionInput, SceneProductInput } from '../../../scene-engine/types';
import { productToSceneInput } from '../../../scene-engine/from-catalog';

const FIXTURE_SLUGS = [
  'calca-pantalona-rasgo',
  'vestido-longo-bateau',
  'look-obi-organza',
  'vestido-longo-mousseline-grafica',
  'colete-bermuda-saia-echarpe',
] as const;

const STOCK_BY_SLUG: Record<string, number> = {
  'calca-pantalona-rasgo': 4,
  'vestido-longo-bateau': 1,
  'look-obi-organza': 0,
  'vestido-longo-mousseline-grafica': 2,
  'colete-bermuda-saia-echarpe': 3,
};

const DRAFT_SLUGS = new Set<string>();

function cloneProduct(slug: string): Product | null {
  const found = PRODUCTS.find((p) => p.slug === slug);
  return found ? structuredClone(found) : null;
}

/** Curated atelier sample — used when the Nest API is off or `?mock=1`. */
export function admin3dFixtureProducts(): Product[] {
  const picked = FIXTURE_SLUGS.map(cloneProduct).filter((p): p is Product => p != null);
  const loose: Product = {
    id: 'peca-avulsa-atelier',
    slug: 'peca-avulsa-atelier',
    name: 'Peça avulsa atelier',
    price: 0,
    priceLabel: 'R$ 0,00',
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Cambraia 100% cânhamo',
    season: 'Seasonless',
    description: 'Produto de exemplo sem coleção — arara “Sem coleção”.',
    details: ['Fixture local do modo 3D'],
    shipping: '',
    thumb: picked[0]?.thumb ?? '',
    gallery: picked[0]?.gallery ?? [],
    category: 'feminino',
    collection: '' as Collection,
    collectionSlug: '' as CollectionSlug,
    status: 'published',
    stockQty: 5,
  };

  return [...picked, loose].map((p) => ({
    ...p,
    stockQty: STOCK_BY_SLUG[p.slug] ?? p.stockQty ?? 1,
    status: DRAFT_SLUGS.has(p.slug) ? 'draft' : (p.status ?? 'published'),
  }));
}

export function admin3dFixtureCollections(): AdminCollectionDto[] {
  return [
    {
      id: 'fix-organic',
      slug: COLLECTION_SLUGS.organicDreams,
      name: COLLECTION_LABELS[COLLECTION_SLUGS.organicDreams],
      description: null,
      sortOrder: 1,
      publishedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'fix-niponic',
      slug: COLLECTION_SLUGS.niponicDreams,
      name: COLLECTION_LABELS[COLLECTION_SLUGS.niponicDreams],
      description: null,
      sortOrder: 2,
      publishedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'fix-brazilian',
      slug: COLLECTION_SLUGS.brazilianDreams,
      name: COLLECTION_LABELS[COLLECTION_SLUGS.brazilianDreams],
      description: null,
      sortOrder: 3,
      publishedAt: '2024-01-01T00:00:00.000Z',
    },
  ];
}

export function admin3dFixtureSceneCollections(): SceneCollectionInput[] {
  return admin3dFixtureCollections().map((c) => ({
    slug: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
  }));
}

export function admin3dFixtureSceneProducts(): SceneProductInput[] {
  return admin3dFixtureProducts().map((p) => ({
    ...productToSceneInput(p),
    collectionSlugs: p.collectionSlug ? [p.collectionSlug] : [],
  }));
}

/** Local catalog path: every PRODUCTS item + the three Dreams collections. */
export function collectionsFromLabels(): SceneCollectionInput[] {
  return (Object.entries(COLLECTION_LABELS) as [CollectionSlug, string][]).map(
    ([slug, name], index) => ({
      slug,
      name,
      sortOrder: index + 1,
    }),
  );
}
