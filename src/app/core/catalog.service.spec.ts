import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CatalogService } from './catalog.service';

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
