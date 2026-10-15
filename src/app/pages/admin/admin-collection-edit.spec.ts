import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, Subject, of } from 'rxjs';
import { ADMIN_LOAD_TIMEOUT_MESSAGE, ADMIN_LOAD_TIMEOUT_MS } from '../../core/admin-archive';
import { adminListCacheKey, clearAdminListCache, writeAdminCache } from '../../core/admin-list-cache';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { AdminCollectionOrderService } from '../../core/admin-collection-order.service';
import { AdminCollectionProductsService } from '../../core/admin-collection-products';
import { ApiProductDto } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { MASCULINO_UNISSEX_NOTICE, matchesGenderFilter, productGender } from '../../core/product-gender';
import {
  LISTA_ORDER_MAINTENANCE_NOTICE,
  LISTA_REORDER_ENABLED,
  sortByMembershipSortOrder,
} from '../../core/membership-order';
import {
  AdminCollectionEditPage,
  findAdminCollection,
  orderByMembership,
  productsInCollection,
} from './admin-collection-edit';

function dto(patch: Partial<ApiProductDto> & Pick<ApiProductDto, 'slug' | 'name' | 'gender'>): ApiProductDto {
  return {
    id: patch.id ?? patch.slug,
    description: '',
    details: [],
    shipping: null,
    priceCents: 0,
    currency: 'BRL',
    color: null,
    size: null,
    fabric: null,
    season: null,
    category: patch.gender === 'masculino' ? 'masculino' : 'feminino',
    collection: 'TESTE-COLECAO2',
    collections: patch.collections ?? [
      { slug: 'teste-colecao2', name: 'TESTE-COLECAO2', sortOrder: 0 },
    ],
    thumb: '',
    gallery: [],
    stockQty: 1,
    ...patch,
  };
}

describe('Masculino unissex notice', () => {
  it('is shown whenever the Masculino filter is active, not only during a drag', () => {
    expect(MASCULINO_UNISSEX_NOTICE).toBe('peças unissex aparecem no site no bloco feminino');
    const masculinoActive = (filter: 'todos' | 'feminino' | 'masculino') => filter === 'masculino';
    expect(masculinoActive('masculino')).toBeTrue();
    expect(masculinoActive('feminino')).toBeFalse();
    expect(masculinoActive('todos')).toBeFalse();
  });
});

describe('findAdminCollection', () => {
  const live = [{ slug: 'organic-dreams', name: 'Organic Dreams', archivedAt: null }];
  const archived = [
    {
      slug: 'teste-col-ux-r',
      name: 'TESTE-COL-UX-R',
      archivedAt: '2026-10-12T12:00:00.000Z',
    },
  ];

  it('finds a live collection in the live list', () => {
    expect(findAdminCollection('organic-dreams', live as never, archived as never)?.name).toBe(
      'Organic Dreams',
    );
  });

  it('loads an archived collection from the archived list (live list excludes it)', () => {
    expect(findAdminCollection('teste-col-ux-r', live as never, [] as never)).toBeUndefined();
    expect(findAdminCollection('teste-col-ux-r', live as never, archived as never)?.name).toBe(
      'TESTE-COL-UX-R',
    );
  });
});

