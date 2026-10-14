import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
  let removeViaApi: jasmine.Spy;
  let confirm: jasmine.Spy;

  beforeEach(async () => {
    restoreViaApi = jasmine.createSpy('restoreViaApi').and.returnValue(
      of({ ...archivedProduct(), archivedAt: null }),
    );
    removeViaApi = jasmine.createSpy('removeViaApi').and.returnValue(of(undefined));
    confirm = jasmine.createSpy('confirm').and.returnValue(Promise.resolve(true));
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
            removeViaApi,
            useApi: true,
            mediaOf: () => [],
          },
        },
        { provide: AdminCollectionsApiService, useValue: { list: () => of([]) } },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: { confirm } },
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

  it('deletes an archived piece through the confirm modal with its name', async () => {
    const exclude = [...fixture.nativeElement.querySelectorAll('.admin-edit__archived button')].find(
      (btn) => (btn as HTMLButtonElement).textContent?.trim() === 'Excluir',
    ) as HTMLButtonElement;
    expect(exclude).toBeTruthy();
    exclude.click();
    await fixture.whenStable();
    expect(confirm).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Excluir peça',
        message: 'Excluir “Look arquivo”? Esta ação não pode ser desfeita.',
      }),
    );
    expect(removeViaApi).toHaveBeenCalledWith('look-arquivo');
  });
});
