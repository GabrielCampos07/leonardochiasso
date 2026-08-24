import { ActivatedRoute } from '@angular/router';
import {
  ADMIN_PRODUCT_COLLECTION_QUERY,
  COLLECTION_SLUGS,
} from './routes';

const KNOWN_COLLECTION_SLUGS = new Set<string>(Object.values(COLLECTION_SLUGS));
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Query keys accepted when opening “Adicionar produto” with a collection pre-fill. */
export const ADMIN_COLLECTION_QUERY_KEYS = [
  ADMIN_PRODUCT_COLLECTION_QUERY,
  'collection',
] as const;

export interface AdminCollectionContext {
  /** Collection slug when resolved from route or query (known or API-created). */
  slug: string | null;
  /** True when a collection-scoped surface (or query) provided the slug. */
  fromContext: boolean;
}

export function parseCollectionSlugParam(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (KNOWN_COLLECTION_SLUGS.has(trimmed)) return trimmed;
  // Allow API-created collection slugs (Phase 4b) beyond the static seed set.
  if (SLUG_PATTERN.test(trimmed) && trimmed.length <= 160) return trimmed;
  return null;
}

/**
 * Resolve collection context for admin product create.
 * Prefers query `colecao` / `collection`, then route param `collectionSlug`
 * (storefront PLP `/colecao/:collectionSlug`).
 */
export function resolveAdminCollectionContext(
  route: ActivatedRoute,
): AdminCollectionContext {
  let leaf = route;
  while (leaf.firstChild) leaf = leaf.firstChild;

  let slug: string | null = null;
  let node: ActivatedRoute | null = leaf;
  while (node) {
    const q = node.snapshot.queryParamMap;
    for (const key of ADMIN_COLLECTION_QUERY_KEYS) {
      const fromQuery = parseCollectionSlugParam(q.get(key));
      if (fromQuery) {
        slug = fromQuery;
        break;
      }
    }
    slug =
      parseCollectionSlugParam(node.snapshot.paramMap.get('collectionSlug')) ??
      slug;
    node = node.parent;
  }

  return { slug, fromContext: slug != null };
}

/** URL-based resolver for shell / toolbar (no leaf ActivatedRoute). */
export function resolveAdminCollectionContextFromUrl(
  url: string,
): AdminCollectionContext {
  const pathOnly = url.split('?')[0] ?? url;
  const pathMatch = pathOnly.match(/\/colecao\/([^/?#]+)/i);
  const queryMatch = url.match(/[?&](?:colecao|collection)=([^&]+)/i);
  const raw = decodeURIComponent(
    (queryMatch?.[1] ?? pathMatch?.[1] ?? '').replace(/\+/g, ' '),
  );
  const slug = parseCollectionSlugParam(raw);
  return { slug, fromContext: slug != null };
}
