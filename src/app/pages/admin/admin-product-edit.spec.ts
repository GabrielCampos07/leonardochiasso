import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { CatalogService } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { Product } from '../../core/product.model';
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
});
