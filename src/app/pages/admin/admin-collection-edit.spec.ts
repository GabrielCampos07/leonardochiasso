import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { AdminCollectionOrderService } from '../../core/admin-collection-order.service';
import { AdminCollectionProductsService } from '../../core/admin-collection-products';
import { ApiProductDto } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { MASCULINO_UNISSEX_NOTICE, matchesGenderFilter, productGender } from '../../core/product-gender';
import {
  AdminCollectionEditPage,
  findAdminCollection,
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
    collections: [{ slug: 'teste-colecao2', name: 'TESTE-COLECAO2' }],
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
  let put: jasmine.Spy;

  const pieces = [
    dto({ slug: 'f1', name: 'F1', gender: 'feminino', id: 'id-f1' }),
    dto({ slug: 'u1', name: 'U1', gender: 'unissex', id: 'id-u1' }),
    dto({ slug: 'm1', name: 'M1', gender: 'masculino', id: 'id-m1' }),
    dto({
      slug: 'old',
      name: 'Old',
      gender: 'masculino',
      id: 'id-old',
      archivedAt: '2026-10-01T00:00:00.000Z',
    }),
  ];

  beforeEach(async () => {
    toast = {
      error: jasmine.createSpy('error'),
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
    };
    orderGet = new Subject();
    put = jasmine.createSpy('put').and.returnValue(of({ productIds: [] }));
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
            getPublicDetail: () => of({ ...meta, products: pieces }),
            listAdminProducts: () => of(pieces),
            archive: () => of(meta),
            restore: () => of(meta),
            update: () => of(meta),
          },
        },
        {
          provide: AdminCollectionOrderService,
          useValue: {
            get: () => orderGet.asObservable(),
            put,
          },
        },
        { provide: AdminCollectionProductsService, useValue: { remember: () => undefined, replace: () => of({}) } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCollectionEditPage);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the Masculino notice as soon as that filter is on', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    fixture.detectChanges();
    const notice = fixture.nativeElement.querySelector('.admin-col-products__notice') as HTMLElement;
    expect(notice?.textContent?.trim()).toBe(MASCULINO_UNISSEX_NOTICE);
    expect(fixture.componentInstance.showUnissexNotice()).toBeTrue();
  });

  it('hides the old list and shows a loading state while the order GET is in flight', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    fixture.detectChanges();
    expect(fixture.componentInstance.orderLoading()).toBeTrue();
    expect(fixture.componentInstance.visibleProducts()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.admin-col-products__loading')?.textContent?.trim()).toBe(
      'Carregando…',
    );
    expect(fixture.nativeElement.querySelectorAll('.admin-col-products__row').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('F1');

    orderGet.next({ collection: 'teste-colecao2', gender: 'masculino', productIds: ['id-u1', 'id-m1'] });
    fixture.detectChanges();
    expect(fixture.componentInstance.orderLoading()).toBeFalse();
    expect(fixture.componentInstance.visibleProducts().map((p) => p.name)).toEqual(['U1', 'M1']);
    expect(fixture.nativeElement.querySelector('.admin-col-products__loading')).toBeNull();
  });

  it('toasts when a gender-order PUT fails', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    orderGet.next({ collection: 'teste-colecao2', gender: 'masculino', productIds: ['id-u1', 'id-m1'] });
    put.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'productIds must match the gender list' },
          }),
      ),
    );
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
    fixture.detectChanges();
    expect(put).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(String(toast.error.calls.mostRecent().args[0])).toBe('productIds must match the gender list');
    expect(toast.success).not.toHaveBeenCalled();
    expect(fixture.componentInstance.orderError()).toBe('productIds must match the gender list');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'productIds must match the gender list',
    );
  });

  it('omits archived products from the reorder list and PUT body', () => {
    fixture.componentInstance.setGenderFilter('masculino');
    orderGet.next({
      collection: 'teste-colecao2',
      gender: 'masculino',
      productIds: ['id-u1', 'id-m1', 'id-old'],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.visibleProducts().map((p) => p.slug)).toEqual(['u1', 'm1']);
    expect(fixture.componentInstance.visibleProducts().map((p) => p.slug)).not.toContain('old');

    fixture.componentInstance.move('u1', 1);
    expect(put).toHaveBeenCalled();
    const ids = put.calls.mostRecent().args[2] as string[];
    expect(ids).toEqual(['id-m1', 'id-u1']);
    expect(ids).not.toContain('id-old');
  });
});
