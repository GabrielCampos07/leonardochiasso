import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { AdminCatalogService } from '../../../core/admin-catalog.service';
import { ToastService } from '../../../core/feedback/toast.service';
import { Product } from '../../../core/product.model';
import { PRODUCT_EDIT_MODAL_TITLE_ID, ProductEditModal, productEditModalTitle } from './product-edit-modal';

@Component({
  selector: 'lc-admin-product-form',
  standalone: true,
  template: '',
})
class StubAdminProductForm {
  readonly product = input.required<Product>();
  readonly isNew = input(false);
  readonly collectionFromContext = input(false);
  readonly showSiteLink = input(true);
  readonly saved = output<Product>();
  readonly cancelled = output<void>();
}

const piece: Product = {
  id: '1',
  slug: 'vestido-longo-radial',
  name: 'Vestido Longo Radial',
  price: 0,
  priceLabel: 'R$ 0,00',
  color: 'Off-white',
  size: 'ÚNICO',
  fabric: '',
  season: '',
  description: '',
  details: [],
  shipping: '',
  thumb: '',
  gallery: [],
  category: 'feminino',
  collection: 'Organic Dreams',
  collectionSlug: 'organic-dreams',
};

describe('productEditModalTitle', () => {
  it('is Editar produto · {nome da peça}', () => {
    expect(productEditModalTitle('Vestido Longo Radial')).toBe('Editar produto · Vestido Longo Radial');
  });

  it('falls back when the name is empty', () => {
    expect(productEditModalTitle('')).toBe('Editar produto');
    expect(productEditModalTitle(null)).toBe('Editar produto');
  });

  it('uses Adicionar produto for the create flow', () => {
    expect(productEditModalTitle('Vestido', true)).toBe('Adicionar produto');
  });
});

describe('ProductEditModal', () => {
  let fixture: ComponentFixture<ProductEditModal>;
  let close: jasmine.Spy;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [ProductEditModal],
      providers: [
        { provide: DIALOG_DATA, useValue: { slug: piece.slug, product: piece } },
        { provide: DialogRef, useValue: { close } },
        { provide: AdminCatalogService, useValue: { get$: () => of(piece) } },
        { provide: ToastService, useValue: { error: () => undefined } },
      ],
    })
      .overrideComponent(ProductEditModal, { set: { imports: [StubAdminProductForm] } })
      .compileComponents();

    fixture = TestBed.createComponent(ProductEditModal);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the title with the piece name', () => {
    const heading = fixture.nativeElement.querySelector(`#${PRODUCT_EDIT_MODAL_TITLE_ID}`) as HTMLElement;
    expect(heading.textContent?.trim()).toBe('Editar produto · Vestido Longo Radial');
  });

  it('does not nest a second role=dialog or aria-modal on the form wrapper', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[role="dialog"]').length).toBe(0);
    expect(root.querySelectorAll('[aria-modal]').length).toBe(0);
    expect(root.querySelector(`#${PRODUCT_EDIT_MODAL_TITLE_ID}`)).toBeTruthy();
  });

  it('closes on Escape even when the canvas would have kept focus', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
