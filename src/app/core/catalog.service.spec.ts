import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CatalogService, mapApiProduct } from './catalog.service';

describe('CatalogService getProductsByCollection', () => {
  const originalDemo = environment.demoMode;
  const originalBase = environment.apiBaseUrl;
  let http: HttpTestingController;
  let service: CatalogService;

  beforeEach(() => {
    environment.demoMode = false;
    environment.apiBaseUrl = 'http://catalog.test';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CatalogService],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CatalogService);
  });

  afterEach(() => {
    http.verify();
    environment.demoMode = originalDemo;
    environment.apiBaseUrl = originalBase;
  });

  it('returns an empty list when the API errors — never the local Organic catalog', () => {
    const box: { value?: { length: number; slugs: string[] } } = {};
    service.getProductsByCollection('teste-colecao2').subscribe((list) => {
      box.value = { length: list.length, slugs: list.map((p) => p.collectionSlug) };
    });
    http
      .expectOne('http://catalog.test/api/collections/teste-colecao2')
      .flush('missing', { status: 404, statusText: 'Not Found' });
    expect(box.value).toEqual({ length: 0, slugs: [] });
  });

  it('keeps the API membership order (TESTE- pieces, masculine first)', () => {
    const box: { slugs?: string[] } = {};
    service.getProductsByCollection('teste-ordem').subscribe((list) => {
      box.slugs = list.map((p) => p.slug);
    });
    http.expectOne('http://catalog.test/api/collections/teste-ordem').flush({
      id: 't',
      slug: 'teste-ordem',
      name: 'TESTE-ORDEM',
      description: null,
      sortOrder: 1,
      publishedAt: '2026-01-01T00:00:00.000Z',
      products: [
        {
          id: '1',
          slug: 'teste-plumaria',
          name: 'TESTE plumaria',
          priceCents: 100,
          category: 'feminino',
          gender: 'feminino',
        },
        {
          id: '2',
          slug: 'teste-calca',
          name: 'TESTE calca',
          priceCents: 100,
          category: 'masculino',
          gender: 'masculino',
        },
      ],
    });
    expect(box.slugs).toEqual(['teste-plumaria', 'teste-calca']);
  });

  it('returns an empty list when the API collection has no products', () => {
    const box: { value?: number } = {};
    service.getProductsByCollection('teste-colecao2').subscribe((list) => {
      box.value = list.length;
    });
    http.expectOne('http://catalog.test/api/collections/teste-colecao2').flush({
      id: '5',
      slug: 'teste-colecao2',
      name: 'TESTE-COLECAO2',
      description: null,
      sortOrder: 5,
      publishedAt: null,
      products: [],
    });
    expect(box.value).toBe(0);
  });
});

function asBrl(label: string): string {
  return label.replace(/\u00a0/g, ' ');
}

function dto(priceCents: number) {
  return {
    id: '1',
    slug: 'look-preco',
    name: 'Look preço',
    description: '',
    details: [],
    shipping: null,
    priceCents,
    currency: 'BRL',
    color: null,
    size: null,
    fabric: null,
    season: null,
    category: 'feminino',
    collection: 'Organic Dreams',
    thumb: '',
    gallery: [],
  };
}

describe('mapApiProduct price', () => {
  it('shows 1480000 cents as R$ 14.800 on the public site', () => {
    const product = mapApiProduct(dto(1_480_000));
    expect(product.price).toBe(14800);
    expect(product.priceCents).toBe(1_480_000);
    expect(asBrl(product.priceLabel)).toBe('R$ 14.800');
  });

  it('shows 1250 cents as R$ 12,50 on the public site, not R$ 13,00', () => {
    const product = mapApiProduct(dto(1250));
    expect(product.price).toBe(12.5);
    expect(product.priceCents).toBe(1250);
    expect(asBrl(product.priceLabel)).toBe('R$ 12,50');
  });
});
