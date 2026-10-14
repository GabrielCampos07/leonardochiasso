import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AdminCatalogService } from './admin-catalog.service';
import { ApiProductDto } from './catalog.service';
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
        status: 'published',
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
      collectionSlug: 'teste-colecao',
      collection: 'TESTE-COLECAO' as Product['collection'],
    });
    service.createPublishedProduct$(product).subscribe();

    const req = http.expectOne('http://payload.test/api/admin/products');
    expect(req.request.body.category).toBe('masculino');
    expect(req.request.body.gender).toBe('masculino');
    expect(req.request.body.collectionSlug).toBe('teste-colecao');
    req.flush(createdDto(product));
  });
});
