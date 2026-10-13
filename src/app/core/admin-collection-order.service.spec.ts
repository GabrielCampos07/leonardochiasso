import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AdminCollectionOrderService } from './admin-collection-order.service';

describe('AdminCollectionOrderService', () => {
  const originalDemo = environment.demoMode;
  const originalBase = environment.apiBaseUrl;
  let http: HttpTestingController;
  let service: AdminCollectionOrderService;

  beforeEach(() => {
    environment.demoMode = false;
    environment.apiBaseUrl = 'http://order.test';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AdminCollectionOrderService],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminCollectionOrderService);
  });

  afterEach(() => {
    http.verify();
    environment.demoMode = originalDemo;
    environment.apiBaseUrl = originalBase;
    localStorage.removeItem('lc-admin-collection-order');
  });

  it('GETs the isolated order route and returns productIds', () => {
    const body = {
      collection: 'organic-dreams',
      gender: 'feminino' as const,
      productIds: ['id-1', 'id-2'],
    };
    let got = null as typeof body | null;
    service.get('organic-dreams', 'feminino').subscribe((res) => {
      got = res;
    });
    const req = http.expectOne(
      'http://order.test/api/admin/collections/organic-dreams/order?gender=feminino',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(body);
    expect(got).toEqual(body);
  });

  it('PUTs { productIds } and reads the same shape back', () => {
    const body = {
      collection: 'organic-dreams',
      gender: 'masculino' as const,
      productIds: ['id-a', 'id-b'],
    };
    let got = null as typeof body | null;
    service.put('organic-dreams', 'masculino', ['id-a', 'id-b']).subscribe((res) => {
      got = res;
    });
    const req = http.expectOne(
      'http://order.test/api/admin/collections/organic-dreams/order?gender=masculino',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ productIds: ['id-a', 'id-b'] });
    req.flush(body);
    expect(got).toEqual(body);
  });

  it('falls back locally when the order endpoint is missing', () => {
    let got: { productIds: string[] } | null = null;
    service.get('niponic-dreams', 'feminino').subscribe((res) => {
      got = res;
    });
    http
      .expectOne('http://order.test/api/admin/collections/niponic-dreams/order?gender=feminino')
      .flush('not found', { status: 404, statusText: 'Not Found' });
    expect(got?.productIds).toEqual([]);
  });

  it('surfaces a 400 message so the UI can restore the previous order', () => {
    let err: HttpErrorResponse | null = null;
    service.put('organic-dreams', 'feminino', ['missing']).subscribe({
      error: (e: HttpErrorResponse) => {
        err = e;
      },
    });
    http
      .expectOne('http://order.test/api/admin/collections/organic-dreams/order?gender=feminino')
      .flush({ message: 'Lista incompleta para este gênero.' }, { status: 400, statusText: 'Bad Request' });
    expect(err?.status).toBe(400);
    expect((err?.error as { message?: string })?.message).toBe('Lista incompleta para este gênero.');
  });
});
