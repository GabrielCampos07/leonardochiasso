import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionOrderService } from '../../core/admin-collection-order.service';
import { adminListCacheKey, clearAdminListCache, writeAdminListCache } from '../../core/admin-list-cache';
import { clearAdminProductsView, writeAdminProductsView } from '../../core/admin-products-view';
import { CatalogService } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import {
  LISTA_ORDER_MAINTENANCE_NOTICE,
  LISTA_REORDER_ENABLED,
  TODAS_COLLECTION_ORDER_NOTE,
} from '../../core/membership-order';
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
    collections: [
      { slug: 'organic-dreams', name: 'Organic Dreams', sortOrder: patch.slug === 'b' ? 0 : 1 },
    ],
    ...patch,
    id: patch.id ?? patch.slug,
  };
}

describe('AdminProductsPage reorder', () => {
  let fixture: ComponentFixture<AdminProductsPage>;
  let toast: { error: jasmine.Spy; success: jasmine.Spy; info: jasmine.Spy };
  let reorderViaApi: Subject<void>;
  let getOrder: jasmine.Spy;
  let putOrder: jasmine.Spy;

  const pieces = [
    sample({ slug: 'a', name: 'A', productId: 'id-a' }),
    sample({ slug: 'b', name: 'B', productId: 'id-b' }),
  ];

  beforeEach(async () => {
    clearAdminListCache();
    clearAdminProductsView();
    sessionStorage.clear();
    toast = {
      error: jasmine.createSpy('error'),
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
    };
    reorderViaApi = new Subject<void>();
    getOrder = jasmine.createSpy('get').and.returnValue(of({ productIds: [] }));
    putOrder = jasmine.createSpy('put').and.returnValue(of({ productIds: [] }));

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
          useValue: { get: getOrder, put: putOrder },
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

  it('shows Ordem em manutenção and hides Subir/Descer/drag while reorder is disabled', () => {
    expect(LISTA_REORDER_ENABLED).toBeFalse();
    const notice = fixture.nativeElement.querySelector('lc-admin-notice[role="status"]') as HTMLElement;
    expect(notice?.textContent?.trim()).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
    expect(fixture.nativeElement.textContent).not.toContain('Arraste para reordenar · ↑↓ também funciona');
    expect(fixture.nativeElement.textContent).not.toContain('Subir');
    expect(fixture.nativeElement.textContent).not.toContain('Descer');
    expect(fixture.nativeElement.querySelector('.admin-row__handle')).toBeNull();
    expect(fixture.componentInstance.canDrag()).toBeFalse();
  });

  it('explains that site order is per collection while the filter is Todas', () => {
    expect(fixture.componentInstance.collection()).toBe('todas');
    expect(fixture.nativeElement.textContent).toContain(TODAS_COLLECTION_ORDER_NOTE);
    fixture.componentInstance.setCollectionFilter('Organic Dreams');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(TODAS_COLLECTION_ORDER_NOTE);
    fixture.componentInstance.setCollectionFilter('todas');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(TODAS_COLLECTION_ORDER_NOTE);
  });

  it('keeps Arquivados and search after the list remounts (CANCELAR)', async () => {
    fixture.componentInstance.setQuery('mosaico');
    fixture.componentInstance.onArchivedFilter(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.query()).toBe('mosaico');
    expect(fixture.componentInstance.showArchived()).toBeTrue();
    fixture.destroy();
    TestBed.resetTestingModule();

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
            reorderViaApi: () => of(void 0),
            archiveViaApi: () => of(null),
            restoreViaApi: () => of(null),
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
    const remount = TestBed.createComponent(AdminProductsPage);
    remount.detectChanges();
    expect(remount.componentInstance.query()).toBe('mosaico');
    expect(remount.componentInstance.showArchived()).toBeTrue();
    expect((remount.nativeElement.querySelector('input[type="search"]') as HTMLInputElement).value).toBe(
      'mosaico',
    );
    expect((remount.nativeElement.querySelector('.admin-list__check input') as HTMLInputElement).checked).toBeTrue();
    remount.destroy();
  });

  it('reads Lista order from sortOrder + productId and does not GET gender-order', () => {
    fixture.componentInstance.setCollectionFilter('Organic Dreams');
    fixture.detectChanges();
    expect(getOrder).not.toHaveBeenCalled();
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['b', 'a']);
  });

  it('does not persist Subir/Descer/drag while reorder is disabled', () => {
    fixture.componentInstance.setCollectionFilter('Organic Dreams');
    fixture.detectChanges();
    fixture.componentInstance.move('b', 1);
    fixture.componentInstance.drop({
      previousIndex: 0,
      currentIndex: 1,
      distance: { x: 0, y: 80 },
      dropPoint: { x: 10, y: 120 },
      container: {
        data: [...fixture.componentInstance.filtered()],
        getSortedItems: () => [
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 0, bottom: 80, height: 80 }) } } },
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 80, bottom: 160, height: 80 }) } } },
        ],
      },
    } as never);
    expect(putOrder).not.toHaveBeenCalled();
    expect(reorderViaApi.observed).toBeFalse();
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['b', 'a']);
  });

  it('does not PUT /admin/products/reorder on the unfiltered list', () => {
    fixture.componentInstance.setGenderFilter('todos');
    fixture.componentInstance.setCollectionFilter('todas');
    fixture.detectChanges();
    fixture.componentInstance.move('a', 1);
    fixture.componentInstance.drop({
      previousIndex: 0,
      currentIndex: 1,
      distance: { x: 0, y: 80 },
      dropPoint: { x: 10, y: 120 },
      container: {
        data: [...fixture.componentInstance.filtered()],
        getSortedItems: () => [
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 0, bottom: 80, height: 80 }) } } },
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 80, bottom: 160, height: 80 }) } } },
        ],
      },
    } as never);
    expect(putOrder).not.toHaveBeenCalled();
    expect(reorderViaApi.observed).toBeFalse();
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['a', 'b']);
  });
});

