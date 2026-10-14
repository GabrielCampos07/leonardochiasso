import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { CatalogService } from '../../core/catalog.service';
import { ToastService } from '../../core/feedback/toast.service';
import { Product } from '../../core/product.model';
import { AdminProductForm, collectionSelectLabel, parseStockQty } from './admin-product-form';

function sampleProduct(patch: Partial<Product> = {}): Product {
  return {
    id: 'look-novo',
    slug: 'look-novo',
    name: 'Look novo',
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
    collection: 'teste-colecao' as Product['collection'],
    collectionSlug: 'teste-colecao',
    stockQty: 1,
    ...patch,
  };
}

describe('parseStockQty', () => {
  it('keeps integers at or above zero', () => {
    expect(parseStockQty(0)).toBe(0);
    expect(parseStockQty(12)).toBe(12);
    expect(parseStockQty('8')).toBe(8);
  });

  it('clamps negatives and rounds fractions', () => {
    expect(parseStockQty(-3)).toBe(0);
    expect(parseStockQty(2.6)).toBe(3);
    expect(parseStockQty('')).toBe(0);
    expect(parseStockQty(null)).toBe(0);
  });
});

describe('collectionSelectLabel', () => {
  it('shows the collection name instead of the slug for custom collections', () => {
    expect(collectionSelectLabel('teste-col-capa', 'Teste col capa')).toBe('Teste col capa');
    expect(
      collectionSelectLabel('teste-col-capa', 'teste-col-capa', [
        { slug: 'teste-col-capa', name: 'Teste col capa' },
      ]),
    ).toBe('Teste col capa');
  });

  it('keeps official collection labels', () => {
    expect(collectionSelectLabel('organic-dreams')).toBe('Organic Dreams');
  });

  it('never flashes the slug as the visible label', () => {
    expect(collectionSelectLabel('teste-colecao')).toBe('Coleção');
    expect(collectionSelectLabel('teste-colecao', 'teste-colecao')).toBe('Coleção');
  });
});

describe('AdminProductForm', () => {
  let fixture: ComponentFixture<AdminProductForm>;
  let toast: { error: jasmine.Spy; success: jasmine.Spy; info: jasmine.Spy };
  let saveProduct$: jasmine.Spy;
  let list: jasmine.Spy;

  beforeEach(async () => {
    toast = {
      error: jasmine.createSpy('error'),
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
    };
    saveProduct$ = jasmine.createSpy('saveProduct$');
    list = jasmine.createSpy('list').and.returnValue(
      of([
        {
          id: '1',
          slug: 'organic-dreams',
          name: 'Organic Dreams',
          description: null,
          sortOrder: 1,
          publishedAt: null,
        },
        {
          id: '4',
          slug: 'teste-colecao',
          name: 'TESTE-COLECAO',
          description: null,
          sortOrder: 4,
          publishedAt: null,
        },
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [AdminProductForm],
      providers: [
        provideRouter([]),
        {
          provide: AdminCatalogService,
          useValue: {
            useApi: true,
            mediaOf: () => [],
            slugExists: () => false,
            saveProduct$,
          },
        },
        { provide: AdminCollectionsApiService, useValue: { list } },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductForm);
    fixture.componentRef.setInput('product', sampleProduct());
    fixture.componentRef.setInput('isNew', true);
    fixture.componentRef.setInput('collectionRequired', true);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the collection name only and skips a native select', () => {
    expect(list).toHaveBeenCalledWith(false, { refresh: true });
    const trigger = fixture.nativeElement.querySelector('#atelier-product-collection') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent?.replace(/\s+/g, ' ').trim()).toBe('TESTE-COLECAO');
    expect(trigger.textContent).not.toContain('teste-colecao');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('includes a newly created collection after a cache-busting refresh', () => {
    const labels = fixture.componentInstance
      .collectionPickerOptions()
      .map((opt) => opt.label);
    expect(labels).toContain('TESTE-COLECAO');
    expect(labels).not.toContain('teste-colecao');
    expect(list.calls.mostRecent().args).toEqual([false, { refresh: true }]);
  });

  it('shows the API error inline and as a toast on create 400', () => {
    saveProduct$.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: ['property gender should not exist'] },
          }),
      ),
    );

    fixture.componentInstance.save();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('#atelier-product-save-error') as HTMLElement;
    expect(alert?.textContent?.trim()).toBe('property gender should not exist');
    expect(toast.error).toHaveBeenCalledWith('property gender should not exist');
    expect(fixture.componentInstance.saveError()).toBe('property gender should not exist');
  });

  it('shows the API error on edit 500', () => {
    fixture.componentRef.setInput('isNew', false);
    fixture.detectChanges();
    saveProduct$.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            statusText: 'Server Error',
            error: { message: 'Falha interna ao salvar.' },
          }),
      ),
    );

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Falha interna ao salvar.',
    );
    expect(toast.error).toHaveBeenCalledWith('Falha interna ao salvar.');
  });
});
