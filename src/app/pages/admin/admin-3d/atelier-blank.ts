import { slugifyName, uniqueAdminSlug } from '../../../core/admin-catalog.service';
import { Collection, Product, formatPriceLabel } from '../../../core/product.model';
import { JoiaPiece } from '../../../core/joias.data';
import { CollectionSlug } from '../../../core/routes';
import { UNCOLLECTED_RACK_ID } from '../../../scene-engine/types';

const DEFAULT_SHIPPING =
  'Frete e prazo calculados no checkout. Arrependimento em até 7 dias corridos após o recebimento, conforme o CDC. Troca por outro motivo em até 14 dias, para peças sem uso e com etiqueta.';

export function collectionSlugFromUnitId(id: string): string {
  if (!id || id === UNCOLLECTED_RACK_ID) return '';
  if (id.startsWith('vitrine:')) return id.slice('vitrine:'.length).split(':')[0] ?? '';
  return id;
}

export function blankAtelierProduct(collectionSlug: string): Product {
  return {
    id: '',
    slug: '',
    name: '',
    price: 0,
    priceLabel: formatPriceLabel(0),
    priceCents: 0,
    color: '',
    size: 'ÚNICO',
    fabric: '',
    season: 'Seasonless',
    description: '',
    details: [],
    shipping: DEFAULT_SHIPPING,
    thumb: '',
    gallery: [],
    media: [],
    category: 'feminino',
    collection: collectionSlug as Collection,
    collectionSlug: collectionSlug as CollectionSlug,
    pieces: [],
  };
}

export function blankAtelierJoia(collectionSlug: string): JoiaPiece {
  return {
    id: '',
    slug: '',
    title: '',
    description: '',
    price: null,
    priceLabel: 'Sob consulta',
    image: '',
    images: [],
    medium: '',
    collectionSlug: collectionSlug as CollectionSlug,
  };
}

export function uniqueJoiaSlug(title: string, exists: (slug: string) => boolean): string {
  return uniqueAdminSlug(title || slugifyName(title), exists);
}
