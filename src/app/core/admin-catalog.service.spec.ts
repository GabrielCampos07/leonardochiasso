import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AdminCatalogService, membershipFieldsForUpdate } from './admin-catalog.service';
import { ApiProductDto } from './catalog.service';
import { LISTA_ORDER_MAINTENANCE_NOTICE, LISTA_REORDER_ENABLED } from './membership-order';
import { Product } from './product.model';

function sampleProduct(patch: Partial<Product> = {}): Product {
  return {
    id: 'look-unissex',
    slug: 'look-unissex',
    name: 'Look Unissex',
    price: 1200,
    priceCents: 120000,
    priceLabel: 'R$ 1.200,00',
    color: 'Off-white',
    size: 'ÚNICO',
    fabric: 'Cânhamo',
    season: 'Seasonless',
    description: 'Peça unissex',
    details: ['linha 1'],
    shipping: 'Frete calculado no checkout',
    thumb: '',
    gallery: [],
    category: 'feminino',
    gender: 'unissex',
    collection: 'Organic Dreams',
    collectionSlug: 'organic-dreams',
    stockQty: 3,
    ...patch,
  };
}

function createdDto(product: Product): ApiProductDto {
  return {
    id: 'prod-1',
    slug: product.slug,
    name: product.name,
    description: product.description,
    details: product.details,
    shipping: product.shipping,
    priceCents: product.priceCents ?? 0,
    currency: 'BRL',
    color: product.color,
    size: product.size,
    fabric: product.fabric,
    season: product.season,
    status: 'published',
    stockQty: product.stockQty,
    category: product.category,
    gender: product.gender ?? null,
    collection: product.collection,
    collections: [{ slug: product.collectionSlug, name: product.collection }],
    thumb: '',
    gallery: [],
    archivedAt: product.archivedAt ?? null,
  };
}