describe('AdminProductsPage cache and skeleton', () => {
  beforeEach(() => {
    clearAdminListCache();
    clearAdminProductsView();
    sessionStorage.clear();
  });

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
    expect(fixture.nativeElement.textContent).toContain('atualizando…');
    expect(fixture.nativeElement.querySelector('.admin-list__count')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(fixture.nativeElement.querySelector('.admin-row--skel')).toBeNull();
    fixture.componentInstance.setGenderFilter('feminino');
    fixture.detectChanges();
    expect(fixture.componentInstance.canDrag()).toBeFalse();
    fixture.componentInstance.drop({
      previousIndex: 0,
      currentIndex: 1,
      distance: { x: 0, y: 80 },
      dropPoint: { x: 10, y: 120 },
      container: {
        data: [...fixture.componentInstance.filtered()],
        getSortedItems: () => [
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 0, bottom: 80, height: 80 }) } } },
        ],
      },
    } as never);
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['cached']);
    expect(fixture.componentInstance.todosHint()).toBe('');
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
    fixture.componentInstance.setGenderFilter('feminino');
    fixture.componentInstance.setCollectionFilter('Organic Dreams');
    fixture.detectChanges();
    expect(LISTA_REORDER_ENABLED).toBeFalse();
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.componentInstance.showSkeleton()).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.admin-row--skel').length).toBeGreaterThan(1);
    fixture.destroy();
  });

  it('unlocks drag only after the fresh list arrives', async () => {
    const list$ = new Subject<Product[]>();
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
            list$: () => list$.asObservable(),
            setOrder: () => undefined,
            reorderViaApi: () => of(void 0),
            archiveViaApi: () => of(null),
            restoreViaApi: () => of(null),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => of({ productIds: [] }), put: () => of({ productIds: [] }) },
        },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { error: () => undefined, success: () => undefined, info: () => undefined } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminProductsPage);
    fixture.detectChanges();
    fixture.componentInstance.setGenderFilter('feminino');
    fixture.detectChanges();
    expect(fixture.componentInstance.canDrag()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('atualizando…');

    list$.next([sample({ slug: 'fresh', name: 'Fresh' })]);
    fixture.detectChanges();
    expect(fixture.componentInstance.filtered().map((p) => p.slug)).toEqual(['fresh']);
    expect(LISTA_REORDER_ENABLED).toBeFalse();
    expect(fixture.componentInstance.canDrag()).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('atualizando…');
    fixture.destroy();
  });
});
