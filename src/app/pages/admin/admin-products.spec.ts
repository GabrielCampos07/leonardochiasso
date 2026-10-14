import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionOrderService } from '../../core/admin-collection-order.service';
import { adminListCacheKey, clearAdminListCache, writeAdminListCache } from '../../core/admin-list-cache';
import { CatalogService } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { Product } from '../../core/product.model';
import { AdminProductsPage } from './admin-products';

function sample(patch: Partial<Product> & Pick<Product, 'slug' | 'name'>): Product {
  return {
    price: 800,
    priceCents: 80000,
    priceLabel: 'R$ 800,00',
    color: '',
    size: 'ÚNICO',
    fabric: '',
    season: 'Seasonless',
    description: '',
    details: [],
    shipping: '',
    thumb: '',
    gallery: [],
    category: 'feminino',
    gender: 'feminino',
    collection: 'Organic Dreams',
    collectionSlug: 'organic-dreams',
    stockQty: 1,
    productId: `id-${patch.slug}`,
    ...patch,
    id: patch.id ?? patch.slug,
  };
}

describe('AdminProductsPage reorder', () => {
  let fixture: ComponentFixture<AdminProductsPage>;
  let toast: { error: jasmine.Spy; success: jasmine.Spy; info: jasmine.Spy };
  let reorderViaApi: Subject<void>;

  const pieces = [
    sample({ slug: 'a', name: 'A', productId: 'id-a' }),
    sample({ slug: 'b', name: 'B', productId: 'id-b' }),
  ];

  beforeEach(async () => {
    toast = {
      error: jasmine.createSpy('error'),
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
    };
    reorderViaApi = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [AdminProductsPage],
      providers: [
        provideRouter([]),
        {
          provide: AdminCatalogService,
          useValue: {
            useApi: true,
            list$: () => of(pieces),
            setOrder: () => undefined,
            reorderViaApi: () => reorderViaApi.asObservable(),
            archiveViaApi: () => of(pieces[0]),
            restoreViaApi: () => of(pieces[0]),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => of({ productIds: [] }), put: () => of({ productIds: [] }) },
        },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductsPage);
    fixture.detectChanges();
    fixture.componentInstance.setGenderFilter('feminino');
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('applies the dropped order immediately, before the save finishes', () => {
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['a', 'b']);
    const bound = [...fixture.componentInstance.filtered()];

    fixture.componentInstance.drop({
      previousIndex: 0,
      currentIndex: 1,
      distance: { x: 0, y: 80 },
      dropPoint: { x: 10, y: 120 },
      container: {
        data: bound,
        getSortedItems: () => [
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 0, bottom: 80, height: 80 }) } } },
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 80, bottom: 160, height: 80 }) } } },
        ],
      },
    } as never);
    fixture.detectChanges();

    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['b', 'a']);
    expect(bound.map((p) => p.slug)).toEqual(['b', 'a']);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    reorderViaApi.error(
      new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Não foi possível salvar a ordem.' },
      }),
    );
    fixture.detectChanges();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('AdminProductsPage cache and skeleton', () => {
  afterEach(() => {
    clearAdminListCache();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('paints the last list immediately while GET /api/products is still in flight', async () => {
    writeAdminListCache(adminListCacheKey('products', false), [
      sample({ slug: 'cached', name: 'Cached' }),
    ]);
    await TestBed.configureTestingModule({
      imports: [AdminProductsPage],
      providers: [
        provideRouter([]),
        {
          provide: AdminCatalogService,
          useValue: {
            useApi: true,
            list$: () => NEVER,
            setOrder: () => undefined,
            reorderViaApi: () => of(void 0),
            archiveViaApi: () => of(null),
            restoreViaApi: () => of(null),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => NEVER, put: () => of({ productIds: [] }) },
        },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { error: () => undefined, success: () => undefined, info: () => undefined } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminProductsPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.showSkeleton()).toBeFalse();
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['cached']);
    expect(fixture.nativeElement.textContent).toContain('Cached');
    expect(fixture.nativeElement.querySelector('.admin-row--skel')).toBeNull();
    fixture.destroy();
  });

  it('shows skeleton rows instead of a lone Carregando… when the cache is empty', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductsPage],
      providers: [
        provideRouter([]),
        {
          provide: AdminCatalogService,
          useValue: {
            useApi: true,
            list$: () => NEVER,
            setOrder: () => undefined,
            reorderViaApi: () => of(void 0),
            archiveViaApi: () => of(null),
            restoreViaApi: () => of(null),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => NEVER, put: () => of({ productIds: [] }) },
        },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { error: () => undefined, success: () => undefined, info: () => undefined } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminProductsPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.showSkeleton()).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.admin-row--skel').length).toBeGreaterThan(1);
    fixture.destroy();
  });
});