describe('AdminCatalogService create payload contract', () => {
  const originalDemo = environment.demoMode;
  const originalBase = environment.apiBaseUrl;
  let http: HttpTestingController;
  let service: AdminCatalogService;

  beforeEach(() => {
    environment.demoMode = false;
    environment.apiBaseUrl = 'http://payload.test';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AdminCatalogService],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminCatalogService);
  });

  afterEach(() => {
    http.verify();
    environment.demoMode = originalDemo;
    environment.apiBaseUrl = originalBase;
  });

  it('POSTs name, category, gender, collectionSlug and integer stockQty', () => {
    const product = sampleProduct({ stockQty: 3.2, gender: 'unissex' });
    service.saveProduct$(product, { isNew: true, details: ['linha 1'] }).subscribe();

    const req = http.expectOne('http://payload.test/api/admin/products');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({
        name: 'Look Unissex',
        slug: 'look-unissex',
        category: 'feminino',
        gender: 'unissex',
        collectionSlug: 'organic-dreams',
        priceCents: 120000,
        stockQty: 3,
        status: 'draft',
        description: 'Peça unissex',
        color: 'Off-white',
        size: 'ÚNICO',
        fabric: 'Cânhamo',
        season: 'Seasonless',
      }),
    );
    expect(Number.isInteger(req.request.body.stockQty)).toBeTrue();
    expect(req.request.body.stockQty).toBe(3);

    req.flush(createdDto(product));
    const patch = http.expectOne('http://payload.test/api/admin/products/look-unissex');
    expect(patch.request.method).toBe('PATCH');
    patch.flush(createdDto(product));
  });

  it('keeps masculino as both category and gender', () => {
    const product = sampleProduct({
      slug: 'look-masc',
      name: 'Look Masc',
      category: 'masculino',
      gender: 'masculino',
      collectionSlug: 'teste-colecao' as Product['collectionSlug'],
      collection: 'TESTE-COLECAO' as Product['collection'],
    });
    service.createPublishedProduct$(product).subscribe();

    const req = http.expectOne('http://payload.test/api/admin/products');
    expect(req.request.body.category).toBe('masculino');
    expect(req.request.body.gender).toBe('masculino');
    expect(req.request.body.collectionSlug).toBe('teste-colecao');
    req.flush(createdDto(product));
  });

  it('POSTs a negative stockQty without clamping it', () => {
    const product = sampleProduct({ stockQty: -4 });
    service.createPublishedProduct$(product).subscribe();
    const req = http.expectOne('http://payload.test/api/admin/products');
    expect(req.request.body.stockQty).toBe(-4);
    req.flush(createdDto(product));
  });

  it('loads an archived product after the live list misses it', () => {
    const box: { value?: Product } = {};
    service.get$('look-arquivo').subscribe((p) => {
      if (p) box.value = p;
    });
    http.expectOne('http://payload.test/api/admin/products').flush([]);
    const archived = http.expectOne(
      (req) =>
        req.url === 'http://payload.test/api/admin/products' && req.params.get('archived') === 'true',
    );
    archived.flush([
      createdDto(sampleProduct({ slug: 'look-arquivo', name: 'Look arquivo', archivedAt: '2026-10-01T00:00:00.000Z' })),
    ]);
    expect(box.value?.slug).toBe('look-arquivo');
    expect(box.value?.archivedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('POSTs status draft by default and published when chosen', () => {
    service.saveProduct$(sampleProduct(), { isNew: true, details: [] }).subscribe();
    const draftReq = http.expectOne('http://payload.test/api/admin/products');
    expect(draftReq.request.body.status).toBe('draft');
    draftReq.flush(createdDto(sampleProduct()));
    http.expectOne('http://payload.test/api/admin/products/look-unissex').flush(createdDto(sampleProduct()));

    service
      .saveProduct$(sampleProduct({ status: 'published' }), { isNew: true, details: [] })
      .subscribe();
    const pubReq = http.expectOne('http://payload.test/api/admin/products');
    expect(pubReq.request.body.status).toBe('published');
    pubReq.flush(createdDto(sampleProduct({ status: 'published' })));
    http
      .expectOne('http://payload.test/api/admin/products/look-unissex')
      .flush(createdDto(sampleProduct({ status: 'published' })));
  });

  it('PATCHes status on edit', () => {
    service
      .saveProduct$(sampleProduct({ status: 'draft' }), { isNew: false, details: [] })
      .subscribe();
    const req = http.expectOne('http://payload.test/api/admin/products/look-unissex');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBe('draft');
    req.flush(createdDto(sampleProduct({ status: 'draft' })));
  });

  it('omits collectionSlug and category on a normal name save', () => {
    const original = sampleProduct();
    service
      .saveProduct$(sampleProduct({ name: 'Look editado' }), {
        isNew: false,
        details: ['linha 1'],
        original,
      })
      .subscribe();
    const req = http.expectOne('http://payload.test/api/admin/products/look-unissex');
    expect(req.request.body.name).toBe('Look editado');
    expect(req.request.body.collectionSlug).toBeUndefined();
    expect(req.request.body.category).toBeUndefined();
    expect(req.request.body.gender).toBeUndefined();
    req.flush(createdDto(sampleProduct({ name: 'Look editado' })));
  });

  it('sends collectionSlug only when the collection changes', () => {
    const original = sampleProduct();
    service
      .saveProduct$(
        sampleProduct({
          collectionSlug: 'niponic-dreams' as Product['collectionSlug'],
          collection: 'Niponic Dreams' as Product['collection'],
        }),
        { isNew: false, details: [], original },
      )
      .subscribe();
    const req = http.expectOne('http://payload.test/api/admin/products/look-unissex');
    expect(req.request.body.collectionSlug).toBe('niponic-dreams');
    expect(req.request.body.category).toBeUndefined();
    req.flush(createdDto(sampleProduct({ collectionSlug: 'niponic-dreams' as Product['collectionSlug'] })));
  });

  it('omits status when saving an archived piece so it stays archived', () => {
    service
      .saveProduct$(
        sampleProduct({ status: 'archived', archivedAt: '2026-10-01T00:00:00.000Z' }),
        { isNew: false, details: [] },
      )
      .subscribe();
    const req = http.expectOne('http://payload.test/api/admin/products/look-unissex');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBeUndefined();
    req.flush(
      createdDto(sampleProduct({ status: 'archived', archivedAt: '2026-10-01T00:00:00.000Z' })),
    );
  });

  it('does not PUT /admin/products/reorder while LISTA_REORDER_ENABLED is false', () => {
    expect(LISTA_REORDER_ENABLED).toBeFalse();
    const box: { err?: Error } = {};
    service.reorderViaApi(['look-b', 'look-a']).subscribe({
      next: () => fail('expected lock'),
      error: (e: unknown) => {
        box.err = e as Error;
      },
    });
    http.expectNone('http://payload.test/api/admin/products/reorder');
    expect(box.err?.message).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
  });
});

describe('membershipFieldsForUpdate', () => {
  it('omits collection and category when they are unchanged', () => {
    const original = sampleProduct();
    expect(membershipFieldsForUpdate(sampleProduct({ name: 'Outro' }), original)).toEqual({});
  });

  it('includes only the field that changed', () => {
    const original = sampleProduct();
    expect(
      membershipFieldsForUpdate(
        sampleProduct({ collectionSlug: 'niponic-dreams' as Product['collectionSlug'] }),
        original,
      ),
    ).toEqual({ collectionSlug: 'niponic-dreams' });
  });
});
