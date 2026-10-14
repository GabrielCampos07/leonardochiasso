import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { CatalogService } from '../../core/catalog.service';
import { ToastService } from '../../core/feedback/toast.service';
import { PRODUCT_STATUS_OPTIONS, Product, productStatusForApi } from '../../core/product.model';
import {
  AdminProductForm,
  COLLECTION_PICKER_LOADING,
  STOCK_NEGATIVE_MESSAGE,
  collectionSelectLabel,
  parseStockQty,
  stockQtyError,
} from './admin-product-form';

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
    collectionSlug: 'teste-colecao' as Product['collectionSlug'],
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

  it('keeps negatives and rounds fractions — does not clamp', () => {
    expect(parseStockQty(-3)).toBe(-3);
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

  it('does not use the raw slug as a label before the catalog arrives', () => {
    expect(collectionSelectLabel('teste-colecao2')).toBe('');
    expect(collectionSelectLabel('teste-colecao2', 'teste-colecao2')).toBe('');
  });

  it('uses the catalog name after the list loads even when it matches the slug', () => {
    expect(
      collectionSelectLabel('teste-colecao2', 'teste-colecao2', [
        { slug: 'teste-colecao2', name: 'teste-colecao2' },
      ]),
    ).toBe('teste-colecao2');
    expect(
      collectionSelectLabel('teste-colecao2', 'teste-colecao2', [
        { slug: 'teste-colecao2', name: 'TESTE-COLECAO2' },
      ]),
    ).toBe('TESTE-COLECAO2');
  });
});

describe('stockQtyError', () => {
  it('uses the API copy for negatives', () => {
    expect(stockQtyError(-1)).toBe(STOCK_NEGATIVE_MESSAGE);
    expect(stockQtyError(-1)).toBe('Estoque não pode ser negativo.');
  });

  it('accepts zero, empty, and positive integers', () => {
    expect(stockQtyError(0)).toBe('');
    expect(stockQtyError('')).toBe('');
    expect(stockQtyError(4)).toBe('');
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
        {
          id: '5',
          slug: 'teste-colecao2',
          name: 'TESTE-COLECAO2',
          description: null,
          sortOrder: 5,
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

  it('defaults a new product to Rascunho on our segmented control', () => {
    expect(fixture.componentInstance.currentStatus()).toBe('draft');
    expect(fixture.componentInstance.draft()?.status).toBe('draft');
    const group = fixture.nativeElement.querySelector('#atelier-product-status') as HTMLElement;
    expect(group).toBeTruthy();
    expect(group.querySelector('[role="radiogroup"]')).toBeTruthy();
    const on = group.querySelector('.is-on') as HTMLElement;
    expect(on?.textContent?.trim()).toBe('Rascunho');
    expect(PRODUCT_STATUS_OPTIONS.map((o) => o.value)).toEqual(['draft', 'published']);
    fixture.componentInstance.onStatusChange('published');
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStatus()).toBe('published');
    expect(fixture.nativeElement.querySelector('#atelier-product-status .is-on')?.textContent?.trim()).toBe(
      'Publicado',
    );
  });

  it('shows the collection name only and skips a native select', () => {
    expect(list).toHaveBeenCalledWith(false, { refresh: true });
    const trigger = fixture.nativeElement.querySelector('#atelier-product-collection') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent?.replace(/\s+/g, ' ').trim()).toBe('TESTE-COLECAO');
    expect(trigger.textContent).not.toContain('teste-colecao');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('preselects ?colecao=teste-colecao2 after the collections list loads', () => {
    fixture.componentRef.setInput(
      'product',
      sampleProduct({
        collectionSlug: 'teste-colecao2' as Product['collectionSlug'],
        collection: 'teste-colecao2' as Product['collection'],
      }),
    );
    fixture.componentRef.setInput('collectionFromContext', true);
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(list).toHaveBeenCalledWith(false, { refresh: true });
    expect(String(fixture.componentInstance.draft()?.collectionSlug)).toBe('teste-colecao2');
    expect(fixture.componentInstance.selectedCollectionLabel()).toBe('TESTE-COLECAO2');
    const trigger = fixture.nativeElement.querySelector('#atelier-product-collection') as HTMLElement;
    expect(trigger.textContent?.replace(/\s+/g, ' ').trim()).toBe('TESTE-COLECAO2');
    expect(trigger.textContent).not.toContain('Selecione a coleção');
    expect(trigger.textContent).not.toContain('teste-colecao2');
  });

  it('keeps a negative stock, validates with the API copy, and still sends it', () => {
    const input = fixture.nativeElement.querySelector('#atelier-product-stock') as HTMLInputElement;
    expect(input.min).toBe('0');

    fixture.componentInstance.onStockQtyChange(-2);
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.stockQty).toBe(-2);
    expect(fixture.nativeElement.querySelector('#atelier-product-stock-error')?.textContent?.trim()).toBe(
      STOCK_NEGATIVE_MESSAGE,
    );

    saveProduct$.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'Estoque não pode ser negativo.' },
          }),
      ),
    );
    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(saveProduct$).toHaveBeenCalled();
    expect(saveProduct$.calls.mostRecent().args[0].stockQty).toBe(-2);
    const saveAlert = fixture.nativeElement.querySelector('#atelier-product-save-error') as HTMLElement;
    expect(saveAlert?.textContent?.trim()).toBe(STOCK_NEGATIVE_MESSAGE);
    expect(fixture.componentInstance.saveError()).toBe(STOCK_NEGATIVE_MESSAGE);
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

describe('AdminProductForm collection picker while catalog loads', () => {
  it('shows Carregando… for ?colecao= and never the raw slug, then the name', async () => {
    const pending = new Subject<
      { id: string; slug: string; name: string; description: null; sortOrder: number; publishedAt: null }[]
    >();
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
            saveProduct$: jasmine.createSpy('saveProduct$'),
          },
        },
        { provide: AdminCollectionsApiService, useValue: { list: () => pending.asObservable() } },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        {
          provide: ToastService,
          useValue: { error: () => undefined, success: () => undefined, info: () => undefined },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminProductForm);
    fixture.componentRef.setInput(
      'product',
      sampleProduct({
        collectionSlug: 'teste-colecao2' as Product['collectionSlug'],
        collection: 'teste-colecao2' as Product['collection'],
      }),
    );
    fixture.componentRef.setInput('isNew', true);
    fixture.componentRef.setInput('collectionFromContext', true);
    fixture.detectChanges();

    const trigger = () =>
      fixture.nativeElement.querySelector('#atelier-product-collection') as HTMLElement;
    expect(fixture.componentInstance.collectionPickerLoading()).toBeTrue();
    expect(trigger().textContent?.replace(/\s+/g, ' ').trim()).toBe(COLLECTION_PICKER_LOADING);
    expect(trigger().textContent).not.toContain('teste-colecao2');

    pending.next([
      {
        id: '5',
        slug: 'teste-colecao2',
        name: 'TESTE-COLECAO2',
        description: null,
        sortOrder: 5,
        publishedAt: null,
      },
    ]);
    pending.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.collectionPickerLoading()).toBeFalse();
    expect(fixture.componentInstance.selectedCollectionLabel()).toBe('TESTE-COLECAO2');
    expect(trigger().textContent?.replace(/\s+/g, ' ').trim()).toBe('TESTE-COLECAO2');
    expect(trigger().textContent).not.toContain('teste-colecao2');
    fixture.destroy();
  });
});
