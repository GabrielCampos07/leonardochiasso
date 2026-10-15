import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER } from 'rxjs';
import { AdminCatalogService } from '../../core/admin-catalog.service';
import { AdminSessionService } from '../../core/admin-session.service';
import { CatalogService } from '../../core/catalog.service';
import { ChromeService } from '../../core/chrome.service';
import { ContentAdminService } from '../../core/content-admin.service';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { WishlistService } from '../../core/wishlist.service';
import { PdpPage } from './pdp';

describe('PdpPage missing product', () => {
  let fixture: ComponentFixture<PdpPage>;
  let getProductBySlug: jasmine.Spy;

  beforeEach(async () => {
    getProductBySlug = jasmine.createSpy('getProductBySlug').and.returnValue(NEVER);
    await TestBed.configureTestingModule({
      imports: [PdpPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'nao-existe' }) } },
        },
        {
          provide: CatalogService,
          useValue: {
            products: signal([]),
            loaded: signal(true),
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

    fixture = TestBed.createComponent(PdpPage);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows Produto não encontrado right away instead of the skeleton', () => {
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.componentInstance.product()).toBeNull();
    expect(fixture.nativeElement.querySelector('.pdp--skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Produto não encontrado');
    expect(getProductBySlug).toHaveBeenCalledWith('nao-existe');
  });
});