describe('productsInCollection', () => {
  it('keeps products linked to an archived collection via the join', () => {
    const admin = [
      {
        slug: 'vestido',
        collections: [{ slug: 'teste-col-ux-r', name: 'TESTE-COL-UX-R' }],
      },
      { slug: 'outro', collections: [{ slug: 'organic-dreams', name: 'Organic Dreams' }] },
    ];
    const rows = productsInCollection({ slug: 'teste-col-ux-r' }, admin as never, []);
    expect(rows.map((p) => p.slug)).toEqual(['vestido']);
  });

  it('matches membership by collection id when slug is missing', () => {
    const admin = [
      {
        slug: 'calca-pantalona-rasgo',
        collections: [{ id: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad', name: 'Organic Dreams' }],
      },
    ];
    const rows = productsInCollection(
      {
        slug: 'organic-dreams',
        id: 'a72b6b4e-6765-4f4d-85b7-91017c68a9ad',
        name: 'Organic Dreams',
      },
      admin as never,
      [],
    );
    expect(rows.map((p) => p.slug)).toEqual(['calca-pantalona-rasgo']);
  });

  it('orders members from the admin membership list, not the public catalog', () => {
    const rows = orderByMembership(
      [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }],
      ['c', 'a'],
    );
    expect(rows.map((p) => p.slug)).toEqual(['c', 'a', 'b']);
  });

  it('Lista order matches public API membership sort, including ties', () => {
    const collection = 'organic-dreams';
    const adminList = [
      dto({
        slug: 'pantalona-rasgo',
        name: 'Pantalona Rasgo',
        gender: 'feminino',
        id: 'id-z',
        collections: [{ slug: collection, name: 'Organic Dreams', sortOrder: 1 }],
      }),
      dto({
        slug: 'vestido-lg-assimetrico',
        name: 'Vestido Lg Assimétrico',
        gender: 'feminino',
        id: 'id-a',
        collections: [{ slug: collection, name: 'Organic Dreams', sortOrder: 1 }],
      }),
      dto({
        slug: 'vestido-longo-mosaico-textil',
        name: 'Vestido longo mosaico textil',
        gender: 'feminino',
        id: 'id-m',
        collections: [{ slug: collection, name: 'Organic Dreams', sortOrder: 0 }],
      }),
    ];
    const lista = sortByMembershipSortOrder(
      productsInCollection({ slug: collection }, adminList, []),
      collection,
    );
    const publicApi = [...adminList].sort((a, b) => {
      const ao = a.collections?.find((c) => c.slug === collection)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.collections?.find((c) => c.slug === collection)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    expect(lista.map((p) => p.slug)).toEqual(publicApi.map((p) => p.slug));
    expect(lista.map((p) => p.name)).toEqual([
      'Vestido longo mosaico textil',
      'Vestido Lg Assimétrico',
      'Pantalona Rasgo',
    ]);
  });

  it('keeps unissex in both admin gender filters', () => {
    const uni = { slug: 'trench', gender: 'unissex', category: 'feminino' };
    expect(productGender(uni)).toBe('unissex');
    expect(matchesGenderFilter(uni, 'feminino')).toBeTrue();
    expect(matchesGenderFilter(uni, 'masculino')).toBeTrue();
  });
});

describe('AdminCollectionEditPage gender UX', () => {
  let fixture: ComponentFixture<AdminCollectionEditPage>;
  let toast: { error: jasmine.Spy; success: jasmine.Spy; info: jasmine.Spy };
  let orderGet: Subject<{ collection: string; gender: 'masculino'; productIds: string[] }>;
  let getOrder: jasmine.Spy;
  let put: jasmine.Spy;
  let replace: jasmine.Spy;
  let remove: jasmine.Spy;

  const pieces = [
    dto({
      slug: 'f1',
      name: 'F1',
      gender: 'feminino',
      id: 'id-f1',
      collections: [{ slug: 'teste-colecao2', name: 'TESTE-COLECAO2', sortOrder: 0 }],
    }),
    dto({
      slug: 'u1',
      name: 'U1',
      gender: 'unissex',
      id: 'id-u1',
      collections: [{ slug: 'teste-colecao2', name: 'TESTE-COLECAO2', sortOrder: 1 }],
    }),
    dto({
      slug: 'm1',
      name: 'M1',
      gender: 'masculino',
      id: 'id-m1',
      collections: [{ slug: 'teste-colecao2', name: 'TESTE-COLECAO2', sortOrder: 2 }],
    }),
    dto({
      slug: 'old',
      name: 'Old',
      gender: 'masculino',
      id: 'id-old',
      archivedAt: '2026-10-01T00:00:00.000Z',
      collections: [{ slug: 'teste-colecao2', name: 'TESTE-COLECAO2', sortOrder: 3 }],
    }),
  ];

  beforeEach(async () => {
    toast = {
      error: jasmine.createSpy('error'),
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
    };
    orderGet = new Subject();
    getOrder = jasmine.createSpy('get').and.returnValue(orderGet.asObservable());
    put = jasmine.createSpy('put').and.returnValue(of({ productIds: [] }));
    replace = jasmine.createSpy('replace').and.returnValue(of({}));
    remove = jasmine.createSpy('remove').and.returnValue(of({}));
    const meta = {
      id: 'col-1',
      slug: 'teste-colecao2',
      name: 'TESTE-COLECAO2',
      description: null,
      sortOrder: 4,
      publishedAt: null,
    };

    await TestBed.configureTestingModule({
      imports: [AdminCollectionEditPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'teste-colecao2' })) },
        },
        {
          provide: AdminCollectionsApiService,
          useValue: {
            list: (archived = false) => of(archived ? [] : [meta]),
            getPublicDetail: jasmine.createSpy('getPublicDetail').and.callFake(() => {
              throw new Error('admin must not GET /api/collections/:slug');
            }),
            getProducts: () => of({ productSlugs: pieces.map((p) => p.slug) }),
            listAdminProducts: () => of(pieces),
            archive: () => of(meta),
            restore: () => of(meta),
            update: () => of(meta),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: {
            get: getOrder,
            put,
          },
        },
        {
          provide: AdminCollectionProductsService,
          useValue: { remember: () => undefined, replace, remove },
        },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCollectionEditPage);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('does not GET the public /api/collections/:slug from the admin detail', () => {
    const api = TestBed.inject(AdminCollectionsApiService) as unknown as {
      getPublicDetail: jasmine.Spy;
    };
    expect(api.getPublicDetail).not.toHaveBeenCalled();
  });

  it('shows Ordem em manutenção and hides Subir/Descer/drag while reorder is disabled', () => {
    if (LISTA_REORDER_ENABLED) {
      expect(fixture.componentInstance.listaReorderEnabled).toBeTrue();
      return;
    }
    fixture.detectChanges();
    const notice = fixture.nativeElement.querySelector('lc-admin-notice[role="status"]') as HTMLElement;
    expect(notice?.tagName).toBe('LC-ADMIN-NOTICE');
    expect(notice?.textContent?.trim()).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
    expect(fixture.nativeElement.textContent).not.toContain('Subir');
    expect(fixture.nativeElement.textContent).not.toContain('Descer');
    expect(fixture.nativeElement.querySelector('.admin-col-products__handle')).toBeNull();
    expect(fixture.componentInstance.canDrag()).toBeFalse();
  });

  it('shows the Masculino notice as soon as that filter is on', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    fixture.detectChanges();
    const notices = [...fixture.nativeElement.querySelectorAll('.admin-col-products__notice')].map(
      (el: HTMLElement) => el.textContent?.trim(),
    );
    expect(notices).toContain(MASCULINO_UNISSEX_NOTICE);
    expect(fixture.componentInstance.showUnissexNotice()).toBeTrue();
  });

  it('reads Lista order from sortOrder + productId and does not GET gender-order', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    fixture.detectChanges();
    expect(fixture.componentInstance.orderLoading()).toBeFalse();
    expect(fixture.componentInstance.visibleProducts().map((p) => p.name)).toEqual(['U1', 'M1']);
    if (!LISTA_REORDER_ENABLED) {
      expect(getOrder).not.toHaveBeenCalled();
    }
  });

  it('does not remove a piece while reorder is disabled', async () => {
    if (LISTA_REORDER_ENABLED) {
      await fixture.componentInstance.removeProduct('u1');
      expect(remove).toHaveBeenCalledWith('teste-colecao2', 'u1');
      expect(replace).not.toHaveBeenCalled();
      return;
    }
    expect(fixture.nativeElement.textContent).not.toContain('Remover');
    await fixture.componentInstance.removeProduct('u1');
    expect(replace).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(fixture.componentInstance.products().map((p) => p.slug)).toContain('u1');
  });

  it('does not persist Subir/Descer/drag while reorder is disabled', () => {
    if (LISTA_REORDER_ENABLED) {
      expect(LISTA_REORDER_ENABLED).toBeTrue();
      return;
    }
    fixture.componentInstance.setGenderFilter('masculino');
    fixture.detectChanges();
    fixture.componentInstance.move('u1', 1);
    fixture.componentInstance.onDrop({
      previousIndex: 0,
      currentIndex: 1,
      distance: { x: 0, y: 80 },
      dropPoint: { x: 10, y: 120 },
      container: {
        getSortedItems: () => [
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 0, bottom: 80, height: 80 }) } } },
          { element: { nativeElement: { getBoundingClientRect: () => ({ top: 80, bottom: 160, height: 80 }) } } },
        ],
      },
    } as never);
    expect(put).not.toHaveBeenCalled();
    expect(fixture.componentInstance.visibleProducts().map((p) => p.slug)).toEqual(['u1', 'm1']);
  });

  it('omits archived products from the Lista', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    fixture.detectChanges();
    expect(fixture.componentInstance.visibleProducts().map((p) => p.slug)).toEqual(['u1', 'm1']);
    expect(fixture.componentInstance.visibleProducts().map((p) => p.slug)).not.toContain('old');
  });
});

