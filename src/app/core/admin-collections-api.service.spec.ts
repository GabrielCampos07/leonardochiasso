import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AdminCollectionsApiService } from './admin-collections-api.service';

describe('AdminCollectionsApiService', () => {
  const originalBase = environment.apiBaseUrl;
  let http: HttpTestingController;
  let service: AdminCollectionsApiService;

  beforeEach(() => {
    environment.apiBaseUrl = 'http://collections.test';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AdminCollectionsApiService],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminCollectionsApiService);
  });

  afterEach(() => {
    http.verify();
    environment.apiBaseUrl = originalBase;
  });

  it('skips cache when refresh is requested', () => {
    service.list(false, { refresh: true }).subscribe();
    const req = http.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === 'http://collections.test/api/admin/collections' &&
        r.params.has('_'),
    );
    expect(req.request.headers.get('Cache-Control')).toBeNull();
    expect(req.request.headers.get('Pragma')).toBeNull();
    expect(req.request.withCredentials).toBeTrue();
    req.flush([
      {
        id: '1',
        slug: 'teste-colecao',
        name: 'TESTE-COLECAO',
        description: null,
        sortOrder: 4,
        publishedAt: null,
      },
    ]);
  });

  it('GETs full membership including archived slugs', () => {
    service.getProducts('organic-dreams').subscribe((res) => {
      expect(res.productSlugs).toEqual(['arquivo', 'vestido']);
    });
    const req = http.expectOne('http://collections.test/api/admin/collections/organic-dreams/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ productSlugs: ['arquivo', 'vestido'] });
  });

  it('PUTs the exact productSlugs list and never keepMissing', () => {
    service.setProducts('organic-dreams', ['arquivo', 'draft-x', 'c', 'a']).subscribe();
    const req = http.expectOne('http://collections.test/api/admin/collections/organic-dreams/products');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ productSlugs: ['arquivo', 'draft-x', 'c', 'a'] });
    expect(req.request.body.keepMissing).toBeUndefined();
    req.flush({
      id: '1',
      slug: 'organic-dreams',
      name: 'Organic',
      description: null,
      sortOrder: 0,
      publishedAt: null,
      productSlugs: ['arquivo', 'draft-x', 'c', 'a'],
    });
  });

  it('POSTs append and DELETEs a member', () => {
    service.appendProducts('organic-dreams', ['nova']).subscribe();
    const append = http.expectOne(
      'http://collections.test/api/admin/collections/organic-dreams/products/append',
    );
    expect(append.request.method).toBe('POST');
    expect(append.request.body).toEqual({ productSlugs: ['nova'] });
    append.flush({
      id: '1',
      slug: 'organic-dreams',
      name: 'Organic',
      description: null,
      sortOrder: 0,
      publishedAt: null,
      productSlugs: ['a', 'nova'],
    });

    service.removeProduct('organic-dreams', 'a').subscribe();
    const del = http.expectOne(
      'http://collections.test/api/admin/collections/organic-dreams/products/a',
    );
    expect(del.request.method).toBe('DELETE');
    del.flush({
      id: '1',
      slug: 'organic-dreams',
      name: 'Organic',
      description: null,
      sortOrder: 0,
      publishedAt: null,
      productSlugs: ['nova'],
    });
  });
});
