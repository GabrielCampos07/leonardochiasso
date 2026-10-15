import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminCollectionsApiService } from '../../core/admin-collections-api.service';
import { CatalogService } from '../../core/catalog.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { PRODUCT_STATUS_OPTIONS, Product, SITE_UNAVAILABLE_HINT } from '../../core/product.model';
import { ADMIN_SWATCH_OPTIONS } from '../../core/admin-catalog.service';
import {
  PRICE_AMBIGUOUS_MESSAGE,
  PRICE_DECIMALS_MESSAGE,
  PRICE_INVALID_MESSAGE,
  PRICE_MAX_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
} from '../../core/price-input';
import {
  AdminProductForm,
  COLLECTION_PICKER_LOADING,
  COLLECTION_REQUIRED_MESSAGE,
  NAME_MAX_LENGTH,
  NAME_REQUIRED_MESSAGE,
  STOCK_NEGATIVE_MESSAGE,
  applySelectedSwatches,
  collectionSelectLabel,
  colorLabelFromSwatches,
  parseStockQty,
  selectedSwatchesFromProduct,
  splitLegacyColorLabel,
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

describe('selectedSwatchesFromProduct', () => {
  const blackWhite = { id: 'black-white', name: 'Black/White', hex: '#111111' };
  const known = [...ADMIN_SWATCH_OPTIONS, blackWhite];

  it('splits only on a slash with spaces', () => {
    expect(splitLegacyColorLabel('Off-white / Black')).toEqual(['Off-white', 'Black']);
    expect(splitLegacyColorLabel('Black/White')).toEqual(['Black/White']);
    const colors = selectedSwatchesFromProduct({ color: 'Off-white / Black' }, known);
    expect(colors.map((c) => c.id)).toEqual(['off-white', 'black']);
    expect(colorLabelFromSwatches(colors)).toBe('Off-white / Black');
  });

  it('keeps a slash without spaces as one color when it is on the known list', () => {
    const colors = selectedSwatchesFromProduct({ color: 'Black/White' }, known);
    expect(colors.map((c) => c.id)).toEqual(['black-white']);
    expect(colors.map((c) => c.name)).toEqual(['Black/White']);
  });

  it('keeps a slash without spaces as one free-text chip when it is not on the known list', () => {
    const colors = selectedSwatchesFromProduct({ color: 'Black/White' }, ADMIN_SWATCH_OPTIONS);
    expect(colors.map((c) => c.name)).toEqual(['Black/White']);
    expect(colors[0]?.id.startsWith('custom:')).toBeTrue();
  });

  it('keeps a free-text color like Cru natural as a chip', () => {
    const colors = selectedSwatchesFromProduct({ color: 'Cru natural' }, ADMIN_SWATCH_OPTIONS);
    expect(colors.map((c) => c.name)).toEqual(['Cru natural']);
    expect(colorLabelFromSwatches(colors)).toBe('Cru natural');
  });

  it('prefers the known-colors list over leftover free text', () => {
    const colors = selectedSwatchesFromProduct(
      { color: 'Creme e ouro', colors: [ADMIN_SWATCH_OPTIONS.find((s) => s.id === 'sand')!] },
      ADMIN_SWATCH_OPTIONS,
    );
    expect(colors.map((c) => c.id)).toEqual(['sand']);
    expect(applySelectedSwatches(sampleProduct({ color: 'Creme' }), colors).color).toBe('Sand');
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
  let updateViaApi: jasmine.Spy;
  let createViaApi: jasmine.Spy;
  let list: jasmine.Spy;
  let confirm: { confirm: jasmine.Spy };

  beforeEach(async () => {
    toast = {
      error: jasmine.createSpy('error'),
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
    };
    confirm = { confirm: jasmine.createSpy('confirm').and.resolveTo(true) };
    saveProduct$ = jasmine.createSpy('saveProduct$');
    updateViaApi = jasmine.createSpy('updateViaApi');
    createViaApi = jasmine.createSpy('createViaApi');
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
            updateViaApi,
            createViaApi,
          },
        },
        { provide: AdminCollectionsApiService, useValue: { list } },
        { provide: CatalogService, useValue: { refreshLocalCatalog: () => undefined } },
        { provide: ConfirmService, useValue: confirm },
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

  it('maps legacy color text to chips on open and does not PUT on cancel', () => {
    fixture.componentRef.setInput('isNew', false);
    fixture.componentRef.setInput(
      'product',
      sampleProduct({ color: 'Off-white / Black', colors: undefined }),
    );
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()?.colors?.map((c) => c.id)).toEqual([
      'off-white',
      'black',
    ]);
    expect(fixture.componentInstance.draft()?.color).toBe('Off-white / Black');
    expect(fixture.nativeElement.querySelector('[aria-label="Remover Off-white"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Remover Black"]')).toBeTruthy();
    expect(saveProduct$).not.toHaveBeenCalled();
    expect(updateViaApi).not.toHaveBeenCalled();
    expect(createViaApi).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.admin-edit__cancel')?.click();
    fixture.detectChanges();
    expect(saveProduct$).not.toHaveBeenCalled();
    expect(updateViaApi).not.toHaveBeenCalled();
    expect(createViaApi).not.toHaveBeenCalled();

    saveProduct$.and.returnValue(of(sampleProduct({ color: 'Off-white / Black' })));
    fixture.componentInstance.save();
    expect(saveProduct$).toHaveBeenCalledTimes(1);
    expect(saveProduct$.calls.mostRecent().args[0].color).toBe('Off-white / Black');
    expect(saveProduct$.calls.mostRecent().args[0].colors?.map((c: { id: string }) => c.id)).toEqual([
      'off-white',
      'black',
    ]);
  });

  it('picks colors as chips, never mixed with the old text field', () => {
    expect(fixture.nativeElement.querySelector('#atelier-product-color-text')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="color"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();

    fixture.componentInstance.addSwatchById('off-white');
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.color).toBe('Off-white');
    expect(fixture.componentInstance.draft()?.colors?.map((c) => c.id)).toEqual(['off-white']);
    expect(fixture.nativeElement.textContent).toContain('Off-white');
    expect(fixture.nativeElement.querySelector('[aria-label="Remover Off-white"]')).toBeTruthy();

    fixture.componentInstance.addSwatchById('black');
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.color).toBe('Off-white / Black');
    expect(fixture.componentInstance.draft()?.colors?.map((c) => c.id)).toEqual(['off-white', 'black']);

    fixture.componentInstance.removeSwatch(
      fixture.componentInstance.selectedColors().find((c) => c.id === 'off-white')!,
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.color).toBe('Black');
    expect(fixture.nativeElement.querySelector('[aria-label="Remover Off-white"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Remover Black"]')).toBeTruthy();
  });

  it('shows an inline error next to an empty required name', () => {
    fixture.componentInstance.onNameChange('   ');
    fixture.componentInstance.onNameBlur();
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.name).toBe('');
    expect(fixture.componentInstance.nameError()).toBe(NAME_REQUIRED_MESSAGE);
    expect(fixture.nativeElement.querySelector('#atelier-product-name-error')?.textContent?.trim()).toBe(
      NAME_REQUIRED_MESSAGE,
    );

    saveProduct$.calls.reset();
    fixture.componentInstance.save();
    expect(saveProduct$).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('shows an inline collection error when saving without a collection', () => {
    fixture.componentInstance.onCollectionSlugChange('');
    fixture.detectChanges();
    saveProduct$.calls.reset();
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(saveProduct$).not.toHaveBeenCalled();
    expect(fixture.componentInstance.collectionError()).toBe(COLLECTION_REQUIRED_MESSAGE);
    expect(fixture.nativeElement.querySelector('#atelier-product-collection-error')?.textContent?.trim()).toBe(
      COLLECTION_REQUIRED_MESSAGE,
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

  it('loads priceCents 1480000 as 14.800,00 and saves the same cents with no edits', () => {
    const loaded = sampleProduct({
      price: 14800,
      priceCents: 1480000,
      priceLabel: 'R$ 14.800,00',
    });
    fixture.componentInstance.loadDraft(loaded);
    fixture.detectChanges();

    expect(fixture.componentInstance.priceText).toBe('14.800,00');
    const input = fixture.nativeElement.querySelector('#atelier-product-price') as HTMLInputElement;
    expect(input.value).toBe('14.800,00');

    saveProduct$.and.returnValue(of(loaded));
    fixture.componentInstance.save();
    expect(saveProduct$).toHaveBeenCalled();
    expect(saveProduct$.calls.mostRecent().args[0].priceCents).toBe(1480000);
  });

  it('parses pt-BR price text and shows inline errors', () => {
    const input = fixture.nativeElement.querySelector('#atelier-product-price') as HTMLInputElement;
    expect(input.type).toBe('text');

    fixture.componentInstance.onPriceChange('12,50');
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.price).toBe(12.5);
    expect(fixture.componentInstance.draft()?.priceCents).toBe(1250);
    expect(fixture.componentInstance.priceError()).toBe('');

    fixture.componentInstance.onPriceChange('1.250,50');
    expect(fixture.componentInstance.draft()?.price).toBe(1250.5);
    expect(fixture.componentInstance.draft()?.priceCents).toBe(125050);

    fixture.componentInstance.onPriceChange('12.50');
    expect(fixture.componentInstance.draft()?.price).toBe(12.5);

    saveProduct$.calls.reset();
    fixture.componentInstance.onPriceChange('');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_REQUIRED_MESSAGE);
    expect(fixture.nativeElement.querySelector('#atelier-product-price-error')?.textContent?.trim()).toBe(
      PRICE_REQUIRED_MESSAGE,
    );
    fixture.componentInstance.save();
    expect(saveProduct$).not.toHaveBeenCalled();

    fixture.componentInstance.onPriceChange('1,250');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_AMBIGUOUS_MESSAGE);
    expect(fixture.nativeElement.querySelector('#atelier-product-price-error')?.textContent?.trim()).toBe(
      PRICE_AMBIGUOUS_MESSAGE,
    );

    fixture.componentInstance.onPriceChange('12,999');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_AMBIGUOUS_MESSAGE);

    fixture.componentInstance.onPriceChange('12,5000');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_DECIMALS_MESSAGE);
    expect(fixture.nativeElement.querySelector('#atelier-product-price-error')?.textContent?.trim()).toBe(
      PRICE_DECIMALS_MESSAGE,
    );

    fixture.componentInstance.onPriceChange('10.000.000');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_MAX_MESSAGE);

    fixture.componentInstance.onPriceChange('1 2');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_INVALID_MESSAGE);

    fixture.componentInstance.onPriceChange('-0');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_NEGATIVE_MESSAGE);

    fixture.componentInstance.onPriceChange('abc');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_INVALID_MESSAGE);

    fixture.componentInstance.onPriceChange('-12,50');
    fixture.detectChanges();
    expect(fixture.componentInstance.priceError()).toBe(PRICE_NEGATIVE_MESSAGE);
    saveProduct$.calls.reset();
    fixture.componentInstance.save();
    expect(saveProduct$).not.toHaveBeenCalled();
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

  it('disables Ver no site on a draft with a tooltip', () => {
    fixture.componentRef.setInput('isNew', false);
    fixture.componentRef.setInput('product', sampleProduct({ status: 'draft' }));
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentStatus()).toBe('draft');
    expect(fixture.componentInstance.canOpenOnSite()).toBeFalse();
    const site = fixture.nativeElement.querySelector('.admin-edit__site') as HTMLButtonElement;
    expect(site.tagName).toBe('BUTTON');
    expect(site.disabled).toBeTrue();
    expect(site.getAttribute('title')).toBe(SITE_UNAVAILABLE_HINT);
    expect(site.textContent?.trim()).toBe('Ver no site');
  });

  it('shows Ver no site as a link on a published piece', () => {
    fixture.componentRef.setInput('isNew', false);
    fixture.componentRef.setInput('product', sampleProduct({ status: 'published' }));
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.componentInstance.canOpenOnSite()).toBeTrue();
    const site = fixture.nativeElement.querySelector('.admin-edit__site') as HTMLAnchorElement;
    expect(site.tagName).toBe('A');
    expect(site.getAttribute('href')).toContain('look-novo');
  });

  it('locks Status on Arquivado and disables Ver no site when archived', () => {
    fixture.componentRef.setInput('isNew', false);
    fixture.componentRef.setInput(
      'product',
      sampleProduct({ status: 'published', archivedAt: '2026-10-01T00:00:00.000Z' }),
    );
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.componentInstance.isArchived()).toBeTrue();
    expect(fixture.componentInstance.currentStatus()).toBe('archived');
    expect(fixture.componentInstance.draft()?.status).toBe('archived');
    const group = fixture.nativeElement.querySelector('#atelier-product-status') as HTMLElement;
    expect(group.querySelector('.is-on')?.textContent?.trim()).toBe('Arquivado');
    expect(group.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled')).toBe('true');
    expect((group.querySelector('.is-on') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentInstance.onStatusChange('published');
    fixture.detectChanges();
    expect(fixture.componentInstance.currentStatus()).toBe('archived');

    const site = fixture.nativeElement.querySelector('.admin-edit__site') as HTMLButtonElement;
    expect(site.tagName).toBe('BUTTON');
    expect(site.disabled).toBeTrue();
    expect(site.getAttribute('title')).toBe(SITE_UNAVAILABLE_HINT);
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

  it('caps the name at 200 characters and shows a counter', () => {
    const long = 'A'.repeat(220);
    fixture.componentInstance.onNameChange(long);
    fixture.detectChanges();
    expect(fixture.componentInstance.draft()?.name.length).toBe(NAME_MAX_LENGTH);
    expect(fixture.nativeElement.querySelector('#atelier-product-name-count')?.textContent?.trim()).toBe(
      `${NAME_MAX_LENGTH}/${NAME_MAX_LENGTH}`,
    );
    expect(
      (fixture.nativeElement.querySelector('#atelier-product-name') as HTMLInputElement).getAttribute('maxlength'),
    ).toBe(String(NAME_MAX_LENGTH));
  });

  it('asks before canceling when the form is dirty', async () => {
    confirm.confirm.and.resolveTo(false);
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentInstance.onNameChange('Look alterado');
    await fixture.componentInstance.cancel();
    expect(confirm.confirm).toHaveBeenCalled();
    expect(cancelled).not.toHaveBeenCalled();

    confirm.confirm.and.resolveTo(true);
    await fixture.componentInstance.cancel();
    expect(cancelled).toHaveBeenCalled();
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
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
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