describe('AdminCollectionEditPage cached detail', () => {
  const meta = {
    id: 'col-1',
    slug: 'teste-ordem2',
    name: 'TESTE-ORDEM2',
    description: null,
    sortOrder: 4,
    publishedAt: null,
  };
  const pieces = [dto({ slug: 'cached', name: 'Cached', gender: 'feminino', id: 'id-cached' })];

  afterEach(() => {
    clearAdminListCache();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('shows skeleton rows after a reload when the collection-detail cache is empty', async () => {
    clearAdminListCache();
    sessionStorage.clear();
    const put = jasmine.createSpy('put').and.returnValue(of({ productIds: [] }));
    await TestBed.configureTestingModule({
      imports: [AdminCollectionEditPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'teste-ordem2' })) },
        },
        {
          provide: AdminCollectionsApiService,
          useValue: {
            list: () => NEVER,
            getPublicDetail: jasmine.createSpy('getPublicDetail').and.callFake(() => {
              throw new Error('admin must not GET /api/collections/:slug');
            }),
            getProducts: () => NEVER,
            listAdminProducts: () => NEVER,
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => of({ productIds: [] }), put },
        },
        { provide: AdminCollectionProductsService, useValue: { remember: () => undefined, replace: () => of({}) } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { error: () => undefined, success: () => undefined, info: () => undefined } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminCollectionEditPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.componentInstance.products().length).toBe(0);
    expect(fixture.componentInstance.showSkeleton()).toBeTrue();
    expect(fixture.nativeElement.querySelector('[aria-label="Carregando coleção"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.admin-row--skel').length).toBeGreaterThan(1);
    expect(fixture.nativeElement.textContent).toContain('Carregando…');
    expect(fixture.nativeElement.textContent).not.toContain('Editar coleção');
    fixture.destroy();
  });

  it('shows the cached members with atualizando… and keeps reorder off until the admin GET returns', async () => {
    writeAdminCache(adminListCacheKey('collection-detail', 'teste-ordem2'), {
      meta,
      products: pieces,
    });
    const put = jasmine.createSpy('put').and.returnValue(of({ productIds: [] }));
    await TestBed.configureTestingModule({
      imports: [AdminCollectionEditPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'teste-ordem2' })) },
        },
        {
          provide: AdminCollectionsApiService,
          useValue: {
            list: () => NEVER,
            getPublicDetail: jasmine.createSpy('getPublicDetail').and.callFake(() => {
              throw new Error('admin must not GET /api/collections/:slug');
            }),
            getProducts: () => NEVER,
            listAdminProducts: () => NEVER,
            archive: () => of(meta),
            restore: () => of(meta),
            update: () => of(meta),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => of({ productIds: [] }), put },
        },
        { provide: AdminCollectionProductsService, useValue: { remember: () => undefined, replace: () => of({}) } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { error: () => undefined, success: () => undefined, info: () => undefined } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminCollectionEditPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.showSkeleton()).toBeFalse();
    expect(fixture.componentInstance.products().map((p) => p.slug)).toEqual(['cached']);
    expect(fixture.nativeElement.textContent).toContain('Cached');
    expect(fixture.nativeElement.textContent).toContain('atualizando…');
    fixture.componentInstance.setGenderFilter('feminino');
    fixture.detectChanges();
    expect(fixture.componentInstance.canDrag()).toBeFalse();
    fixture.componentInstance.move('cached', 1);
    expect(put).not.toHaveBeenCalled();
    expect(fixture.componentInstance.todosHint()).toBe('');
    const api = TestBed.inject(AdminCollectionsApiService) as unknown as {
      getPublicDetail: jasmine.Spy;
    };
    expect(api.getPublicDetail).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.admin-list__count')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    fixture.destroy();
  });

  it('sets loading=false when the admin GETs time out', fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [AdminCollectionEditPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'teste-ordem2' })) },
        },
        {
          provide: AdminCollectionsApiService,
          useValue: {
            list: () => NEVER,
            getProducts: () => NEVER,
            listAdminProducts: () => NEVER,
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: { get: () => of({ productIds: [] }), put: () => of({ productIds: [] }) },
        },
        { provide: AdminCollectionProductsService, useValue: { remember: () => undefined, replace: () => of({}) } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { error: () => undefined, success: () => undefined, info: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(AdminCollectionEditPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBeTrue();
    tick(ADMIN_LOAD_TIMEOUT_MS);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.componentInstance.error()).toBe(ADMIN_LOAD_TIMEOUT_MESSAGE);
    fixture.destroy();
  }));
});
