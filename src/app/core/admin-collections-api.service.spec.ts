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
});
