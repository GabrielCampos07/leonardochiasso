import type { CollectionCoverMeta, CollectionCoverProduct } from './collection-cover';

/**
 * Real public payload shapes from GET /api/collections and GET /api/products
 * on https://api.leonardochiasso.com (2026-10-13). Collections have no cover
 * field (Prisma Collection has no image column). Admin list/detail use the
 * same `mapProduct` / collection DTO fields; extras below cover older aliases.
 * Pre-#30 Dreams covers are the local PRODUCTS first-piece thumbs.
 */
export const PROD_COLLECTIONS: CollectionCoverMeta[] = [
  {
    id: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad',
    slug: 'organic-dreams',
    name: 'Organic Dreams',
  },
  {
    id: '85fc01dd-b849-4b7e-bb4b-ee7997a5caf9',
    slug: 'niponic-dreams',
    name: 'Niponic Dreams',
  },
  {
    id: 'ddd5069b-7e95-4cf2-8302-d9448c965676',
    slug: 'brazilian-dreams',
    name: 'Brazilian Dreams',
  },
];

const R2 = 'https://pub-6655ba69308240e9aa39646415abf7cb.r2.dev';

export const PROD_PRODUCTS: CollectionCoverProduct[] = [
  {
    slug: 'calca-pantalona-rasgo',
    archivedAt: null,
    thumb: `${R2}/pdp/plp-calca-thumb.webp`,
    gallery: [`${R2}/pdp/pdp-calca-01.webp`],
    collection: 'Organic Dreams',
    collections: [
      { slug: 'organic-dreams', name: 'Organic Dreams', archivedAt: null, sortOrder: 0 },
    ],
    media: [
      {
        cdnUrl: `${R2}/pdp/plp-calca-thumb.webp`,
        role: 'thumb',
        sortOrder: 0,
        isPrimary: true,
      },
    ],
  },
  {
    slug: 'vestido-longo-bateau',
    archivedAt: null,
    thumb: `${R2}/pdp/plp-bateau-thumb.webp`,
    collection: 'Organic Dreams',
    collections: [
      { slug: 'organic-dreams', name: 'Organic Dreams', archivedAt: null, sortOrder: 1 },
    ],
    media: [
      {
        cdnUrl: `${R2}/pdp/plp-bateau-thumb.webp`,
        role: 'thumb',
        sortOrder: 0,
        isPrimary: true,
      },
    ],
  },
  {
    slug: 'look-obi-organza',
    archivedAt: null,
    thumb: `${R2}/pdp/plp-look-obi-organza-thumb.webp`,
    collection: 'Niponic Dreams',
    collections: [
      { slug: 'niponic-dreams', name: 'Niponic Dreams', archivedAt: null, sortOrder: 15 },
    ],
    media: [
      {
        cdnUrl: `${R2}/pdp/plp-look-obi-organza-thumb.webp`,
        role: 'thumb',
        sortOrder: 0,
        isPrimary: true,
      },
    ],
  },
  {
    slug: 'colete-bermuda-saia-echarpe',
    archivedAt: null,
    thumb: `${R2}/pdp/plp-colete-bermuda-saia-thumb.webp`,
    collection: 'Brazilian Dreams',
    collections: [
      { slug: 'brazilian-dreams', name: 'Brazilian Dreams', archivedAt: null, sortOrder: 29 },
    ],
    media: [
      {
        cdnUrl: `${R2}/pdp/plp-colete-bermuda-saia-thumb.webp`,
        role: 'thumb',
        sortOrder: 0,
        isPrimary: true,
      },
    ],
  },
];

/** Admin-shaped row: membership by collection UUID, photo only on nested mediaAsset. */
export const ADMIN_ORGANIC_BY_ID: CollectionCoverProduct = {
  slug: 'calca-pantalona-rasgo',
  archivedAt: null,
  thumb: '',
  collection: 'Organic Dreams',
  collections: [
    {
      id: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad',
      collectionId: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad',
      name: 'Organic Dreams',
      sortOrder: 0,
    },
  ],
  media: [
    {
      sortOrder: 0,
      isPrimary: true,
      mediaAsset: { cdnUrl: `${R2}/pdp/plp-calca-thumb.webp`, role: 'thumb' },
    },
  ],
};

/** Older admin row: no collections[], only collection name + image url field. */
export const ADMIN_NIPONIC_NAME_ONLY: CollectionCoverProduct = {
  slug: 'look-obi-organza',
  archivedAt: null,
  collection: 'Niponic Dreams',
  collectionSlug: 'niponic-dreams',
  media: [{ url: `${R2}/pdp/plp-look-obi-organza-thumb.webp`, sortOrder: 0 }],
};
