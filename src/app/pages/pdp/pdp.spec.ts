import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, NEVER, Subject } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminSessionService } from '../../core/admin-session.service';
import { CatalogService } from '../../core/catalog.service';
import { ChromeService } from '../../core/chrome.service';
import { ContentAdminService } from '../../core/content-admin.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { Product } from '../../core/product.model';
import { WishlistService } from '../../core/wishlist.service';
import { PdpPage } from './pdp';

function sample(slug: string, name = 'Look real'): Product {
  return {
    id: slug,
    slug,
    name,
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
  };
}

async function mountPdp(opts: {
  slug: string;
  products: Product[];
  loaded: boolean;
  usingFallback: boolean;
  get$: Observable<Product | undefined> | Subject<Product | undefined>;
}): Promise<{ fixture: ComponentFixture<PdpPage>; getProductBySlug: jasmine.Spy }> {
  const getProductBySlug = jasmine.createSpy('getProductBySlug').and.returnValue(
    opts.get$ === NEVER ? NEVER : opts.get$,
  );
  await TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [PdpPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ slug: opts.slug }) } },
      },
      {
        provide: CatalogService,
        useValue: {
          products: signal(opts.products),
          loaded: signal(opts.loaded),
          usingFallback: signal(opts.usingFallback),
          getProductBySlug,
        },
      },
      { provide: ChromeService, useValue: { setActive: () => undefined } },
      { provide: ContentAdminService, useValue: {} },
      { provide: AdminCatalogService, useValue: { mediaOf: () => [] } },
      { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
      { provide: ToastService, useValue: { error: () => undefined, success: () => undefined } },
      { provide: AdminSessionService, useValue: { editMode: () => false, isLoggedIn: () => false } },
      { provide: WishlistService, useValue: { has: () => false, toggle: () => undefined } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PdpPage);
  fixture.detectChanges();
  return { fixture, getProductBySlug };
}

describe('PdpPage catalog load', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps the skeleton for a real product while the GET is in flight', async () => {
    const { fixture, getProductBySlug } = await mountPdp({
      slug: 'look-api',
      products: [],
      loaded: false,
      usingFallback: true,
      get$: NEVER,
    });
    expect(getProductBySlug).toHaveBeenCalledWith('look-api');
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.pdp--skeleton')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Produto não encontrado');
    fixture.destroy();
  });

  it('shows Produto não encontrado only after the GET returns empty', async () => {
    const get$ = new Subject<Product | undefined>();
    const { fixture } = await mountPdp({
      slug: 'nao-existe',
      products: [],
      loaded: false,
      usingFallback: true,
      get$,
    });
    expect(fixture.nativeElement.querySelector('.pdp--skeleton')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Produto não encontrado');

    get$.next(undefined);
    get$.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.pdp--skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Produto não encontrado');
    fixture.destroy();
  });

  it('still GETs a fallback product instead of painting the stale snapshot', async () => {
    const stale = sample('look-stale', 'Preço velho');
    const { fixture, getProductBySlug } = await mountPdp({
      slug: 'look-stale',
      products: [stale],
      loaded: true,
      usingFallback: true,
      get$: NEVER,
    });
    expect(getProductBySlug).toHaveBeenCalledWith('look-stale');
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.componentInstance.product()).toBeNull();
    expect(fixture.nativeElement.querySelector('.pdp--skeleton')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Preço velho');
    expect(fixture.nativeElement.textContent).not.toContain('Produto não encontrado');
    fixture.destroy();
  });

  it('skips the skeleton when the API catalog is already loaded without that slug', async () => {
    const { fixture, getProductBySlug } = await mountPdp({
      slug: 'nao-existe',
      products: [sample('outra')],
      loaded: true,
      usingFallback: false,
      get$: NEVER,
    });
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.pdp--skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Produto não encontrado');
    expect(getProductBySlug).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
