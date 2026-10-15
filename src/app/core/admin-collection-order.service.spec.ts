import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { LISTA_ORDER_MAINTENANCE_NOTICE, LISTA_REORDER_ENABLED } from './membership-order';
import { AdminCollectionOrderService, CollectionGenderOrder } from './admin-collection-order.service';

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
    const body: CollectionGenderOrder = {
      collection: 'organic-dreams',
      gender: 'feminino',
      productIds: ['id-1', 'id-2'],
    };
    const box: { value?: CollectionGenderOrder } = {};
    service.get('organic-dreams', 'feminino').subscribe((res) => {
      box.value = res;
    });
    const req = http.expectOne(
      'http://order.test/api/admin/collections/organic-dreams/order?gender=feminino',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(body);
    expect(box.value).toEqual(body);
  });

  it('does not PUT order while LISTA_REORDER_ENABLED is false', () => {
    if (LISTA_REORDER_ENABLED) return;
    const box: { err?: Error } = {};
    service.put('organic-dreams', 'masculino', ['id-a', 'id-b']).subscribe({
      next: () => fail('expected lock'),
      error: (e: unknown) => {
        box.err = e as Error;
      },
    });
    http.expectNone(
      'http://order.test/api/admin/collections/organic-dreams/order?gender=masculino',
    );
    expect(box.err?.message).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
  });

  it('falls back locally when the order endpoint is missing', () => {
    const box: { value?: CollectionGenderOrder } = {};
    service.get('niponic-dreams', 'feminino').subscribe((res) => {
      box.value = res;
    });
    http
      .expectOne('http://order.test/api/admin/collections/niponic-dreams/order?gender=feminino')
      .flush('not found', { status: 404, statusText: 'Not Found' });
    expect(box.value?.productIds).toEqual([]);
  });

  it('does not write local order when the lock is on', () => {
    if (LISTA_REORDER_ENABLED) return;
    service.put('organic-dreams', 'feminino', ['missing']).subscribe({
      next: () => fail('expected lock'),
      error: () => undefined,
    });
    http.verify();
    expect(localStorage.getItem('lc-admin-collection-order')).toBeNull();
  });
});
