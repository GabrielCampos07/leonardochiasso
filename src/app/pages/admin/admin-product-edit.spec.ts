import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { CatalogService } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { Product, SITE_UNAVAILABLE_HINT } from '../../core/product.model';
import { ToastService } from '../../core/feedback/toast.service';
import { AdminProductEditPage } from './admin-product-edit';

function archivedProduct(): Product {
  return {
    id: 'look-arquivo',
    slug: 'look-arquivo',
    name: 'Look arquivo',
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
    archivedAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('AdminProductEditPage archived product', () => {
  let fixture: ComponentFixture<AdminProductEditPage>;
  let restoreViaApi: jasmine.Spy;

  beforeEach(async () => {
    restoreViaApi = jasmine.createSpy('restoreViaApi').and.returnValue(
      of({ ...archivedProduct(), archivedAt: null }),
    );
    await TestBed.configureTestingModule({
      imports: [AdminProductEditPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'look-arquivo' }) } },
        },
        {
          provide: AdminCatalogService,
          useValue: {
            get$: () => of(archivedProduct()),
            restoreViaApi,
            useApi: true,
            mediaOf: () => [],
          },
        },
        { provide: AdminCollectionsApiService, useValue: { list: () => of([]) } },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        {
          provide: ToastService,
          useValue: { success: () => undefined, error: () => undefined, info: () => undefined },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductEditPage);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('opens the archived product with an Arquivado notice and Restaurar', () => {
    expect(fixture.componentInstance.missing()).toBeFalse();
    expect(fixture.componentInstance.isArchived()).toBeTrue();
    expect(fixture.componentInstance.draft()?.slug).toBe('look-arquivo');
    const banner = fixture.nativeElement.querySelector('.admin-edit__archived') as HTMLElement;
    expect(banner.textContent).toContain('Arquivado');
    const restore = fixture.nativeElement.querySelector('.admin-edit__archived button') as HTMLButtonElement;
    expect(restore.textContent?.trim()).toBe('Restaurar');
    restore.click();
    expect(restoreViaApi).toHaveBeenCalledWith('look-arquivo');
  });

  it('shows locked Arquivado status and a disabled Ver no site', () => {
    const status = fixture.nativeElement.querySelector('#atelier-product-status') as HTMLElement;
    expect(status.querySelector('.is-on')?.textContent?.trim()).toBe('Arquivado');
    expect(status.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled')).toBe('true');
    expect((status.querySelector('button') as HTMLButtonElement).disabled).toBeTrue();

    const site = fixture.nativeElement.querySelector('.admin-edit__site') as HTMLButtonElement;
    expect(site.disabled).toBeTrue();
    expect(site.getAttribute('title')).toBe(SITE_UNAVAILABLE_HINT);
  });
});

describe('AdminProductEditPage open then close', () => {
  it('opens a piece with legacy color text and does not PUT on cancel', async () => {
    const saveProduct$ = jasmine.createSpy('saveProduct$');
    const updateViaApi = jasmine.createSpy('updateViaApi');
    const createViaApi = jasmine.createSpy('createViaApi');
    const get$ = jasmine.createSpy('get$').and.returnValue(
      of({
        id: 'look-novo',
        slug: 'look-novo',
        name: 'Look novo',
        price: 800,
        priceCents: 80000,
        priceLabel: 'R$ 800,00',
        color: 'Off-white / Black',
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
      } satisfies Product),
    );

    await TestBed.configureTestingModule({
      imports: [AdminProductEditPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'look-novo' }) } },
        },
        {
          provide: AdminCatalogService,
          useValue: {
            get$,
            saveProduct$,
            updateViaApi,
            createViaApi,
            useApi: true,
            mediaOf: () => [],
            slugExists: () => false,
          },
        },
        { provide: AdminCollectionsApiService, useValue: { list: () => of([]) } },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        {
          provide: ToastService,
          useValue: { success: () => undefined, error: () => undefined, info: () => undefined },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminProductEditPage);
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();

    expect(get$).toHaveBeenCalledWith('look-novo');
    expect(fixture.componentInstance.draft()?.color).toBe('Off-white / Black');
    const form = fixture.nativeElement.querySelector('lc-admin-product-form') as HTMLElement;
    expect(form.textContent).toContain('Off-white');
    expect(form.textContent).toContain('Black');
    expect(saveProduct$).not.toHaveBeenCalled();
    expect(updateViaApi).not.toHaveBeenCalled();
    expect(createViaApi).not.toHaveBeenCalled();

    (form.querySelector('.admin-edit__cancel') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalled();
    expect(saveProduct$).not.toHaveBeenCalled();
    expect(updateViaApi).not.toHaveBeenCalled();
    expect(createViaApi).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
